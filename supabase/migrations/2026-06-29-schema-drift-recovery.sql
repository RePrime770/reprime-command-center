-- ─── 2026-06-29 SCHEMA DRIFT RECOVERY ───────────────────────────────────────
-- Recovers every table that production code queries but no migration in this
-- repo defines. Generated from docs/DATABASE_AUDIT.md.
--
-- Every statement uses IF NOT EXISTS / DO $$ … exception when … then null,
-- so this migration is SAFE TO RUN against the live Supabase project — it
-- will be a no-op on tables that already exist in the dashboard, and will
-- create the missing ones on a fresh project bootstrap.
--
-- Column types are deliberately conservative: text where the exact type
-- isn't clear from the query shape, jsonb for opaque blobs, timestamptz
-- for every *_at / *_iso column. Adjust upward once the schema is locked.
--
-- Gideon-only action: apply via Supabase Dashboard → SQL editor, or
-- `supabase db push` once direct-connection credentials are restored.

-- ============================================================
-- whatsapp_threads — comms thread (multi-channel: WA 305/718, iMessage, SMS)
-- ============================================================
create table if not exists public.whatsapp_threads (
  id                  uuid        primary key default gen_random_uuid(),
  panel               text,                      -- '305' | '718' | null
  phone               text,                      -- E.164 or last-7 fallback
  channel_type        text        not null default 'whatsapp',
                                                 -- 'whatsapp'|'imessage'|'sms'
  contact_name        text,
  timelines_chat_id   text,                      -- BlueBubbles/Timelines chat id
  is_group            boolean     not null default false,
  is_priority         boolean     not null default false,
  is_blocked          boolean     not null default false,
  is_investor         boolean     not null default false,
  lane_override       text        check (lane_override in ('investor','staff','general')),
  last_message_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Webhook upserts use onConflict: 'panel,phone,channel_type' — needs a unique
-- index for the upsert to be deterministic.
create unique index if not exists whatsapp_threads_panel_phone_channel_key
  on public.whatsapp_threads (panel, phone, channel_type);

create index if not exists whatsapp_threads_phone_idx on public.whatsapp_threads (phone);
create index if not exists whatsapp_threads_timelines_chat_idx on public.whatsapp_threads (timelines_chat_id);
create index if not exists whatsapp_threads_last_message_at_idx on public.whatsapp_threads (last_message_at desc);

alter table public.whatsapp_threads enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='whatsapp_threads' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.whatsapp_threads for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='whatsapp_threads' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.whatsapp_threads for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- whatsapp_messages — every inbound/outbound across WA/iM/SMS
-- ============================================================
create table if not exists public.whatsapp_messages (
  id              uuid        primary key default gen_random_uuid(),
  thread_id       uuid        references public.whatsapp_threads(id) on delete cascade,
  timelines_uid   text        unique,            -- dedupe key from BB/Timelines
  panel           text,
  direction       text        not null default 'inbound',
                                                 -- 'inbound' | 'outbound'
  body            text,
  media_url       text,
  media_type      text,                          -- 'audio'|'image'|'video'|null
  status          text        not null default 'received',
  ts_iso          timestamptz,                   -- source-of-truth timestamp
  contact_phone   text,
  created_at      timestamptz not null default now()
);

create index if not exists whatsapp_messages_thread_id_idx on public.whatsapp_messages (thread_id, created_at desc);
create index if not exists whatsapp_messages_contact_phone_idx on public.whatsapp_messages (contact_phone);
create index if not exists whatsapp_messages_ts_iso_idx on public.whatsapp_messages (ts_iso desc);

alter table public.whatsapp_messages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='whatsapp_messages' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.whatsapp_messages for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='whatsapp_messages' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.whatsapp_messages for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- invitations — meeting invite tokens (booking page /v/[token])
-- ============================================================
create table if not exists public.invitations (
  id                     text        primary key,      -- token
  contact_pipedrive_id   integer,
  contact_first_name     text,
  contact_last_name      text,
  contact_email          text,
  contact_phone          text,
  status                 text        not null default 'pending',
                                                       -- pending|sent|confirmed|...
  proposed_slots         jsonb,                        -- [{iso,display},...]
  confirmed_slot_iso     timestamptz,
  view_count             integer     not null default 0,
  first_opened_at        timestamptz,
  first_video_at         timestamptz,
  meeting_status         text,
  email_audit_flag       text,                         -- 'review' | null
  parent_id              text,                         -- chains add-attendee
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists invitations_status_idx on public.invitations (status);
create index if not exists invitations_contact_email_idx on public.invitations (contact_email);
create index if not exists invitations_contact_phone_idx on public.invitations (contact_phone);
create index if not exists invitations_confirmed_slot_idx on public.invitations (confirmed_slot_iso);

alter table public.invitations enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='invitations' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.invitations for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='invitations' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.invitations for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- roster — contact backbone, keyed by source_row (xlsx upload row #)
-- ============================================================
create table if not exists public.roster (
  source_row          integer     primary key,
  name                text,
  phone               text,
  email               text,
  board_stage         text,
  awaiting_us         boolean     not null default false,
  last_from           text,                            -- 'us' | 'them'
  last_reply_text     text,
  last_reply_at       timestamptz,
  thread_json         jsonb,                           -- inline conversation
  followup_note       text,
  remind_at           timestamptz,
  alerted_at          timestamptz,
  verified_at         timestamptz,
  email_audit_flag    text,
  email_audit_note    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists roster_phone_idx on public.roster (phone);
create index if not exists roster_email_idx on public.roster (email);
create index if not exists roster_awaiting_us_idx on public.roster (awaiting_us) where awaiting_us = true;
create index if not exists roster_remind_at_idx on public.roster (remind_at) where remind_at is not null;

alter table public.roster enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='roster' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.roster for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='roster' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.roster for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- roster_emails — extra email aliases pointing at a roster row
-- ============================================================
create table if not exists public.roster_emails (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null unique,
  source_row   integer     not null references public.roster(source_row) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists roster_emails_source_row_idx on public.roster_emails (source_row);

alter table public.roster_emails enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='roster_emails' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.roster_emails for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='roster_emails' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.roster_emails for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- tags — named tag dictionary
-- ============================================================
create table if not exists public.tags (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null unique,
  color         text,
  is_investor   boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.tags enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='tags' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.tags for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='tags' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.tags for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- thread_tags — join: many tags on many threads
-- ============================================================
create table if not exists public.thread_tags (
  thread_id   uuid        not null references public.whatsapp_threads(id) on delete cascade,
  tag_id      uuid        not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (thread_id, tag_id)
);

create index if not exists thread_tags_tag_id_idx on public.thread_tags (tag_id);

alter table public.thread_tags enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='thread_tags' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.thread_tags for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='thread_tags' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.thread_tags for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- approvals — Spanish-side draft approvals before Hebrew send
-- ============================================================
create table if not exists public.approvals (
  id             uuid        primary key default gen_random_uuid(),
  source_row     integer,                            -- nullable: ad-hoc
  contact_name   text        not null default '',
  channel        text        not null default 'whatsapp',
  their_text     text,
  their_es       text,                               -- Spanish translation
  draft_es       text,                               -- proposed reply (ES)
  draft_he       text,                               -- final reply (HE)
  worked_by      text        not null default 'spanish',
  status         text        not null default 'pending',
                                                     -- pending|sent|rejected
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists approvals_status_idx on public.approvals (status, created_at);

alter table public.approvals enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='approvals' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.approvals for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='approvals' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.approvals for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- gmail_watch_state — Gmail push-notification cursor
-- ============================================================
create table if not exists public.gmail_watch_state (
  email        text        primary key,
  history_id   text,
  expiration   timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.gmail_watch_state enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='gmail_watch_state' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.gmail_watch_state for all using (auth.role() = ''service_role'')';
  end if;
end $$;

-- ============================================================
-- notes — Gideon's pinned notes
-- ============================================================
create table if not exists public.notes (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  body        text        not null default '',
  is_pinned   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_pinned_updated_idx on public.notes (is_pinned desc, updated_at desc);

alter table public.notes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notes' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.notes for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='notes' and policyname='gideon_read') then
    execute 'create policy "gideon_read" on public.notes for select using ((auth.jwt() ->> ''email'') = ''g@reprime.com'')';
  end if;
end $$;

-- ============================================================
-- tr_cache — translation cache (hash → Spanish)
-- ============================================================
create table if not exists public.tr_cache (
  src_hash    text        primary key,
  es          text        not null,
  created_at  timestamptz not null default now()
);

alter table public.tr_cache enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='tr_cache' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.tr_cache for all using (auth.role() = ''service_role'')';
  end if;
end $$;

-- ============================================================
-- zoom_events — raw webhook payloads
-- ============================================================
create table if not exists public.zoom_events (
  id          uuid        primary key default gen_random_uuid(),
  event       text        not null default 'unknown',
  payload     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists zoom_events_event_idx on public.zoom_events (event, created_at desc);

alter table public.zoom_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='zoom_events' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.zoom_events for all using (auth.role() = ''service_role'')';
  end if;
end $$;

-- ============================================================
-- meeting_summaries — Zoom AI Companion ingest target
-- ============================================================
create table if not exists public.meeting_summaries (
  id                     uuid        primary key default gen_random_uuid(),
  pipedrive_contact_id   integer,
  meeting_topic          text,
  meeting_uuid           text,
  summary                text,
  payload                jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists meeting_summaries_pipedrive_idx on public.meeting_summaries (pipedrive_contact_id);

alter table public.meeting_summaries enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='meeting_summaries' and policyname='service_role_all') then
    execute 'create policy "service_role_all" on public.meeting_summaries for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (select 1 from pg_policies where tablename='meeting_summaries' and policyname='authenticated_read') then
    execute 'create policy "authenticated_read" on public.meeting_summaries for select using (auth.role() = ''authenticated'')';
  end if;
end $$;

-- ============================================================
-- Realtime — UI subscribes to these in InvestorChatPanel + TagChips, so the
-- tables need to be in the supabase_realtime publication for the channel to
-- ever fire. Wrapped so re-runs don't fail on duplicate_object.
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.whatsapp_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.thread_tags;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
