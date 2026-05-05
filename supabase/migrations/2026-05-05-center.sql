-- ─── 2026-05-05 CENTER KIOSK MIGRATION ───────────────────────────────────────
-- Wave 1 consolidator: Bucket + Inbox scoring + Crew + Reminders + roster seed.
-- Unblocks Wave 2 tracks B, C, D, I.
-- Idempotent — safe to re-run.

-- ============================================================
-- Track B — Bucket items
-- ============================================================
create table if not exists public.bucket_items (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  body          text,
  source_url    text,
  source_type   text,
  status        text        not null default 'open'
                check (status in ('open','doing','done','dropped')),
  priority      int         not null default 3
                check (priority between 1 and 5),
  due_at        timestamptz,
  reminded_at   timestamptz,
  assigned_to   text,
  assigned_by   text,
  created_by    text        not null default 'g@reprime.com',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bucket_items_status_idx
  on public.bucket_items (status);
create index if not exists bucket_items_assigned_to_idx
  on public.bucket_items (assigned_to);
create index if not exists bucket_items_due_at_idx
  on public.bucket_items (due_at)
  where due_at is not null;
create index if not exists bucket_items_reminded_at_idx
  on public.bucket_items (reminded_at)
  where reminded_at is not null;

alter table public.bucket_items enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bucket_items' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.bucket_items
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'bucket_items' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.bucket_items
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- Track C — Email scoring
-- ============================================================
create table if not exists public.email_scores (
  id            uuid        primary key default gen_random_uuid(),
  message_id    text        unique not null,
  thread_id     text,
  from_address  text        not null,
  subject       text,
  score         int         not null default 0,
  reasons       jsonb       not null default '[]'::jsonb,
  scored_at     timestamptz not null default now()
);

create index if not exists email_scores_score_idx
  on public.email_scores (score desc);
create index if not exists email_scores_thread_idx
  on public.email_scores (thread_id);

alter table public.email_scores enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_scores' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.email_scores
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_scores' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.email_scores
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- Track D — Crew
-- ============================================================
create table if not exists public.crew_members (
  email                  text        primary key,
  display_name           text        not null,
  role                   text        not null,
  phone                  text,
  is_principal           boolean     not null default false,
  is_investor_side_only  boolean     not null default false,
  active                 boolean     not null default true,
  created_at             timestamptz not null default now()
);

alter table public.crew_members enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'crew_members' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.crew_members
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'crew_members' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.crew_members
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- Roster seed — lock 2026-05-05.
-- Six rows: Gideon (principal) + 5 team members. Amelia and Dovber are OFF
-- the roster and intentionally absent. Adir is investor-side only.
insert into public.crew_members
  (email, display_name, role, phone, is_principal, is_investor_side_only, active)
values
  ('g@reprime.com',      'Gideon M. Gratsiani', 'Principal',                    '+13057784861', true,  false, true),
  ('shirel@reprime.com', 'Shirel Ben-Haroush',  'SVP / Partner',                null,           false, false, true),
  ('steve@reprime.com',  'Steve Philipp',       'AI / Email Automation',        null,           false, false, true),
  ('adir@reprime.com',   'Adir Yonasi',         'VP Investor Relations',        null,           false, true,  true),
  ('yaron@reprime.com',  'Yaron Sitbon',        'Israel Division',              null,           false, false, true),
  ('chaim@reprime.com',  'Chaim Abrahams',      'Co-Founder',                   null,           false, false, true)
on conflict (email) do update set
  display_name           = excluded.display_name,
  role                   = excluded.role,
  phone                  = excluded.phone,
  is_principal           = excluded.is_principal,
  is_investor_side_only  = excluded.is_investor_side_only,
  active                 = excluded.active;

-- ============================================================
-- Track I — Reminders
-- ============================================================
create table if not exists public.reminders (
  id              uuid        primary key default gen_random_uuid(),
  bucket_item_id  uuid        not null references public.bucket_items(id) on delete cascade,
  fire_at         timestamptz not null,
  fired_at        timestamptz,
  payload         jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists reminders_unfired_fire_at_idx
  on public.reminders (fire_at)
  where fired_at is null;
create index if not exists reminders_bucket_item_idx
  on public.reminders (bucket_item_id);

alter table public.reminders enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reminders' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.reminders
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'reminders' and policyname = 'authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.reminders
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- Realtime — enable for bucket_items and reminders so the kiosk subscribes.
-- Wrapped in DO blocks so re-runs don't fail with duplicate_object.
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.bucket_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.reminders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
