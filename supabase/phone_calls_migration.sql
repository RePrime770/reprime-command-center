-- phone_calls table
-- Stores call records from both Quo (305) and BlueBubbles/iPhone (718)
-- Run once in Supabase SQL editor

create table if not exists public.phone_calls (
  id                uuid        primary key default gen_random_uuid(),
  external_id       text        not null unique,   -- Quo call ID or iOS CallHistory ROWID
  panel             text        not null,           -- '305' or '718'
  direction         text        not null,           -- 'inbound' | 'outbound'
  from_phone        text        not null,
  to_phone          text        not null,
  contact_phone     text,                           -- the non-reprime party
  started_at        timestamptz,
  ended_at          timestamptz,
  duration_seconds  integer,
  status            text        not null default 'completed',  -- 'completed' | 'missed' | 'voicemail'
  channel_type      text        not null default 'call',
  recording_url     text,                           -- Quo recording URL (null for 718 calls)
  created_at        timestamptz not null default now()
);

-- Index for contact timeline lookups
create index if not exists phone_calls_contact_phone_idx on public.phone_calls (contact_phone, started_at desc);
create index if not exists phone_calls_panel_idx on public.phone_calls (panel, started_at desc);

-- RLS: service role can do everything; authenticated users can read
alter table public.phone_calls enable row level security;

create policy "service_role_all" on public.phone_calls
  for all using (auth.role() = 'service_role');

create policy "authenticated_read" on public.phone_calls
  for select using (auth.role() = 'authenticated');
