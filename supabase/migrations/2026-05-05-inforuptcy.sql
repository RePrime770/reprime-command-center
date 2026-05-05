-- ─── 2026-05-05 INFORUPTCY MIGRATION (tenant filing watchlist) ─────────────
-- Inforuptcy has no public API; the connector at lib/inforuptcy/client.ts
-- session-polls https://www.inforuptcy.com once daily for the 6-tenant
-- watchlist (Family Dollar Stores, Dollar Tree, Planet Fitness, Tractor
-- Supply, Joann, Big Lots) and writes new case rows here. case_no is the
-- primary key so re-running the cron on the same day is a no-op.
-- Briefing endpoint reads new rows where first_seen_at >= today midnight CT.
-- Idempotent — safe to re-run.

create table if not exists public.inforuptcy_filings (
  case_no         text        primary key,
  tenant          text        not null,
  party_title     text,
  court           text,
  filed_at        date,
  raw             jsonb,
  first_seen_at   timestamptz not null default now()
);

create index if not exists inforuptcy_filings_tenant_idx
  on public.inforuptcy_filings (tenant);

create index if not exists inforuptcy_filings_first_seen_idx
  on public.inforuptcy_filings (first_seen_at desc);

create index if not exists inforuptcy_filings_filed_at_idx
  on public.inforuptcy_filings (filed_at desc);

alter table public.inforuptcy_filings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'inforuptcy_filings' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.inforuptcy_filings
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'inforuptcy_filings' and policyname = 'authenticated_read'
  ) then
    -- Roster lock 2026-05-05: any signed-in dashboard user can read.
    -- Briefing endpoint authenticates Gideon explicitly upstream.
    execute 'create policy "authenticated_read" on public.inforuptcy_filings
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- Realtime so the Pipeline column can subscribe and surface fresh filings
-- as they land without a manual refresh.
do $$ begin
  alter publication supabase_realtime add table public.inforuptcy_filings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
