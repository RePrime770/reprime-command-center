-- ─── 2026-06-22 NORA CHAT PERSISTENCE (Phase 5) ─────────────────────────────
-- Persist Nora's two-way chat so the conversation survives a cockpit reload.
-- Writers: app/api/nora/chat (POST persists the user turn + assistant reply via
-- the service client, best-effort). Reader: app/api/nora/history (GET, last ~50).
-- Single-user app (Gideon only) — user_email defaults for future-proofing.
-- Idempotent — safe to re-run.

create table if not exists public.nora_chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  role        text        not null check (role in ('user','assistant')),
  content     text        not null,
  language    text,
  user_email  text        not null default 'g@reprime.com',
  created_at  timestamptz not null default now()
);

create index if not exists nora_chat_messages_created_at_idx
  on public.nora_chat_messages (created_at);

alter table public.nora_chat_messages enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'nora_chat_messages' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.nora_chat_messages
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'nora_chat_messages' and policyname = 'gideon_read'
  ) then
    -- Roster lock: Gideon-only. RLS gates SELECT on auth.jwt email.
    execute 'create policy "gideon_read" on public.nora_chat_messages
             for select using ((auth.jwt() ->> ''email'') = ''g@reprime.com'')';
  end if;
end $$;
