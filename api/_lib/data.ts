import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';
import { linkAiGenerationToContent } from './aiUsage.js';
import type { AppSubscriptionStatus, MercadoPagoPreapproval } from './mercadoPago.js';
import {
  getMercadoPagoAmount,
  getMercadoPagoCheckoutUrl,
  getMercadoPagoCurrency,
  getMercadoPagoNextPaymentDate,
  getMercadoPagoPayerId,
  getSubscriptionUserIdFromReference,
  mapMercadoPagoStatus,
} from './mercadoPago.js';
import type { SessionUser } from './session.js';

type StudySetIcon = 'language' | 'biology' | 'history' | 'math' | 'general';
type Mastery = 0 | 1 | 2 | 3;

const validIcons = new Set(['language', 'biology', 'history', 'math', 'general']);

function toIcon(value: unknown): StudySetIcon {
  if (typeof value === 'string' && validIcons.has(value)) return value as StudySetIcon;
  return 'general';
}

function toMastery(status?: string | null): Mastery {
  if (status === 'mastered') return 3;
  if (status === 'almost') return 2;
  if (status === 'learning') return 1;
  return 0;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRecordId(value: unknown) {
  const normalized = normalizeText(value);
  if (!/^[a-zA-Z0-9_-]{3,120}$/.test(normalized)) return '';
  return normalized;
}

function mapProfile(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    email: String(row.email ?? ''),
    onboarding_completed: Boolean(row.onboarding_completed),
    onboarding_completed_at: typeof row.onboarding_completed_at === 'string' ? row.onboarding_completed_at : row.onboarding_completed_at ? new Date(String(row.onboarding_completed_at)).toISOString() : null,
    starter_content_created: Boolean(row.starter_content_created),
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapSubscription(row: Record<string, unknown>) {
  const rawStatus = String(row.status);
  const nextPaymentAt = row.next_payment_at ? new Date(String(row.next_payment_at)) : null;
  const shouldStayActive = Boolean(row.cancelled_at && nextPaymentAt && nextPaymentAt > new Date());
  const paidPeriodEnded = Boolean(row.cancelled_at && nextPaymentAt && nextPaymentAt <= new Date());
  const status = paidPeriodEnded ? 'cancelled' : rawStatus === 'cancelled' && shouldStayActive ? 'active' : rawStatus;

  return {
    id: String(row.id),
    userId: String(row.user_id),
    mercadoPagoPreapprovalId: typeof row.mercado_pago_preapproval_id === 'string' ? row.mercado_pago_preapproval_id : null,
    mercadoPagoPayerId: typeof row.mercado_pago_payer_id === 'string' ? row.mercado_pago_payer_id : null,
    status,
    planName: String(row.plan_name ?? 'StudyFlow Premium'),
    amount: Number(row.amount ?? 11.9),
    currency: String(row.currency ?? 'BRL'),
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
    nextPaymentAt: row.next_payment_at ? new Date(String(row.next_payment_at)).toISOString() : null,
    cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function addOneMonthIso() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function getFallbackNextPaymentAt(status: AppSubscriptionStatus, value: string | null) {
  if (value) return value;
  if (status === 'active') return addOneMonthIso();
  return null;
}

function getCancellationDate(status: AppSubscriptionStatus) {
  if (status === 'cancelled' || status === 'rejected') return new Date().toISOString();
  return null;
}

function mapPreapprovalToSubscriptionInput(preapproval: MercadoPagoPreapproval) {
  const status = mapMercadoPagoStatus(preapproval.status);

  return {
    preapprovalId: preapproval.id,
    payerId: getMercadoPagoPayerId(preapproval),
    checkoutUrl: getMercadoPagoCheckoutUrl(preapproval),
    status,
    amount: getMercadoPagoAmount(preapproval),
    currency: getMercadoPagoCurrency(preapproval),
    startedAt: status === 'active' ? (preapproval.date_created ?? new Date().toISOString()) : null,
    nextPaymentAt: getFallbackNextPaymentAt(status, getMercadoPagoNextPaymentDate(preapproval)),
    cancelledAt: getCancellationDate(status),
  };
}

export async function getProfile(user: SessionUser) {
  await ensureSchema();
  const { rows } = await sql`select * from profiles where id = ${user.id} limit 1`;
  if (rows[0]) return mapProfile(rows[0]);

  const inserted = await sql`
    insert into profiles (id, full_name, avatar_url, email)
    values (${user.id}, ${user.fullName}, ${user.avatarUrl}, ${user.email})
    returning *
  `;
  return mapProfile(inserted.rows[0]);
}

export async function completeProfileOnboarding(user: SessionUser) {
  await ensureSchema();
  const { rows } = await sql`
    update profiles
    set onboarding_completed = true, onboarding_completed_at = now(), updated_at = now()
    where id = ${user.id}
    returning *
  `;
  return mapProfile(rows[0] ?? await getProfile(user));
}

export async function markStarterContentCreated(user: SessionUser) {
  await ensureSchema();
  await sql`update profiles set starter_content_created = true, updated_at = now() where id = ${user.id}`;
}

export async function getStudySets(user: SessionUser) {
  await ensureSchema();
  const [setsResult, cardsResult, progressResult] = await Promise.all([
    sql`select * from study_sets where user_id = ${user.id} order by updated_at desc`,
    sql`select * from flashcards where user_id = ${user.id} order by created_at asc`,
    sql`select * from study_progress where user_id = ${user.id}`,
  ]);

  const progressByCard = new Map(progressResult.rows.map((progress) => [String(progress.flashcard_id), String(progress.status)]));
  const cardsBySet = new Map<string, Array<Record<string, unknown>>>();

  for (const card of cardsResult.rows) {
    const studySetId = String(card.study_set_id);
    cardsBySet.set(studySetId, [...(cardsBySet.get(studySetId) ?? []), card]);
  }

  return setsResult.rows.map((studySet) => ({
    id: String(studySet.id),
    title: String(studySet.title),
    subject: String(studySet.subject),
    description: typeof studySet.description === 'string' ? studySet.description : undefined,
    color: String(studySet.color),
    icon: toIcon(studySet.icon),
    updatedAt: new Date(String(studySet.updated_at)).toISOString(),
    createdByAi: Boolean(studySet.created_by_ai),
    aiTopic: typeof studySet.ai_topic === 'string' ? studySet.ai_topic : undefined,
    cards: (cardsBySet.get(String(studySet.id)) ?? []).map((card) => ({
      id: String(card.id),
      term: String(card.term),
      definition: String(card.definition),
      mastery: toMastery(progressByCard.get(String(card.id))),
    })),
  }));
}

export async function createStudySetForUser(user: SessionUser, draft: Record<string, unknown>) {
  await ensureSchema();

  const title = normalizeText(draft.title);
  if (!title) throw new Error('Informe o nome do conjunto.');

  const cards = Array.isArray(draft.cards) ? draft.cards : [];
  for (const card of cards) {
    const record = card as Record<string, unknown>;
    if (!normalizeText(record.term) || !normalizeText(record.definition)) {
      throw new Error('Cada flashcard precisa ter termo e definição.');
    }
  }

  const studySetId = randomUUID();
  const now = new Date().toISOString();
  const subject = normalizeText(draft.subject) || 'Geral';
  const description = normalizeText(draft.description) || null;
  const color = normalizeText(draft.color) || '#6758e8';
  const icon = toIcon(draft.icon);
  const createdByAi = draft.createdByAi === true;
  const aiTopic = normalizeText(draft.aiTopic) || null;

  const createdSet = await sql`
    insert into study_sets (id, user_id, title, description, subject, color, icon, created_by_ai, ai_topic, created_at, updated_at)
    values (${studySetId}, ${user.id}, ${title}, ${description}, ${subject}, ${color}, ${icon}, ${createdByAi}, ${aiTopic}, ${now}, ${now})
    returning *
  `;

  for (const card of cards) {
    const record = card as Record<string, unknown>;
    const cardId = normalizeRecordId(record.id) || randomUUID();
    await sql`
      insert into flashcards (id, user_id, study_set_id, term, definition)
      values (${cardId}, ${user.id}, ${studySetId}, ${normalizeText(record.term)}, ${normalizeText(record.definition)})
    `;
  }

  await linkAiGenerationToContent(user, normalizeText(draft.aiGenerationId), studySetId);
  const studySets = await getStudySets(user);
  return studySets.find((studySet) => studySet.id === String(createdSet.rows[0].id));
}

export async function createStarterStudySets(user: SessionUser, starterStudySets: Array<Record<string, unknown>>) {
  await ensureSchema();
  const existing = await sql`select id from study_sets where user_id = ${user.id} limit 1`;
  if (existing.rowCount && existing.rowCount > 0) return false;

  for (const starterSet of starterStudySets) {
    await createStudySetForUser(user, starterSet);
  }

  await markStarterContentCreated(user);
  return true;
}

export async function deleteStudyData(user: SessionUser) {
  await ensureSchema();
  await sql`delete from study_sets where user_id = ${user.id}`;
}

export async function saveProgress(user: SessionUser, payload: Record<string, unknown>) {
  await ensureSchema();

  const studySetId = normalizeText(payload.studySetId);
  const flashcardId = normalizeText(payload.flashcardId);
  const mastery = Number(payload.mastery);
  if (!studySetId || !flashcardId || ![1, 2, 3].includes(mastery)) throw new Error('Dados de progresso inválidos.');

  const status = mastery === 3 ? 'mastered' : mastery === 2 ? 'almost' : 'learning';
  const existing = await sql`select * from study_progress where user_id = ${user.id} and flashcard_id = ${flashcardId} limit 1`;

  if (existing.rows[0]) {
    await sql`
      update study_progress
      set status = ${status},
          times_seen = times_seen + 1,
          times_correct = times_correct + ${mastery === 3 ? 1 : 0},
          times_wrong = times_wrong + ${mastery === 1 ? 1 : 0},
          last_reviewed_at = now(),
          updated_at = now()
      where id = ${String(existing.rows[0].id)} and user_id = ${user.id}
    `;
    return;
  }

  await sql`
    insert into study_progress (id, user_id, study_set_id, flashcard_id, status, times_seen, times_correct, times_wrong, last_reviewed_at)
    values (${randomUUID()}, ${user.id}, ${studySetId}, ${flashcardId}, ${status}, 1, ${mastery === 3 ? 1 : 0}, ${mastery === 1 ? 1 : 0}, now())
  `;
}

export async function saveQuiz(user: SessionUser, payload: Record<string, unknown>) {
  await ensureSchema();
  const studySetId = normalizeText(payload.studySetId);
  const score = Number(payload.score);
  const total = Number(payload.total);
  if (!studySetId || Number.isNaN(score) || Number.isNaN(total)) throw new Error('Resultado do teste inválido.');

  await sql`
    insert into quiz_results (id, user_id, study_set_id, score, total_questions, correct_answers, wrong_answers)
    values (${randomUUID()}, ${user.id}, ${studySetId}, ${score}, ${total}, ${score}, ${Math.max(total - score, 0)})
  `;
}

function mapMentalMap(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    studySetId: String(row.study_set_id),
    title: String(row.title),
    nodes: Array.isArray(row.nodes) ? row.nodes : [],
    edges: Array.isArray(row.edges) ? row.edges : [],
    mode: row.mode === 'complete' ? 'complete' : 'summary',
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    createdByAi: Boolean(row.created_by_ai),
    aiTopic: typeof row.ai_topic === 'string' ? row.ai_topic : undefined,
  };
}

export async function getMentalMaps(user: SessionUser) {
  await ensureSchema();
  const { rows } = await sql`select * from mental_maps where user_id = ${user.id} order by updated_at desc`;
  return rows.map(mapMentalMap);
}

export async function getMentalMap(user: SessionUser, id: string) {
  await ensureSchema();
  const { rows } = await sql`select * from mental_maps where id = ${id} and user_id = ${user.id} limit 1`;
  if (!rows[0]) throw new Error('Mapa mental não encontrado.');
  return mapMentalMap(rows[0]);
}

export async function createMentalMapForUser(user: SessionUser, payload: Record<string, unknown>) {
  await ensureSchema();
  const title = normalizeText(payload.title);
  const studySetId = normalizeText(payload.studySetId);
  if (!title || !studySetId) throw new Error('Dados do mapa mental inválidos.');

  const nodes = JSON.stringify(Array.isArray(payload.nodes) ? payload.nodes : []);
  const edges = JSON.stringify(Array.isArray(payload.edges) ? payload.edges : []);
  const mode = payload.mode === 'complete' ? 'complete' : 'summary';
  const createdByAi = payload.createdByAi === true;
  const aiTopic = normalizeText(payload.aiTopic) || null;
  const id = randomUUID();

  const { rows } = await sql`
    insert into mental_maps (id, user_id, study_set_id, title, nodes, edges, mode, created_by_ai, ai_topic)
    values (${id}, ${user.id}, ${studySetId}, ${title}, ${nodes}::jsonb, ${edges}::jsonb, ${mode}, ${createdByAi}, ${aiTopic})
    returning *
  `;

  await linkAiGenerationToContent(user, normalizeText(payload.aiGenerationId), id);
  return mapMentalMap(rows[0]);
}

export async function updateMentalMapForUser(user: SessionUser, id: string, payload: Record<string, unknown>) {
  await ensureSchema();
  const title = normalizeText(payload.title);
  if (!title) throw new Error('Informe o título do mapa mental.');

  const nodes = JSON.stringify(Array.isArray(payload.nodes) ? payload.nodes : []);
  const edges = JSON.stringify(Array.isArray(payload.edges) ? payload.edges : []);
  const mode = payload.mode === 'complete' ? 'complete' : 'summary';

  const { rows } = await sql`
    update mental_maps
    set title = ${title}, nodes = ${nodes}::jsonb, edges = ${edges}::jsonb, mode = ${mode}, updated_at = now()
    where id = ${id} and user_id = ${user.id}
    returning *
  `;
  if (!rows[0]) throw new Error('Mapa mental não encontrado.');
  return mapMentalMap(rows[0]);
}

export async function deleteMentalMapForUser(user: SessionUser, id: string) {
  await ensureSchema();
  await sql`delete from mental_maps where id = ${id} and user_id = ${user.id}`;
}

export async function getSubscription(user: SessionUser) {
  await ensureSchema();
  const { rows } = await sql`select * from subscriptions where user_id = ${user.id} limit 1`;
  return rows[0] ? mapSubscription(rows[0]) : null;
}

export async function saveMercadoPagoSubscriptionForUser(user: SessionUser, preapproval: MercadoPagoPreapproval) {
  await ensureSchema();
  const input = mapPreapprovalToSubscriptionInput(preapproval);
  const subscriptionId = randomUUID();

  const { rows } = await sql`
    insert into subscriptions (
      id,
      user_id,
      mercado_pago_preapproval_id,
      mercado_pago_payer_id,
      mercado_pago_checkout_url,
      status,
      plan_name,
      amount,
      currency,
      started_at,
      next_payment_at,
      cancelled_at,
      updated_at
    )
    values (
      ${subscriptionId},
      ${user.id},
      ${input.preapprovalId},
      ${input.payerId},
      ${input.checkoutUrl},
      ${input.status},
      'StudyFlow Premium',
      ${input.amount},
      ${input.currency},
      ${input.startedAt},
      ${input.nextPaymentAt},
      ${input.cancelledAt},
      now()
    )
    on conflict (user_id) do update set
      mercado_pago_preapproval_id = excluded.mercado_pago_preapproval_id,
      mercado_pago_payer_id = excluded.mercado_pago_payer_id,
      mercado_pago_checkout_url = excluded.mercado_pago_checkout_url,
      status = excluded.status,
      amount = excluded.amount,
      currency = excluded.currency,
      started_at = coalesce(subscriptions.started_at, excluded.started_at),
      next_payment_at = excluded.next_payment_at,
      cancelled_at = excluded.cancelled_at,
      updated_at = now()
    returning *
  `;

  return mapSubscription(rows[0]);
}

export async function updateSubscriptionFromMercadoPago(preapproval: MercadoPagoPreapproval) {
  await ensureSchema();
  const input = mapPreapprovalToSubscriptionInput(preapproval);
  const referencedUserId = getSubscriptionUserIdFromReference(preapproval.external_reference);

  if (referencedUserId) {
    const { rows } = await sql`
      insert into subscriptions (
        id,
        user_id,
        mercado_pago_preapproval_id,
        mercado_pago_payer_id,
        mercado_pago_checkout_url,
        status,
        plan_name,
        amount,
        currency,
        started_at,
        next_payment_at,
        cancelled_at,
        updated_at
      )
      values (
        ${randomUUID()},
        ${referencedUserId},
        ${input.preapprovalId},
        ${input.payerId},
        ${input.checkoutUrl},
        ${input.status},
        'StudyFlow Premium',
        ${input.amount},
        ${input.currency},
        ${input.startedAt},
        ${input.nextPaymentAt},
        ${input.cancelledAt},
        now()
      )
      on conflict (user_id) do update set
        mercado_pago_preapproval_id = excluded.mercado_pago_preapproval_id,
        mercado_pago_payer_id = excluded.mercado_pago_payer_id,
        mercado_pago_checkout_url = excluded.mercado_pago_checkout_url,
        status = excluded.status,
        amount = excluded.amount,
        currency = excluded.currency,
        started_at = coalesce(subscriptions.started_at, excluded.started_at),
        next_payment_at = excluded.next_payment_at,
        cancelled_at = case
          when excluded.status in ('cancelled', 'rejected') then coalesce(subscriptions.cancelled_at, excluded.cancelled_at)
          when excluded.status = 'active' then null
          else subscriptions.cancelled_at
        end,
        updated_at = now()
      returning *
    `;

    return rows[0] ? mapSubscription(rows[0]) : null;
  }

  const { rows } = await sql`
    update subscriptions
    set mercado_pago_payer_id = ${input.payerId},
        mercado_pago_checkout_url = ${input.checkoutUrl},
        status = ${input.status},
        amount = ${input.amount},
        currency = ${input.currency},
        started_at = coalesce(started_at, ${input.startedAt}),
        next_payment_at = ${input.nextPaymentAt},
        cancelled_at = case
          when ${input.status} in ('cancelled', 'rejected') then coalesce(cancelled_at, ${input.cancelledAt})
          when ${input.status} = 'active' then null
          else cancelled_at
        end,
        updated_at = now()
    where mercado_pago_preapproval_id = ${input.preapprovalId}
    returning *
  `;

  return rows[0] ? mapSubscription(rows[0]) : null;
}

export async function cancelUserSubscription(user: SessionUser) {
  await ensureSchema();
  const existing = await sql`select id from subscriptions where user_id = ${user.id} limit 1`;
  if (!existing.rows[0]) return;

  await sql`
    update subscriptions
    set status = case
          when coalesce(next_payment_at, now() + interval '1 month') > now() then 'active'
          else 'cancelled'
        end,
        next_payment_at = coalesce(next_payment_at, now() + interval '1 month'),
        cancelled_at = now(),
        updated_at = now()
    where user_id = ${user.id}
  `;
}
