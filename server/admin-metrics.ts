import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';

export type AdminPeriodKey = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'month' | 'previous_month' | 'year' | 'custom';

export interface AdminPeriod {
  key: AdminPeriodKey;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
}

function iso(date: Date) {
  return date.toISOString();
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function resolveAdminPeriod(query: Record<string, string | string[] | undefined>): AdminPeriod {
  const raw = Array.isArray(query.period) ? query.period[0] : query.period;
  const key = (raw ?? '30d') as AdminPeriodKey;
  const now = new Date();
  const today = startOfUtcDay(now);
  let start = addDays(today, -29);
  let end = addDays(today, 1);

  if (key === 'today') start = today;
  if (key === 'yesterday') {
    start = addDays(today, -1);
    end = today;
  }
  if (key === '7d') start = addDays(today, -6);
  if (key === '90d') start = addDays(today, -89);
  if (key === 'month') start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  if (key === 'previous_month') {
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    start = addMonths(end, -1);
  }
  if (key === 'year') start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  if (key === 'custom') {
    const startValue = Array.isArray(query.start) ? query.start[0] : query.start;
    const endValue = Array.isArray(query.end) ? query.end[0] : query.end;
    const parsedStart = startValue ? new Date(`${startValue}T00:00:00.000Z`) : null;
    const parsedEnd = endValue ? new Date(`${endValue}T00:00:00.000Z`) : null;
    if (parsedStart && parsedEnd && !Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd) {
      start = parsedStart;
      end = addDays(parsedEnd, 1);
    }
  }

  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { key, start: iso(start), end: iso(end), previousStart: iso(previousStart), previousEnd: iso(previousEnd) };
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function metric(id: string, label: string, value: number | null, previous: number | null, format: 'number' | 'currency' | 'percent' = 'number', explanation = '') {
  return {
    id,
    label,
    value,
    previous,
    changePercent: value === null || previous === null ? null : percentChange(value, previous),
    format,
    explanation,
    status: value === null ? 'unavailable' : 'available',
  };
}

export async function getAdminOverview(period: AdminPeriod) {
  await ensureSchema();
  const [users, newUsers, previousNewUsers, activeUsers, previousActiveUsers, subscriptions, resources, series, fixedMetrics, activitySummary, retentionSummary] = await Promise.all([
    sql`select count(*)::int as total from profiles`,
    sql`select count(*)::int as total from profiles where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz`,
    sql`select count(*)::int as total from profiles where created_at >= ${period.previousStart}::timestamptz and created_at < ${period.previousEnd}::timestamptz`,
    sql`select count(distinct user_id)::int as total from activity_events where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz`,
    sql`select count(distinct user_id)::int as total from activity_events where created_at >= ${period.previousStart}::timestamptz and created_at < ${period.previousEnd}::timestamptz`,
    sql`
      select
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where status = 'cancelled')::int as cancelled,
        count(*) filter (where status = 'pending')::int as pending,
        count(*) filter (where status = 'rejected')::int as rejected,
        coalesce(sum(amount) filter (where status = 'active'), 0)::numeric as mrr
      from subscriptions
    `,
    sql`
      select
        (select count(*) from flashcards) ::int as flashcards,
        (select count(*) from mental_maps) ::int as mental_maps,
        (select count(*) from quiz_results) ::int as quizzes,
        (select coalesce(sum(times_seen), 0) from study_progress) ::int as reviews
    `,
    sql`
      select date_trunc('day', created_at)::date::text as date, count(*)::int as value
      from profiles
      where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz
      group by 1 order by 1
    `,
    sql`
      with bounds as (
        select (timezone('America/Sao_Paulo', now())::date at time zone 'America/Sao_Paulo') as day_start
      )
      select
        (select count(*) from profiles, bounds where created_at >= day_start and created_at < now())::int as new_today,
        (select count(*) from profiles, bounds where created_at >= day_start - interval '1 day' and created_at < now() - interval '1 day')::int as new_previous_today,
        (select count(*) from profiles where created_at >= now() - interval '7 days')::int as new_7d,
        (select count(*) from profiles where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::int as new_previous_7d,
        (select count(*) from profiles where created_at >= now() - interval '30 days')::int as new_30d,
        (select count(*) from profiles where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days')::int as new_previous_30d,
        (select count(distinct user_id) from activity_events, bounds where created_at >= day_start and created_at < now())::int as active_today,
        (select count(distinct user_id) from activity_events, bounds where created_at >= day_start - interval '1 day' and created_at < now() - interval '1 day')::int as active_previous_today,
        (select count(distinct user_id) from activity_events where created_at >= now() - interval '7 days')::int as active_7d,
        (select count(distinct user_id) from activity_events where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::int as active_previous_7d,
        (select count(distinct user_id) from activity_events where created_at >= now() - interval '30 days')::int as active_30d,
        (select count(distinct user_id) from activity_events where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days')::int as active_previous_30d
    `,
    sql`
      select
        count(*) filter (where event_type = 'session_started' and created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as sessions,
        count(*) filter (where event_type = 'session_started' and created_at >= ${period.previousStart}::timestamptz and created_at < ${period.previousEnd}::timestamptz)::int as previous_sessions
      from activity_events
    `,
    sql`
      select
        count(*)::int as cohort,
        count(*) filter (where exists (
          select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 7
        ))::int as retained_d7
      from profiles p
      where p.created_at >= ${period.start}::timestamptz and p.created_at < ${period.end}::timestamptz
    `,
  ]);

  const totalUsers = numberValue(users.rows[0]?.total);
  const currentNew = numberValue(newUsers.rows[0]?.total);
  const previousNew = numberValue(previousNewUsers.rows[0]?.total);
  const currentActive = numberValue(activeUsers.rows[0]?.total);
  const previousActive = numberValue(previousActiveUsers.rows[0]?.total);
  const activeSubscriptions = numberValue(subscriptions.rows[0]?.active);
  const cancelledSubscriptions = numberValue(subscriptions.rows[0]?.cancelled);
  const mrr = numberValue(subscriptions.rows[0]?.mrr);
  const freeUsers = Math.max(totalUsers - activeSubscriptions, 0);
  const conversion = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
  const fixed = fixedMetrics.rows[0] ?? {};
  const activity = activitySummary.rows[0] ?? {};
  const cohort = numberValue(retentionSummary.rows[0]?.cohort);
  const retentionD7 = cohort > 0 ? numberValue(retentionSummary.rows[0]?.retained_d7) / cohort * 100 : null;
  const sessions = numberValue(activity.sessions);
  const previousSessions = numberValue(activity.previous_sessions);
  const averageSessions = currentActive > 0 ? sessions / currentActive : 0;
  const previousAverageSessions = previousActive > 0 ? previousSessions / previousActive : 0;

  return {
    period,
    instrumentation: {
      activityAvailableSince: 'A partir da implantação desta versão',
      payments: false,
      paymentsReason: 'O projeto registra assinaturas do Mercado Pago, mas não possui tabela nem webhook de pagamentos individuais.',
    },
    metrics: [
      metric('total-users', 'Total de usuários', totalUsers, null, 'number', 'Quantidade total de perfis cadastrados.'),
      metric('new-users-today', 'Novos usuários hoje', numberValue(fixed.new_today), numberValue(fixed.new_previous_today), 'number', 'Cadastros desde 00:00 no fuso America/Sao_Paulo, comparados ao mesmo intervalo do dia anterior.'),
      metric('new-users-7d', 'Novos usuários em 7 dias', numberValue(fixed.new_7d), numberValue(fixed.new_previous_7d), 'number', 'Cadastros nos últimos 7 dias comparados aos 7 dias anteriores.'),
      metric('new-users-30d', 'Novos usuários em 30 dias', numberValue(fixed.new_30d), numberValue(fixed.new_previous_30d), 'number', 'Cadastros nos últimos 30 dias comparados aos 30 dias anteriores.'),
      metric('active-users-today', 'Usuários ativos hoje', numberValue(fixed.active_today), numberValue(fixed.active_previous_today), 'number', 'Usuários únicos com atividade desde 00:00 no fuso America/Sao_Paulo.'),
      metric('active-users-7d', 'Usuários ativos em 7 dias', numberValue(fixed.active_7d), numberValue(fixed.active_previous_7d), 'number', 'Usuários únicos com atividade nos últimos 7 dias.'),
      metric('active-users-30d', 'Usuários ativos em 30 dias', numberValue(fixed.active_30d), numberValue(fixed.active_previous_30d), 'number', 'Usuários únicos com atividade nos últimos 30 dias.'),
      metric('new-users', 'Novos usuários', currentNew, previousNew, 'number', 'Cadastros no período selecionado comparados ao período anterior equivalente.'),
      metric('active-users', 'Usuários ativos', currentActive, previousActive, 'number', 'Usuários com pelo menos um evento de atividade registrado no período.'),
      metric('inactive-users', 'Usuários sem atividade registrada', Math.max(totalUsers - currentActive, 0), null, 'number', 'Usuários sem evento de atividade no período. Eventos começam após esta implantação.'),
      metric('premium-users', 'Usuários Premium', activeSubscriptions, null, 'number', 'Assinaturas reais com status interno active.'),
      metric('free-users', 'Usuários gratuitos', freeUsers, null, 'number', 'Total de usuários menos assinaturas ativas.'),
      metric('active-subscriptions', 'Assinaturas ativas', activeSubscriptions, null, 'number', 'Assinaturas sincronizadas com status active.'),
      metric('cancelled-subscriptions', 'Assinaturas canceladas', cancelledSubscriptions, null, 'number', 'Assinaturas atualmente registradas como cancelled.'),
      metric('mrr', 'MRR contratado', mrr, null, 'currency', 'Soma mensal normalizada das assinaturas ativas; não representa receita liquidada.'),
      metric('conversion', 'Conversão atual para Premium', conversion, null, 'percent', 'Assinaturas ativas divididas pelo total de usuários.'),
      metric('average-sessions', 'Média de sessões por usuário ativo', averageSessions, previousAverageSessions, 'number', 'Sessões iniciadas divididas pelos usuários ativos no período selecionado.'),
      metric('retention-d7', 'Retenção D7', retentionD7, null, 'percent', 'Parcela da coorte do período que retornou exatamente sete dias após o cadastro. O histórico começa nesta implantação.'),
      metric('churn', 'Taxa de cancelamento', null, null, 'percent', 'Indisponível com precisão histórica: a tabela atual não registra o conjunto de assinaturas ativas no início de cada período.'),
      metric('approved-payments', 'Pagamentos aprovados', null, null, 'number', 'Indisponível: pagamentos individuais ainda não são registrados.'),
      metric('total-revenue', 'Receita total', null, null, 'currency', 'Indisponível: não há histórico de cobranças liquidadas.'),
    ],
    subscriptionStatus: {
      active: activeSubscriptions,
      cancelled: cancelledSubscriptions,
      pending: numberValue(subscriptions.rows[0]?.pending),
      rejected: numberValue(subscriptions.rows[0]?.rejected),
    },
    resources: {
      flashcards: numberValue(resources.rows[0]?.flashcards),
      mentalMaps: numberValue(resources.rows[0]?.mental_maps),
      quizzes: numberValue(resources.rows[0]?.quizzes),
      reviews: numberValue(resources.rows[0]?.reviews),
    },
    userGrowth: series.rows.map((row) => ({ date: String(row.date), value: numberValue(row.value) })),
  };
}

function stringQuery(query: Record<string, string | string[] | undefined>, key: string, fallback = '') {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value ?? fallback).trim();
}

function intQuery(query: Record<string, string | string[] | undefined>, key: string, fallback: number, min: number, max: number) {
  const parsed = Number(stringQuery(query, key, String(fallback)));
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export async function getAdminUsers(query: Record<string, string | string[] | undefined>) {
  await ensureSchema();
  const search = stringQuery(query, 'search').slice(0, 120);
  const filter = stringQuery(query, 'filter', 'all');
  const sort = stringQuery(query, 'sort', 'created');
  const direction = stringQuery(query, 'direction', 'desc');
  const page = intQuery(query, 'page', 1, 1, 100000);
  const pageSize = intQuery(query, 'pageSize', 25, 10, 100);
  const offset = (page - 1) * pageSize;
  const setting = await sql`select value from admin_settings where key = 'inactivity_days' limit 1`;
  const inactivityDays = Math.min(Math.max(numberValue(setting.rows[0]?.value) || 30, 1), 365);
  const inactivityCutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const count = await sql`
    select count(*)::int as total
    from profiles p
    left join subscriptions s on s.user_id = p.id
    where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or p.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
      and (
        ${filter} = 'all'
        or (${filter} = 'premium' and s.status = 'active')
        or (${filter} = 'free' and coalesce(s.status, 'inactive') <> 'active')
        or (${filter} = 'active' and p.last_login_at >= ${inactivityCutoff}::timestamptz)
        or (${filter} = 'inactive' and (p.last_login_at is null or p.last_login_at < ${inactivityCutoff}::timestamptz))
        or (${filter} = 'inactive_7d' and (p.last_login_at is null or p.last_login_at < ${sevenDaysAgo}::timestamptz))
        or (${filter} = 'inactive_14d' and (p.last_login_at is null or p.last_login_at < ${fourteenDaysAgo}::timestamptz))
        or (${filter} = 'never_accessed' and p.last_login_at is null)
        or (${filter} = 'new' and p.created_at >= now() - interval '7 days')
        or (${filter} = 'cancelled' and s.status = 'cancelled')
        or (${filter} = 'rejected' and s.status = 'rejected')
        or (${filter} = 'high_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') >= 10)
        or (${filter} = 'low_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') <= 2)
      )
  `;

  const result = await sql`
    select
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.account_status,
      p.created_at,
      p.last_login_at,
      coalesce(s.status, 'inactive') as subscription_status,
      coalesce(s.plan_name, 'Gratuito') as plan_name,
      coalesce(s.amount, 0) as subscription_amount,
      (select count(*) from study_sets ss where ss.user_id = p.id)::int as study_sets_count,
      (select count(*) from flashcards f where f.user_id = p.id)::int as flashcards_count,
      (select count(*) from mental_maps mm where mm.user_id = p.id)::int as mental_maps_count,
      (select count(*) from quiz_results qr where qr.user_id = p.id)::int as quizzes_count,
      (select coalesce(sum(sp.times_seen), 0) from study_progress sp where sp.user_id = p.id)::int as reviews_count,
      (select count(*) from activity_events ae where ae.user_id = p.id and ae.event_type = 'session_started')::int as sessions_count,
      (select coalesce(avg(case sp.status when 'mastered' then 100 when 'almost' then 66.67 when 'learning' then 33.33 else 0 end), 0) from study_progress sp where sp.user_id = p.id)::numeric as progress_percentage
    from profiles p
    left join subscriptions s on s.user_id = p.id
    where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or p.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
      and (
        ${filter} = 'all'
        or (${filter} = 'premium' and s.status = 'active')
        or (${filter} = 'free' and coalesce(s.status, 'inactive') <> 'active')
        or (${filter} = 'active' and p.last_login_at >= ${inactivityCutoff}::timestamptz)
        or (${filter} = 'inactive' and (p.last_login_at is null or p.last_login_at < ${inactivityCutoff}::timestamptz))
        or (${filter} = 'inactive_7d' and (p.last_login_at is null or p.last_login_at < ${sevenDaysAgo}::timestamptz))
        or (${filter} = 'inactive_14d' and (p.last_login_at is null or p.last_login_at < ${fourteenDaysAgo}::timestamptz))
        or (${filter} = 'never_accessed' and p.last_login_at is null)
        or (${filter} = 'new' and p.created_at >= now() - interval '7 days')
        or (${filter} = 'cancelled' and s.status = 'cancelled')
        or (${filter} = 'rejected' and s.status = 'rejected')
        or (${filter} = 'high_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') >= 10)
        or (${filter} = 'low_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') <= 2)
      )
    order by
      case when ${sort} = 'name' and ${direction} = 'asc' then lower(p.full_name) end asc,
      case when ${sort} = 'name' and ${direction} = 'desc' then lower(p.full_name) end desc,
      case when ${sort} = 'last_login' and ${direction} = 'asc' then p.last_login_at end asc nulls last,
      case when ${sort} = 'last_login' and ${direction} = 'desc' then p.last_login_at end desc nulls last,
      case when ${sort} = 'created' and ${direction} = 'asc' then p.created_at end asc,
      p.created_at desc
    limit ${pageSize} offset ${offset}
  `;

  return {
    page,
    pageSize,
    total: numberValue(count.rows[0]?.total),
    users: result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.full_name),
      email: String(row.email),
      avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      accountStatus: String(row.account_status),
      createdAt: new Date(String(row.created_at)).toISOString(),
      lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)).toISOString() : null,
      plan: row.subscription_status === 'active' ? String(row.plan_name) : 'Gratuito',
      subscriptionStatus: String(row.subscription_status),
      studySets: numberValue(row.study_sets_count),
      flashcards: numberValue(row.flashcards_count),
      mentalMaps: numberValue(row.mental_maps_count),
      quizzes: numberValue(row.quizzes_count),
      reviews: numberValue(row.reviews_count),
      sessions: numberValue(row.sessions_count),
      progressPercentage: numberValue(row.progress_percentage),
    })),
  };
}

export async function getAdminUser(userId: string) {
  await ensureSchema();
  const [profile, activity, payments] = await Promise.all([
    sql`
      select p.*, s.id as subscription_id, s.status as subscription_status, s.plan_name, s.amount,
        s.currency, s.mercado_pago_preapproval_id, s.started_at, s.next_payment_at, s.cancelled_at,
        (select count(*) from study_sets where user_id = p.id)::int as study_sets_count,
        (select count(*) from flashcards where user_id = p.id)::int as flashcards_count,
        (select count(*) from mental_maps where user_id = p.id)::int as mental_maps_count,
        (select count(*) from quiz_results where user_id = p.id)::int as quizzes_count,
        (select coalesce(avg(case when total_questions > 0 then correct_answers::numeric / total_questions * 100 end), 0) from quiz_results where user_id = p.id)::numeric as quiz_accuracy,
        (select coalesce(sum(times_seen), 0) from study_progress where user_id = p.id)::int as reviews_count,
        (select count(*) from activity_events where user_id = p.id and event_type = 'session_started')::int as sessions_count,
        (select count(distinct created_at::date) from activity_events where user_id = p.id)::int as active_days,
        (select coalesce(avg(case status when 'mastered' then 100 when 'almost' then 66.67 when 'learning' then 33.33 else 0 end), 0) from study_progress where user_id = p.id)::numeric as progress_percentage
      from profiles p left join subscriptions s on s.user_id = p.id
      where p.id = ${userId} limit 1
    `,
    sql`select event_type, resource_type, resource_id, metadata, created_at from activity_events where user_id = ${userId} order by created_at desc limit 100`,
    sql`select id from subscriptions where user_id = ${userId} limit 1`,
  ]);
  const row = profile.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.full_name),
    email: String(row.email),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)).toISOString() : null,
    accountStatus: String(row.account_status),
    stats: {
      studySets: numberValue(row.study_sets_count),
      flashcards: numberValue(row.flashcards_count),
      reviews: numberValue(row.reviews_count),
      mentalMaps: numberValue(row.mental_maps_count),
      quizzes: numberValue(row.quizzes_count),
      quizAccuracy: numberValue(row.quiz_accuracy),
      sessions: numberValue(row.sessions_count),
      activeDays: numberValue(row.active_days),
      progressPercentage: numberValue(row.progress_percentage),
    },
    subscription: payments.rows[0] ? {
      id: String(row.subscription_id),
      status: String(row.subscription_status),
      planName: String(row.plan_name),
      amount: numberValue(row.amount),
      currency: String(row.currency),
      externalId: row.mercado_pago_preapproval_id ? String(row.mercado_pago_preapproval_id) : null,
      startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
      nextPaymentAt: row.next_payment_at ? new Date(String(row.next_payment_at)).toISOString() : null,
      cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : null,
    } : null,
    payments: { available: false, reason: 'O projeto não registra pagamentos individuais.' },
    activity: activity.rows.map((item) => ({
      type: String(item.event_type),
      resourceType: item.resource_type ? String(item.resource_type) : null,
      resourceId: item.resource_id ? String(item.resource_id) : null,
      metadata: item.metadata,
      createdAt: new Date(String(item.created_at)).toISOString(),
    })),
  };
}

export async function getAdminSubscriptions(query: Record<string, string | string[] | undefined>) {
  await ensureSchema();
  const page = intQuery(query, 'page', 1, 1, 100000);
  const pageSize = intQuery(query, 'pageSize', 25, 10, 100);
  const search = stringQuery(query, 'search').slice(0, 120);
  const status = stringQuery(query, 'status', 'all');
  const offset = (page - 1) * pageSize;
  const count = await sql`
    select count(*)::int as total from subscriptions s join profiles p on p.id = s.user_id
    where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or s.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
      and (${status} = 'all' or s.status = ${status})
  `;
  const result = await sql`
    select s.*, p.full_name, p.email from subscriptions s join profiles p on p.id = s.user_id
    where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or s.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
      and (${status} = 'all' or s.status = ${status})
    order by s.updated_at desc limit ${pageSize} offset ${offset}
  `;
  return {
    page, pageSize, total: numberValue(count.rows[0]?.total),
    subscriptions: result.rows.map((row) => ({
      id: String(row.id), userId: String(row.user_id), userName: String(row.full_name), email: String(row.email),
      planName: String(row.plan_name), amount: numberValue(row.amount), currency: String(row.currency), status: String(row.status),
      externalId: row.mercado_pago_preapproval_id ? String(row.mercado_pago_preapproval_id) : null,
      startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
      nextPaymentAt: row.next_payment_at ? new Date(String(row.next_payment_at)).toISOString() : null,
      cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : null,
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    })),
  };
}

export async function getAdminEngagement(period: AdminPeriod) {
  await ensureSchema();
  const [events, sessions, retained, topUsers, abandoned, series] = await Promise.all([
    sql`select count(distinct user_id)::int as users from activity_events where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz`,
    sql`select count(*)::int as total from activity_events where event_type = 'session_started' and created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz`,
    sql`
      select
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 1))::int as d1,
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 7))::int as d7,
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 30))::int as d30,
        count(*)::int as cohort
      from profiles p where p.created_at >= ${period.start}::timestamptz and p.created_at < ${period.end}::timestamptz
    `,
    sql`
      select p.id, p.full_name, p.email, count(a.id)::int as events
      from profiles p join activity_events a on a.user_id = p.id
      where a.created_at >= ${period.start}::timestamptz and a.created_at < ${period.end}::timestamptz
      group by p.id order by events desc limit 10
    `,
    sql`
      select p.id, p.full_name, p.email, p.last_login_at
      from profiles p
      where p.last_login_at is null or p.last_login_at < now() - interval '30 days'
      order by p.last_login_at nulls first limit 10
    `,
    sql`
      select date_trunc('day', created_at)::date::text as date, count(distinct user_id)::int as value
      from activity_events
      where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz
      group by 1 order by 1
    `,
  ]);
  const active = numberValue(events.rows[0]?.users);
  const cohort = numberValue(retained.rows[0]?.cohort);
  return {
    period,
    metrics: {
      activeUsers: active,
      sessions: numberValue(sessions.rows[0]?.total),
      averageSessionsPerActiveUser: active > 0 ? numberValue(sessions.rows[0]?.total) / active : 0,
      retentionD1: cohort > 0 ? numberValue(retained.rows[0]?.d1) / cohort * 100 : null,
      retentionD7: cohort > 0 ? numberValue(retained.rows[0]?.d7) / cohort * 100 : null,
      retentionD30: cohort > 0 ? numberValue(retained.rows[0]?.d30) / cohort * 100 : null,
    },
    notice: 'Atividade e retenção passam a ser registradas a partir da implantação desta versão; não há histórico retroativo inventado.',
    topUsers: topUsers.rows.map((row) => ({ id: String(row.id), name: String(row.full_name), email: String(row.email), events: numberValue(row.events) })),
    abandonedUsers: abandoned.rows.map((row) => ({ id: String(row.id), name: String(row.full_name), email: String(row.email), lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)).toISOString() : null })),
    activeSeries: series.rows.map((row) => ({ date: String(row.date), value: numberValue(row.value) })),
  };
}

export async function getAdminResources(period: AdminPeriod) {
  await ensureSchema();
  const [totals, uniqueUsers, series] = await Promise.all([
    sql`
      select
        (select count(*) from flashcards where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as flashcards,
        (select coalesce(sum(times_seen), 0) from study_progress where last_reviewed_at >= ${period.start}::timestamptz and last_reviewed_at < ${period.end}::timestamptz)::int as reviews,
        (select count(*) from mental_maps where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as mental_maps,
        (select count(*) from quiz_results where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as quizzes,
        (select coalesce(avg(case when total_questions > 0 then correct_answers::numeric / total_questions * 100 end), 0) from quiz_results where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::numeric as quiz_accuracy
    `,
    sql`
      select
        (select count(distinct user_id) from flashcards where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as flashcards,
        (select count(distinct user_id) from mental_maps where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as mental_maps,
        (select count(distinct user_id) from quiz_results where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz)::int as quizzes
    `,
    sql`
      select date, sum(flashcards)::int as flashcards, sum(mental_maps)::int as mental_maps, sum(quizzes)::int as quizzes from (
        select created_at::date::text as date, count(*) as flashcards, 0 as mental_maps, 0 as quizzes from flashcards where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
        union all
        select created_at::date::text, 0, count(*), 0 from mental_maps where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
        union all
        select created_at::date::text, 0, 0, count(*) from quiz_results where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
      ) grouped group by date order by date
    `,
  ]);
  return {
    period,
    flashcards: { created: numberValue(totals.rows[0]?.flashcards), reviewed: numberValue(totals.rows[0]?.reviews), uniqueUsers: numberValue(uniqueUsers.rows[0]?.flashcards) },
    mentalMaps: { created: numberValue(totals.rows[0]?.mental_maps), uniqueUsers: numberValue(uniqueUsers.rows[0]?.mental_maps) },
    quizzes: { completed: numberValue(totals.rows[0]?.quizzes), uniqueUsers: numberValue(uniqueUsers.rows[0]?.quizzes), averageAccuracy: numberValue(totals.rows[0]?.quiz_accuracy) },
    ai: { available: false, reason: 'Nenhuma integração de inteligência artificial foi encontrada no repositório.' },
    series: series.rows.map((row) => ({ date: String(row.date), flashcards: numberValue(row.flashcards), mentalMaps: numberValue(row.mental_maps), quizzes: numberValue(row.quizzes) })),
  };
}

export async function getAdminFinance() {
  await ensureSchema();
  const result = await sql`
    select
      count(*) filter (where status = 'active')::int as active_subscriptions,
      count(*) filter (where status = 'pending')::int as pending_subscriptions,
      count(*) filter (where status = 'cancelled')::int as cancelled_subscriptions,
      count(*) filter (where status = 'rejected')::int as rejected_subscriptions,
      coalesce(sum(amount) filter (where status = 'active'), 0)::numeric as mrr,
      coalesce(avg(amount) filter (where status = 'active'), 0)::numeric as average_contract
    from subscriptions
  `;
  const row = result.rows[0] ?? {};
  return {
    contracted: {
      activeSubscriptions: numberValue(row.active_subscriptions),
      pendingSubscriptions: numberValue(row.pending_subscriptions),
      cancelledSubscriptions: numberValue(row.cancelled_subscriptions),
      rejectedSubscriptions: numberValue(row.rejected_subscriptions),
      mrr: numberValue(row.mrr),
      averageContract: numberValue(row.average_contract),
    },
    realizedRevenue: { available: false, reason: 'Sem tabela de pagamentos, taxas, liquidações ou reembolsos. O MRR mostrado é contratado, não receita recebida.' },
    aiCosts: { available: false, reason: 'Nenhuma integração de IA foi encontrada.' },
  };
}

export async function getAdminErrors(query: Record<string, string | string[] | undefined>) {
  await ensureSchema();
  const page = intQuery(query, 'page', 1, 1, 100000);
  const pageSize = intQuery(query, 'pageSize', 25, 10, 100);
  const status = stringQuery(query, 'status', 'all');
  const offset = (page - 1) * pageSize;
  const count = await sql`select count(*)::int as total from application_errors where (${status} = 'all' or status = ${status})`;
  const result = await sql`
    select id, category, message, page, user_id, browser, device, status, occurrence_count, first_occurred_at, last_occurred_at, safe_details
    from application_errors where (${status} = 'all' or status = ${status})
    order by last_occurred_at desc limit ${pageSize} offset ${offset}
  `;
  return {
    page, pageSize, total: numberValue(count.rows[0]?.total),
    errors: result.rows.map((row) => ({
      id: String(row.id), category: String(row.category), message: String(row.message), page: row.page ? String(row.page) : null,
      userId: row.user_id ? String(row.user_id) : null, browser: row.browser ? String(row.browser) : null, device: row.device ? String(row.device) : null, status: String(row.status), occurrences: numberValue(row.occurrence_count),
      firstOccurredAt: new Date(String(row.first_occurred_at)).toISOString(), lastOccurredAt: new Date(String(row.last_occurred_at)).toISOString(), details: row.safe_details,
    })),
    notice: 'O monitoramento começa nesta implantação. Tokens, cookies, segredos e dados financeiros não são armazenados.',
  };
}


export async function updateAdminErrorStatus(errorId: string, status: string) {
  await ensureSchema();
  const allowed = new Set(['new', 'investigating', 'resolved', 'ignored']);
  if (!allowed.has(status)) throw new Error('Status de erro inválido.');
  const result = await sql`
    update application_errors set status = ${status}
    where id = ${errorId}
    returning id, status
  `;
  if (!result.rows[0]) throw new Error('Erro não encontrado.');
  return { id: String(result.rows[0].id), status: String(result.rows[0].status) };
}

export async function getAdminSettings() {
  await ensureSchema();
  const result = await sql`select key, value, updated_by, updated_at from admin_settings order by key`;
  const defaults = { inactivity_days: 30 };
  const values = { ...defaults } as Record<string, unknown>;
  for (const row of result.rows) values[String(row.key)] = row.value;
  return { values, editableKeys: Object.keys(defaults) };
}

export async function updateAdminSettings(adminId: string, payload: Record<string, unknown>) {
  await ensureSchema();
  const allowed = new Set(['inactivity_days']);
  for (const [key, rawValue] of Object.entries(payload)) {
    if (!allowed.has(key)) continue;
    let value: string | number = typeof rawValue === 'number' ? rawValue : String(rawValue).trim();
    if (key === 'inactivity_days') {
      value = Math.min(Math.max(Number(value) || 1, 1), 365);
    }
    const jsonValue = JSON.stringify(value);
    await sql`
      insert into admin_settings (key, value, updated_by, updated_at)
      values (${key}, ${jsonValue}::jsonb, ${adminId}, now())
      on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
    `;
  }
  return getAdminSettings();
}

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? '' : String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

export async function buildAdminCsv(type: string, query: Record<string, string | string[] | undefined> = {}) {
  await ensureSchema();
  if (type === 'growth') {
    const period = resolveAdminPeriod(query);
    const result = await sql`
      select created_at::date::text as date, count(*)::int as new_users
      from profiles
      where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz
      group by 1 order by 1
    `;
    const headers = ['date', 'new_users'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.date, row.new_users].map(csvCell).join(','))].join('\n');
  }
  if (type === 'engagement') {
    const period = resolveAdminPeriod(query);
    const result = await sql`
      select created_at::date::text as date, count(distinct user_id)::int as active_users,
        count(*) filter (where event_type = 'session_started')::int as sessions,
        count(*)::int as total_events
      from activity_events
      where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz
      group by 1 order by 1
    `;
    const headers = ['date', 'active_users', 'sessions', 'total_events'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.date, row.active_users, row.sessions, row.total_events].map(csvCell).join(','))].join('\n');
  }
  if (type === 'retention') {
    const period = resolveAdminPeriod(query);
    const result = await sql`
      select
        count(*)::int as cohort,
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 1))::int as retained_d1,
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 7))::int as retained_d7,
        count(*) filter (where exists (select 1 from activity_events a where a.user_id = p.id and a.created_at::date = p.created_at::date + 30))::int as retained_d30
      from profiles p
      where p.created_at >= ${period.start}::timestamptz and p.created_at < ${period.end}::timestamptz
    `;
    const row = result.rows[0] ?? {};
    const cohort = numberValue(row.cohort);
    const headers = ['period_start', 'period_end', 'cohort', 'retained_d1', 'retention_d1_percent', 'retained_d7', 'retention_d7_percent', 'retained_d30', 'retention_d30_percent'];
    const values = [period.start, period.end, cohort, row.retained_d1, cohort ? numberValue(row.retained_d1) / cohort * 100 : '', row.retained_d7, cohort ? numberValue(row.retained_d7) / cohort * 100 : '', row.retained_d30, cohort ? numberValue(row.retained_d30) / cohort * 100 : ''];
    return [headers.map(csvCell).join(','), values.map(csvCell).join(',')].join('\n');
  }
  if (type === 'resources') {
    const period = resolveAdminPeriod(query);
    const result = await sql`
      select date, sum(flashcards)::int as flashcards, sum(mental_maps)::int as mental_maps, sum(quizzes)::int as quizzes from (
        select created_at::date::text as date, count(*) as flashcards, 0 as mental_maps, 0 as quizzes from flashcards where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
        union all
        select created_at::date::text, 0, count(*), 0 from mental_maps where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
        union all
        select created_at::date::text, 0, 0, count(*) from quiz_results where created_at >= ${period.start}::timestamptz and created_at < ${period.end}::timestamptz group by 1
      ) grouped group by date order by date
    `;
    const headers = ['date', 'flashcards_created', 'mental_maps_created', 'quizzes_completed'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.date, row.flashcards, row.mental_maps, row.quizzes].map(csvCell).join(','))].join('\n');
  }
  if (type === 'finance') {
    const result = await sql`
      select status, count(*)::int as subscriptions, coalesce(sum(amount), 0)::numeric as contracted_amount
      from subscriptions group by status order by status
    `;
    const headers = ['status', 'subscriptions', 'contracted_monthly_amount', 'note'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.status, row.subscriptions, row.contracted_amount, 'Valor contratado; não representa receita liquidada'].map(csvCell).join(','))].join('\n');
  }
  if (type === 'cancellations') {
    const result = await sql`
      select s.id, s.user_id, p.email, s.plan_name, s.amount, s.currency, s.mercado_pago_preapproval_id, s.cancelled_at, s.updated_at
      from subscriptions s join profiles p on p.id = s.user_id
      where s.status = 'cancelled' order by coalesce(s.cancelled_at, s.updated_at) desc
    `;
    const headers = ['id', 'user_id', 'email', 'plan_name', 'amount', 'currency', 'external_id', 'cancelled_at', 'updated_at'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.id, row.user_id, row.email, row.plan_name, row.amount, row.currency, row.mercado_pago_preapproval_id, row.cancelled_at, row.updated_at].map(csvCell).join(','))].join('\n');
  }
  if (type === 'subscriptions') {
    const search = stringQuery(query, 'search').slice(0, 120);
    const status = stringQuery(query, 'status', 'all');
    const result = await sql`
      select s.id, s.user_id, p.email, s.status, s.plan_name, s.amount, s.currency, s.mercado_pago_preapproval_id, s.started_at, s.next_payment_at, s.cancelled_at
      from subscriptions s join profiles p on p.id = s.user_id
      where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or s.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
        and (${status} = 'all' or s.status = ${status})
      order by s.updated_at desc
    `;
    const headers = ['id', 'user_id', 'email', 'status', 'plan_name', 'amount', 'currency', 'external_id', 'started_at', 'next_payment_at', 'cancelled_at'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.id, row.user_id, row.email, row.status, row.plan_name, row.amount, row.currency, row.mercado_pago_preapproval_id, row.started_at, row.next_payment_at, row.cancelled_at].map(csvCell).join(','))].join('\n');
  }
  if (type === 'errors') {
    const status = stringQuery(query, 'status', 'all');
    const result = await sql`
      select id, category, message, page, user_id, status, occurrence_count, first_occurred_at, last_occurred_at
      from application_errors where (${status} = 'all' or status = ${status}) order by last_occurred_at desc
    `;
    const headers = ['id', 'category', 'message', 'page', 'user_id', 'status', 'occurrences', 'first_occurred_at', 'last_occurred_at'];
    return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.id, row.category, row.message, row.page, row.user_id, row.status, row.occurrence_count, row.first_occurred_at, row.last_occurred_at].map(csvCell).join(','))].join('\n');
  }
  const search = stringQuery(query, 'search').slice(0, 120);
  const filter = stringQuery(query, 'filter', 'all');
  const setting = await sql`select value from admin_settings where key = 'inactivity_days' limit 1`;
  const inactivityDays = Math.min(Math.max(numberValue(setting.rows[0]?.value) || 30, 1), 365);
  const inactivityCutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const result = await sql`
    select p.id, p.full_name, p.email, p.account_status, p.created_at, p.last_login_at, coalesce(s.status, 'inactive') as subscription_status,
      (select count(*) from flashcards where user_id = p.id)::int as flashcards,
      (select count(*) from mental_maps where user_id = p.id)::int as mental_maps,
      (select count(*) from quiz_results where user_id = p.id)::int as quizzes,
      (select coalesce(avg(case status when 'mastered' then 100 when 'almost' then 66.67 when 'learning' then 33.33 else 0 end), 0) from study_progress where user_id = p.id)::numeric as progress_percentage
    from profiles p left join subscriptions s on s.user_id = p.id
    where (${search} = '' or p.full_name ilike ${`%${search}%`} or p.email ilike ${`%${search}%`} or p.id ilike ${`%${search}%`} or coalesce(s.mercado_pago_preapproval_id, '') ilike ${`%${search}%`})
      and (
        ${filter} = 'all'
        or (${filter} = 'premium' and s.status = 'active')
        or (${filter} = 'free' and coalesce(s.status, 'inactive') <> 'active')
        or (${filter} = 'active' and p.last_login_at >= ${inactivityCutoff}::timestamptz)
        or (${filter} = 'inactive' and (p.last_login_at is null or p.last_login_at < ${inactivityCutoff}::timestamptz))
        or (${filter} = 'inactive_7d' and (p.last_login_at is null or p.last_login_at < ${sevenDaysAgo}::timestamptz))
        or (${filter} = 'inactive_14d' and (p.last_login_at is null or p.last_login_at < ${fourteenDaysAgo}::timestamptz))
        or (${filter} = 'never_accessed' and p.last_login_at is null)
        or (${filter} = 'new' and p.created_at >= now() - interval '7 days')
        or (${filter} = 'cancelled' and s.status = 'cancelled')
        or (${filter} = 'rejected' and s.status = 'rejected')
        or (${filter} = 'high_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') >= 10)
        or (${filter} = 'low_engagement' and (select count(*) from activity_events ae where ae.user_id = p.id and ae.created_at >= now() - interval '30 days') <= 2)
      )
    order by p.created_at desc
  `;
  const headers = ['id', 'name', 'email', 'account_status', 'created_at', 'last_login_at', 'subscription_status', 'progress_percentage', 'flashcards', 'mental_maps', 'quizzes'];
  return [headers.map(csvCell).join(','), ...result.rows.map((row) => [row.id, row.full_name, row.email, row.account_status, row.created_at, row.last_login_at, row.subscription_status, row.progress_percentage, row.flashcards, row.mental_maps, row.quizzes].map(csvCell).join(','))].join('\n');
}
