import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import type { SessionUser } from './session.js';

let schemaPromise: Promise<void> | undefined;

export async function ensureSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = createSchema();
  return schemaPromise;
}

async function createSchema() {
  await sql`
    create table if not exists profiles (
      id text primary key,
      full_name text not null,
      avatar_url text,
      email text not null,
      onboarding_completed boolean not null default false,
      onboarding_completed_at timestamptz,
      walkthrough_completed boolean not null default false,
      walkthrough_completed_at timestamptz,
      starter_content_created boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists study_sets (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      title text not null,
      description text,
      subject text not null default 'Geral',
      color text not null default '#6758e8',
      icon text not null default 'general',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists flashcards (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      study_set_id text not null references study_sets(id) on delete cascade,
      term text not null,
      definition text not null,
      difficulty text not null default 'normal',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists study_progress (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      study_set_id text not null references study_sets(id) on delete cascade,
      flashcard_id text not null references flashcards(id) on delete cascade,
      status text not null default 'learning',
      times_seen integer not null default 0,
      times_correct integer not null default 0,
      times_wrong integer not null default 0,
      last_reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, flashcard_id)
    )
  `;

  await sql`
    create table if not exists quiz_results (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      study_set_id text not null references study_sets(id) on delete cascade,
      score integer not null,
      total_questions integer not null,
      correct_answers integer not null,
      wrong_answers integer not null,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists mental_maps (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      study_set_id text not null references study_sets(id) on delete cascade,
      title text not null,
      nodes jsonb not null default '[]',
      edges jsonb not null default '[]',
      mode text not null default 'summary',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists subscriptions (
      id text primary key,
      user_id text not null unique references profiles(id) on delete cascade,
      mercado_pago_preapproval_id text,
      mercado_pago_payer_id text,
      mercado_pago_checkout_url text,
      status text not null default 'inactive',
      plan_name text not null default 'StudyFlow Premium',
      amount numeric not null default 11.90,
      currency text not null default 'BRL',
      started_at timestamptz,
      next_payment_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`alter table subscriptions add column if not exists mercado_pago_preapproval_id text`;
  await sql`alter table subscriptions add column if not exists mercado_pago_payer_id text`;
  await sql`alter table subscriptions add column if not exists mercado_pago_checkout_url text`;
  await sql`alter table profiles add column if not exists walkthrough_completed boolean not null default false`;
  await sql`alter table profiles add column if not exists walkthrough_completed_at timestamptz`;
  await sql`alter table profiles add column if not exists last_login_at timestamptz`;
  await sql`alter table profiles add column if not exists account_status text not null default 'active'`;

  await sql`create index if not exists study_sets_user_idx on study_sets(user_id)`;
  await sql`create index if not exists flashcards_user_set_idx on flashcards(user_id, study_set_id)`;
  await sql`create index if not exists mental_maps_user_idx on mental_maps(user_id)`;
  await sql`
    create table if not exists activity_events (
      id text primary key,
      user_id text references profiles(id) on delete cascade,
      event_type text not null,
      resource_type text,
      resource_id text,
      metadata jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists application_errors (
      id text primary key,
      fingerprint text not null,
      category text not null default 'unknown',
      message text not null,
      page text,
      user_id text references profiles(id) on delete set null,
      browser text,
      device text,
      status text not null default 'new',
      occurrence_count integer not null default 1,
      first_occurred_at timestamptz not null default now(),
      last_occurred_at timestamptz not null default now(),
      safe_details jsonb not null default '{}'
    )
  `;

  await sql`
    create table if not exists admin_audit_logs (
      id text primary key,
      admin_user_id text not null,
      action text not null,
      target_type text,
      target_id text,
      result text not null,
      metadata jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists admin_settings (
      key text primary key,
      value jsonb not null,
      updated_by text not null,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists profiles_email_idx on profiles(lower(email))`;
  await sql`create index if not exists profiles_created_at_idx on profiles(created_at)`;
  await sql`create index if not exists profiles_last_login_idx on profiles(last_login_at)`;
  await sql`create index if not exists activity_events_user_created_idx on activity_events(user_id, created_at desc)`;
  await sql`create index if not exists activity_events_type_created_idx on activity_events(event_type, created_at desc)`;
  await sql`create unique index if not exists application_errors_fingerprint_unique_idx on application_errors(fingerprint)`;
  await sql`create index if not exists application_errors_status_idx on application_errors(status, last_occurred_at desc)`;
  await sql`create index if not exists admin_audit_logs_created_idx on admin_audit_logs(created_at desc)`;
  await sql`create index if not exists subscriptions_status_idx on subscriptions(status)`;
  await sql`create index if not exists quiz_results_user_created_idx on quiz_results(user_id, created_at desc)`;
  await sql`create index if not exists study_progress_user_reviewed_idx on study_progress(user_id, last_reviewed_at desc)`;

  await sql`create index if not exists subscriptions_preapproval_idx on subscriptions(mercado_pago_preapproval_id)`;
}

export async function upsertProfileFromSession(user: SessionUser) {
  await ensureSchema();

  const { rows } = await sql`
    insert into profiles (id, full_name, avatar_url, email, last_login_at, updated_at)
    values (${user.id}, ${user.fullName}, ${user.avatarUrl}, ${user.email}, now(), now())
    on conflict (id) do update set
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      email = excluded.email,
      last_login_at = now(),
      updated_at = now()
    returning *
  `;

  await sql`
    insert into activity_events (id, user_id, event_type, resource_type, resource_id, metadata)
    values (${randomUUID()}, ${user.id}, 'user_login', 'profile', ${user.id}, '{}'::jsonb)
  `;
  return rows[0];
}


export async function touchProfileSession(userId: string) {
  await ensureSchema();
  await sql`update profiles set last_login_at = now(), updated_at = now() where id = ${userId}`;
  await sql`
    insert into activity_events (id, user_id, event_type, resource_type, resource_id, metadata)
    select ${randomUUID()}, ${userId}, 'session_started', 'session', null, '{}'::jsonb
    where not exists (
      select 1 from activity_events
      where user_id = ${userId} and event_type = 'session_started' and created_at >= now() - interval '15 minutes'
    )
  `;
}
