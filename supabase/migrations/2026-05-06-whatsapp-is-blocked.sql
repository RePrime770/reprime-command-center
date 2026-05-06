-- ─── 2026-05-06 WHATSAPP_THREADS.IS_BLOCKED + BLOCKED_CONTACTS ────────────
-- Adds the cross-channel block column + ledger to public.whatsapp_threads.
-- The /api/contacts/block route, /api/whatsapp/threads, /api/whatsapp/
-- investor-chat-threads, and /api/briefing/today all reference is_blocked
-- and were producing 42703 ("column whatsapp_threads.is_blocked does not
-- exist") in production. This migration consolidates the prior
-- supabase/overnight_migration.sql (block half) into the standard migration
-- folder so it gets applied. Idempotent — safe to re-run.

-- 1. is_blocked column on whatsapp_threads
alter table public.whatsapp_threads
  add column if not exists is_blocked boolean not null default false;

create index if not exists whatsapp_threads_is_blocked_idx
  on public.whatsapp_threads (is_blocked)
  where is_blocked = true;

-- 2. Cross-channel ledger so a fresh inbound from a blocked person on a
--    new phone/channel still resolves and applies the block.
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
