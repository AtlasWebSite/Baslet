import { createHash, randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';

const PRIVATE_KEYS = new Set(['password', 'token', 'secret', 'cookie', 'authorization', 'access_token', 'refresh_token', 'cvv', 'card_number']);

function sanitizeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !PRIVATE_KEYS.has(key.toLocaleLowerCase()))
      .slice(0, 20)
      .map(([key, value]) => {
        if (value === null || typeof value === 'boolean' || typeof value === 'number') return [key, value];
        if (typeof value === 'string') return [key, value.slice(0, 300)];
        return [key, String(value).slice(0, 300)];
      }),
  );
}

export async function recordActivityEvent(input: {
  userId?: string | null;
  eventType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await ensureSchema();
  const metadata = JSON.stringify(sanitizeMetadata(input.metadata ?? {}));
  await sql`
    insert into activity_events (id, user_id, event_type, resource_type, resource_id, metadata)
    values (${randomUUID()}, ${input.userId ?? null}, ${input.eventType}, ${input.resourceType ?? null}, ${input.resourceId ?? null}, ${metadata}::jsonb)
  `;
}

export async function recordApplicationError(input: {
  category: string;
  message: string;
  page?: string | null;
  userId?: string | null;
  details?: Record<string, unknown>;
  browser?: string | null;
  device?: string | null;
}) {
  await ensureSchema();
  const safeMessage = input.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 500);
  const fingerprint = createHash('sha256').update(`${input.category}:${safeMessage}:${input.page ?? ''}`).digest('hex');
  const details = JSON.stringify(sanitizeMetadata(input.details ?? {}));

  await sql`
    insert into application_errors (id, fingerprint, category, message, page, user_id, browser, device, safe_details)
    values (${randomUUID()}, ${fingerprint}, ${input.category}, ${safeMessage}, ${input.page ?? null}, ${input.userId ?? null}, ${input.browser?.slice(0, 300) ?? null}, ${input.device?.slice(0, 100) ?? null}, ${details}::jsonb)
    on conflict (fingerprint) do update set
      occurrence_count = application_errors.occurrence_count + 1,
      last_occurred_at = now(),
      user_id = coalesce(excluded.user_id, application_errors.user_id),
      browser = coalesce(excluded.browser, application_errors.browser),
      device = coalesce(excluded.device, application_errors.device),
      safe_details = excluded.safe_details
  `;
}
