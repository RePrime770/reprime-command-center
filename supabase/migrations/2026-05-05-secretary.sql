-- ─── 2026-05-05 SECRETARY MIGRATION (outbound-ask tracker) ──────────────────
-- Track every outbound message Gideon sends so the Secretary tab can surface
-- what's awaiting reply, what's been answered, and what's overdue.
-- Hooks live in app/api/email/send, app/api/whatsapp/messages (insert),
-- app/api/whatsapp/webhook (mark replied), app/api/secretary/poll-overdue (cron).
-- Idempotent — safe to re-run.

create table if not exists public.outbound_asks (
  id                    uuid        primary key default gen_random_uuid(),
  sender_identity       text        not null default 'g@reprime.com',
  recipient_identifier  text        not null,
  channel               text        not null
                         check (channel in ('email','whatsapp','imessage','sms')),
  body                  text,
  sent_at               timestamptz not null default now(),
  expected_reply_by     timestamptz not null,
  status                text        not null default 'open'
                         check (status in ('open','replied','closed_no_reply','snoozed')),
  response_message_id   text,
  closed_at             timestamptz,
  related_thread_id     text,
  reminded_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists outbound_asks_open_expected_idx
  on public.outbound_asks (status, expected_reply_by)
  where status = 'open';

create index if not exists outbound_asks_recipient_status_idx
  on public.outbound_asks (recipient_identifier, status);

create index if not exists outbound_asks_sent_at_idx
  on public.outbound_asks (sent_at desc);

alter table public.outbound_asks enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'outbound_asks' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.outbound_asks
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'outbound_asks' and policyname = 'gideon_read'
  ) then
    -- Roster lock 2026-05-05: Gideon-only. RLS gates SELECT on auth.jwt email.
    execute 'create policy "gideon_read" on public.outbound_asks
             for select using ((auth.jwt() ->> ''email'') = ''g@reprime.com'')';
  end if;
end $$;

-- Realtime so the Secretary tab can subscribe and react to status changes.
do $$ begin
  alter publication supabase_realtime add table public.outbound_asks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
