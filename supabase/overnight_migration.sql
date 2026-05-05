-- ─── OVERNIGHT BUILD MIGRATION ─────────────────────────────────────────────
-- Run this once in Supabase SQL editor. Covers all features shipped tonight:
--   1. Cross-channel block (whatsapp_threads.is_blocked + blocked_contacts table)
--   2. Caller-ID phonebook (contact_directory)
-- Idempotent — safe to re-run.

-- ─── 1. BLOCK ──────────────────────────────────────────────────────────────
alter table public.whatsapp_threads
  add column if not exists is_blocked boolean not null default false;

create index if not exists whatsapp_threads_is_blocked_idx
  on public.whatsapp_threads (is_blocked)
  where is_blocked = true;

-- A separate ledger of blocked persons so a fresh inbound from a blocked
-- person on a NEW phone/channel still resolves and applies the block.
create table if not exists public.blocked_contacts (
  id                   uuid        primary key default gen_random_uuid(),
  pipedrive_contact_id integer,
  phone                text,
  email                text,
  reason               text,
  blocked_at           timestamptz not null default now(),
  unblocked_at         timestamptz,
  unique (pipedrive_contact_id),
  unique (phone),
  unique (email)
);

create index if not exists blocked_contacts_phone_idx
  on public.blocked_contacts (phone) where phone is not null and unblocked_at is null;
create index if not exists blocked_contacts_email_idx
  on public.blocked_contacts (email) where email is not null and unblocked_at is null;
create index if not exists blocked_contacts_pipedrive_idx
  on public.blocked_contacts (pipedrive_contact_id) where pipedrive_contact_id is not null and unblocked_at is null;

alter table public.blocked_contacts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'blocked_contacts' and policyname = 'service_role_all') then
    execute 'create policy "service_role_all" on public.blocked_contacts for all using (auth.role() = ''service_role'')';
  end if;
end $$;

-- ─── 2. CONTACT DIRECTORY (caller-ID phonebook from xlsx) ──────────────────
create table if not exists public.contact_directory (
  id                  uuid        primary key default gen_random_uuid(),
  source              text        not null default 'xlsx',  -- 'xlsx' | 'pipedrive' | 'manual'
  canonical_name      text        not null,
  all_name_variants   text,
  primary_phone       text,
  all_phones          text,
  primary_email       text,
  all_emails          text,
  company             text,
  title               text,
  preferred_language  text,
  is_investor         boolean     not null default false,
  geographies         text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (canonical_name, primary_phone)
);

create index if not exists contact_directory_primary_phone_idx
  on public.contact_directory (primary_phone) where primary_phone is not null;
create index if not exists contact_directory_primary_email_idx
  on public.contact_directory (primary_email) where primary_email is not null;
create index if not exists contact_directory_canonical_name_idx
  on public.contact_directory (canonical_name);

alter table public.contact_directory enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'contact_directory' and policyname = 'service_role_all') then
    execute 'create policy "service_role_all" on public.contact_directory for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contact_directory' and policyname = 'authenticated_read') then
    execute 'create policy "authenticated_read" on public.contact_directory for select using (auth.role() = ''authenticated'')';
  end if;
end $$;
