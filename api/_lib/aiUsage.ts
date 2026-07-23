import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';
import type { AiContentType } from './aiSchemas.js';
import type { SessionUser } from './session.js';

const FREE_MONTHLY_LIMIT = 5;
const PREMIUM_MONTHLY_LIMIT = 100;
const RATE_LIMIT_PER_MINUTE = 5;
const LOCK_TTL_SECONDS = 90;

export interface AiUsageSnapshot {
  plan: 'free' | 'premium' | 'admin';
  limit: number | null;
  used: number;
  remaining: number | null;
}

export class AiUsageError extends Error {
  constructor(public code: 'limit_exceeded' | 'rate_limited' | 'already_running') {
    super(code);
  }
}

function getMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function isAdmin(user: SessionUser) {
  const adminEmails = (process.env.AI_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const adminIds = (process.env.AI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return adminEmails.includes(user.email.toLowerCase()) || adminIds.includes(user.id);
}

async function hasActiveSubscription(user: SessionUser) {
  const { rows } = await sql`
    select status, next_payment_at, cancelled_at
    from subscriptions
    where user_id = ${user.id}
    limit 1
  `;

  const row = rows[0];
  if (!row) return false;
  if (String(row.status) === 'active') return true;

  const nextPaymentAt = row.next_payment_at ? new Date(String(row.next_payment_at)) : null;
  return Boolean(row.cancelled_at && nextPaymentAt && nextPaymentAt > new Date());
}

async function countMonthlyUsage(user: SessionUser) {
  const monthStart = getMonthStart();
  const { rows } = await sql`
    select count(*)::int as total
    from ai_generations
    where user_id = ${user.id}
      and status = 'success'
      and created_at >= ${monthStart}
  `;
  return Number(rows[0]?.total ?? 0);
}

export async function getAiUsageSnapshot(user: SessionUser): Promise<AiUsageSnapshot> {
  await ensureSchema();

  const used = await countMonthlyUsage(user);
  if (isAdmin(user)) return { plan: 'admin', limit: null, used, remaining: null };

  const premium = await hasActiveSubscription(user);
  const limit = premium ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
  return {
    plan: premium ? 'premium' : 'free',
    limit,
    used,
    remaining: Math.max(limit - used, 0),
  };
}

export async function assertAiUsageAvailable(user: SessionUser) {
  const usage = await getAiUsageSnapshot(user);
  if (usage.limit !== null && usage.used >= usage.limit) {
    throw new AiUsageError('limit_exceeded');
  }
  return usage;
}

export async function registerAiRateEvent(user: SessionUser) {
  await ensureSchema();

  const { rows } = await sql`
    select count(*)::int as total
    from ai_rate_events
    where user_id = ${user.id}
      and created_at > now() - interval '1 minute'
  `;

  if (Number(rows[0]?.total ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    throw new AiUsageError('rate_limited');
  }

  await sql`
    insert into ai_rate_events (id, user_id)
    values (${randomUUID()}, ${user.id})
  `;
}

export async function acquireAiGenerationLock(user: SessionUser) {
  await ensureSchema();

  const { rowCount } = await sql`
    insert into ai_generation_locks (user_id, locked_at)
    values (${user.id}, now())
    on conflict (user_id) do update
    set locked_at = excluded.locked_at
    where ai_generation_locks.locked_at < now() - (${LOCK_TTL_SECONDS} || ' seconds')::interval
  `;

  if (!rowCount) throw new AiUsageError('already_running');
}

export async function releaseAiGenerationLock(user: SessionUser) {
  await ensureSchema();
  await sql`delete from ai_generation_locks where user_id = ${user.id}`;
}

export async function recordAiGeneration(input: {
  user: SessionUser;
  contentType: AiContentType;
  topic: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  status: 'success' | 'failed';
}) {
  await ensureSchema();
  const id = randomUUID();
  await sql`
    insert into ai_generations (
      id,
      user_id,
      content_type,
      topic,
      model,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      status
    )
    values (
      ${id},
      ${input.user.id},
      ${input.contentType},
      ${input.topic},
      ${input.model},
      ${input.promptTokens ?? 0},
      ${input.completionTokens ?? 0},
      ${input.totalTokens ?? 0},
      ${input.status}
    )
  `;
  return id;
}

export async function linkAiGenerationToContent(user: SessionUser, generationId: string, contentId: string) {
  await ensureSchema();
  if (!generationId || !contentId) return;

  await sql`
    update ai_generations
    set created_content_id = ${contentId}
    where id = ${generationId}
      and user_id = ${user.id}
      and status = 'success'
  `;
}

