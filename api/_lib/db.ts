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
  await sql`alter table study_sets add column if not exists created_by_ai boolean not null default false`;
  await sql`alter table study_sets add column if not exists ai_topic text`;
  await sql`alter table mental_maps add column if not exists created_by_ai boolean not null default false`;
  await sql`alter table mental_maps add column if not exists ai_topic text`;

  await sql`
    create table if not exists ai_generations (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      content_type text not null,
      topic text not null,
      model text not null,
      prompt_tokens integer not null default 0,
      completion_tokens integer not null default 0,
      total_tokens integer not null default 0,
      status text not null,
      created_content_id text,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists ai_rate_events (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists ai_generation_locks (
      user_id text primary key references profiles(id) on delete cascade,
      locked_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists study_sets_user_idx on study_sets(user_id)`;
  await sql`create index if not exists flashcards_user_set_idx on flashcards(user_id, study_set_id)`;
  await sql`create index if not exists mental_maps_user_idx on mental_maps(user_id)`;
  await sql`create index if not exists subscriptions_preapproval_idx on subscriptions(mercado_pago_preapproval_id)`;
  await sql`create index if not exists ai_generations_user_month_idx on ai_generations(user_id, created_at)`;
  await sql`create index if not exists ai_rate_events_user_created_idx on ai_rate_events(user_id, created_at)`;
}

export async function upsertProfileFromSession(user: SessionUser) {
  await ensureSchema();

  const { rows } = await sql`
    insert into profiles (id, full_name, avatar_url, email, updated_at)
    values (${user.id}, ${user.fullName}, ${user.avatarUrl}, ${user.email}, now())
    on conflict (id) do update set
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      email = excluded.email,
      updated_at = now()
    returning *
  `;

  return rows[0];
}
