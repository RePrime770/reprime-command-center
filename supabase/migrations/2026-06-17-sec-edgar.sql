-- ─── 2026-06-17 SEC EDGAR MIGRATION (public-tenant filings watchlist) ──────
-- The SEC publishes a free JSON API; lib/sec-edgar/client.ts resolves each
-- watchlist tenant to a CIK and pulls recent *material* filings (8-K, 10-K,
-- 10-Q, delisting/deregistration, 13D/G). The cron at
-- app/api/cron/sec-edgar-poll writes new rows here. accession_no is the
-- primary key so re-running the cron is a no-op.
-- Briefing endpoint can read new rows where first_seen_at >= today midnight CT.
-- Idempotent — safe to re-run.

create table if not exists public.sec_filings (
  accession_no    text        primary key,
  cik             text        not null,
  company         text,
  ticker          text,
  form            text        not null,
  filed_at        date,
  report_date     date,
  primary_doc_url text,
  description     text,
  items           text,
  raw             jsonb,
  first_seen_at   timestamptz not null default now()
);

create index if not exists sec_filings_ticker_idx
  on public.sec_filings (ticker);

create index if not exists sec_filings_form_idx
  on public.sec_filings (form);

create index if not exists sec_filings_first_seen_idx
  on public.sec_filings (first_seen_at desc);

create index if not exists sec_filings_filed_at_idx
  on public.sec_filings (filed_at desc);

alter table public.sec_filings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sec_filings' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.sec_filings
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'sec_filings' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.sec_filings
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- Realtime so the Pipeline column can surface fresh filings without a refresh.
do $$ begin
  alter publication supabase_realtime add table public.sec_filings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
