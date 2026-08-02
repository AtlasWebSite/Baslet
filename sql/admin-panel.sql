-- Estrutura administrativa do StudyFlow.
-- O backend também executa estas alterações de forma idempotente por ensureSchema().

alter table profiles add column if not exists last_login_at timestamptz;
alter table profiles add column if not exists account_status text not null default 'active';

create table if not exists activity_events (
  id text primary key,
  user_id text references profiles(id) on delete cascade,
  event_type text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

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
);

create table if not exists admin_audit_logs (
  id text primary key,
  admin_user_id text not null,
  action text not null,
  target_type text,
  target_id text,
  result text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists admin_settings (
  key text primary key,
  value jsonb not null,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on profiles(lower(email));
create index if not exists profiles_created_at_idx on profiles(created_at);
create index if not exists profiles_last_login_idx on profiles(last_login_at);
create index if not exists activity_events_user_created_idx on activity_events(user_id, created_at desc);
create index if not exists activity_events_type_created_idx on activity_events(event_type, created_at desc);
create unique index if not exists application_errors_fingerprint_unique_idx on application_errors(fingerprint);
create index if not exists application_errors_status_idx on application_errors(status, last_occurred_at desc);
create index if not exists admin_audit_logs_created_idx on admin_audit_logs(created_at desc);
create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists quiz_results_user_created_idx on quiz_results(user_id, created_at desc);
create index if not exists study_progress_user_reviewed_idx on study_progress(user_id, last_reviewed_at desc);

create index if not exists subscriptions_preapproval_idx on subscriptions(mercado_pago_preapproval_id);
