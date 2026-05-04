-- investor_reminders — scheduled prompts surfaced in the morning briefing.
-- Created when Gideon clicks "Schedule reminder" inside the InvestorProfile
-- slide-in. Each row fires once at remind_at; the briefing job marks it dispatched.

create table if not exists public.investor_reminders (
  id              uuid        primary key default gen_random_uuid(),
  pipedrive_contact_id integer not null,
  contact_name    text,
  remind_at       timestamptz not null,
  note            text,
  status          text        not null default 'pending', -- pending|dispatched|cancelled
  dispatched_at   timestamptz,
  created_by      text        not null,
  created_at      timestamptz not null default now()
);

create index if not exists investor_reminders_remind_at_idx
  on public.investor_reminders (remind_at)
  where status = 'pending';

create index if not exists investor_reminders_contact_idx
  on public.investor_reminders (pipedrive_contact_id, remind_at desc);

alter table public.investor_reminders enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'investor_reminders' and policyname = 'service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.investor_reminders
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'investor_reminders' and policyname = 'owner_read'
  ) then
    execute 'create policy "owner_read" on public.investor_reminders
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;
