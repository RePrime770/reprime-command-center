-- ─── 2026-06-17 COURTLISTENER MIGRATION (tenant docket watchlist) ──────────
-- CourtListener (Free Law Project) RECAP docket search; the connector at
-- lib/courtlistener/client.ts watches for new bankruptcy / litigation dockets
-- naming the tenants we track. The cron at app/api/cron/courtlistener-poll
-- writes new rows here. docket_id is the primary key so re-runs are no-ops.
-- Idempotent — safe to re-run.

create table if not exists public.court_dockets (
  docket_id       bigint      primary key,
  case_name       text,
  docket_number   text,
  court           text,
  court_id        text,
  chapter         text,
  nature_of_suit  text,
  date_filed      date,
  absolute_url    text,
  matched_tenant  text,
  raw             jsonb,
  first_seen_at   timestamptz not null default now()
);

create index if not exists court_dockets_tenant_idx
  on public.court_dockets (matched_tenant);

create index if not exists court_dockets_first_seen_idx
  on public.court_dockets (first_seen_at desc);

create index if not exists court_dockets_date_filed_idx
  on public.court_dockets (date_filed desc);

alter table public.court_dockets enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'court_dockets' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.court_dockets
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'court_dockets' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.court_dockets
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.court_dockets;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
