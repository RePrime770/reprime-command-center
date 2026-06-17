-- ─── 2026-06-17 CENSUS MIGRATION (market demographics snapshots) ───────────
-- U.S. Census ACS5 demographics for the markets we underwrite. The connector
-- at lib/census/client.ts fetches on demand (/api/census/market) and the
-- weekly refresh cron (/api/cron/census-refresh) snapshots configured target
-- geographies here. Census data is annual, so the natural key is
-- (geo_id, dataset, year) — re-fetching the same vintage upserts in place
-- rather than duplicating. Idempotent — safe to re-run.

create table if not exists public.census_market_snapshots (
  geo_id                   text        not null,
  dataset                  text        not null,
  year                     int         not null,
  name                     text,
  population               bigint,
  median_household_income  int,
  median_home_value        bigint,
  median_gross_rent        int,
  raw                      jsonb,
  refreshed_at             timestamptz not null default now(),
  primary key (geo_id, dataset, year)
);

create index if not exists census_market_name_idx
  on public.census_market_snapshots (name);

create index if not exists census_market_refreshed_idx
  on public.census_market_snapshots (refreshed_at desc);

alter table public.census_market_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'census_market_snapshots' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.census_market_snapshots
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'census_market_snapshots' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.census_market_snapshots
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;
