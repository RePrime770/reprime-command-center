# DATABASE_AUDIT.md

Schema-vs-code audit for `reprime-command-center`. Compares applied SQL
migrations against every `.from('…')` call in `app/` and `lib/`. Generated
2026-06-29. Public repo — no secrets included.

## Sources of truth scanned

- `supabase/migrations/2026-05-05-center.sql` — Wave-1 bucket/email_scores/crew/reminders/roster seed.
- `supabase/migrations/2026-05-05-inforuptcy.sql` — `inforuptcy_filings`.
- `supabase/migrations/2026-05-05-perf-bucket.sql` — composite index only.
- `supabase/migrations/2026-05-05-secretary.sql` — `outbound_asks`.
- `supabase/migrations/2026-05-06-whatsapp-is-blocked.sql` — `whatsapp_threads.is_blocked` ALTER + `blocked_contacts` CREATE.
- `supabase/migrations/2026-06-22-nora-chat.sql` — `nora_chat_messages`.
- `supabase/migrations/2026-06-23-whatsapp-threads-lane-override.sql` — `lane_override` ALTER (flagged not auto-applied; DB password rotated).
- `supabase/investor_reminders_migration.sql` — standalone, run-once.
- `supabase/overnight_migration.sql` — standalone, partly superseded.
- `supabase/phone_calls_migration.sql` — standalone, run-once.

Code queries enumerated with:

```
grep -rohE "\.from\('[a-z_]+'\)" --include="*.ts" app/ lib/ | sort -u
```

25 distinct table names referenced (storage `from('attachments')` excluded — it
is the Supabase Storage bucket call, not a Postgres table).

## Tables defined in migrations

| Table | Migration file | PK | Key columns | RLS | Realtime | Notes |
|---|---|---|---|---|---|---|
| `bucket_items` | 2026-05-05-center.sql | `id` uuid | title, status, priority, due_at, assigned_to | yes | yes | Backed by composite index from 2026-05-05-perf-bucket. |
| `email_scores` | 2026-05-05-center.sql | `id` uuid | message_id (unique), thread_id, score, reasons | yes | no | |
| `crew_members` | 2026-05-05-center.sql | `email` text | display_name, role, phone, is_principal | yes | no | Seeded with 6 roster rows. |
| `reminders` | 2026-05-05-center.sql | `id` uuid | bucket_item_id (FK), fire_at, fired_at | yes | yes | Subscribed by ReminderToast. |
| `inforuptcy_filings` | 2026-05-05-inforuptcy.sql | `case_no` text | tenant, court, filed_at, first_seen_at | yes | yes | |
| `outbound_asks` | 2026-05-05-secretary.sql | `id` uuid | sender_identity, channel, status, expected_reply_by | yes (gideon_read) | yes | |
| `whatsapp_threads` | partial — only `is_blocked` + `lane_override` ALTERs in tree | (n/a — base table predates repo) | panel, phone, channel_type, timelines_chat_id, is_priority, is_blocked, lane_override | unknown | likely | **Base CREATE TABLE not in this repo.** Schema drift risk — see below. |
| `blocked_contacts` | 2026-05-06-whatsapp-is-blocked.sql | `id` uuid | pipedrive_contact_id, phone, email, unblocked_at | yes | no | |
| `nora_chat_messages` | 2026-06-22-nora-chat.sql | `id` uuid | role, content, language, user_email | yes (gideon_read) | no | |

## Tables defined only in standalone supabase/*.sql

These live outside `supabase/migrations/` and may or may not have been applied.
Treat as second-class until they are folded into the migrations folder.

| Table | File | Notes |
|---|---|---|
| `investor_reminders` | investor_reminders_migration.sql | Queried by `/api/investors/reminder`. |
| `contact_directory` | overnight_migration.sql | Queried by `/api/pipedrive/bulk-import` and `lib/contact-directory/client.ts`. |
| `phone_calls` | phone_calls_migration.sql | Queried by Quo/BB phone webhooks. |
| `blocked_contacts` | overnight_migration.sql | **Duplicate** of the migration-folder definition — same shape, idempotent. |

## Tables queried but NOT defined in any migration

The critical section. These tables are referenced from production routes but
no `CREATE TABLE` statement exists anywhere in `supabase/`. They were either
created out-of-band in the Supabase dashboard, or the routes have been broken
since they were merged. Each row below shows the recovery `CREATE TABLE` that
ships in `supabase/migrations/2026-06-29-schema-drift-recovery.sql`.

| Table | Code sites | Priority | Columns inferred from queries |
|---|---|---|---|
| `invitations` | 44 | HIGH | id, contact_pipedrive_id, contact_first_name, contact_email, contact_phone, status, confirmed_slot_iso, view_count, first_opened_at, first_video_at, meeting_status, proposed_slots, email_audit_flag, created_at |
| `roster` | 40 | HIGH | source_row, name, phone, email, board_stage, awaiting_us, last_from, last_reply_text, last_reply_at, thread_json, followup_note, remind_at, alerted_at, verified_at, email_audit_flag, email_audit_note, updated_at |
| `whatsapp_threads` | 38 | HIGH | id, panel, phone, channel_type, contact_name, timelines_chat_id, is_group, is_priority, is_blocked, lane_override, last_message_at, updated_at, created_at (base table missing — only ALTERs in tree) |
| `whatsapp_messages` | 17 | HIGH | id, thread_id, timelines_uid (unique), panel, body, media_url, media_type, direction, status, ts_iso, contact_phone, created_at |
| `thread_tags` | 7 | MEDIUM | thread_id, tag_id, created_at — PK (thread_id, tag_id) |
| `approvals` | 5 | MEDIUM | id, source_row, contact_name, channel, their_text, their_es, draft_es, draft_he, worked_by, status, decided_at, created_at |
| `gmail_watch_state` | 5 | MEDIUM | email (PK), history_id, expiration, updated_at |
| `notes` | 4 | LOW | id, title, body, is_pinned, created_at, updated_at |
| `tags` | 2 | LOW | id, name (unique), color, is_investor, created_at |
| `tr_cache` | 2 | LOW | src_hash (PK), es, created_at |
| `zoom_events` | 1 | LOW | id, event, payload, created_at |
| `meeting_summaries` | 1 | LOW | id, pipedrive_contact_id, payload, created_at |
| `roster_emails` | 1 | LOW | id, email, source_row, created_at |

Counts include both reads and writes. `whatsapp_threads` is technically a
hybrid: only two `ALTER TABLE` statements are in tree, the base CREATE has
never been versioned. The recovery migration emits an `IF NOT EXISTS` create
so live data is preserved.

## Migration application status

- **`2026-06-23-whatsapp-threads-lane-override.sql`** — flagged in the file's
  own header: _"It could not be auto-applied from the build machine because
  the documented direct-connection DB passwords were rotated."_ Gideon-only
  blocked action: run via Supabase Dashboard → SQL editor, or `supabase db
  push` with refreshed credentials.
- **`supabase/investor_reminders_migration.sql`**, **`overnight_migration.sql`**,
  **`phone_calls_migration.sql`** — not in `migrations/`. Status unknown; the
  routes that depend on them work in production, so they were most likely
  applied manually, but they are not under migration version control.
  Recommend folding them in.
- **`2026-06-29-schema-drift-recovery.sql`** (new in this audit) — Gideon-only:
  apply via dashboard or `supabase db push` after the lane-override migration
  lands.

## RLS posture

RLS enabled on every migration-defined table. Policies fall into three shapes:

- `service_role_all` — present on every table. Grants ALL for `auth.role() = 'service_role'`.
- `authenticated_read` — present on `bucket_items`, `email_scores`, `crew_members`, `reminders`, `inforuptcy_filings`, `contact_directory`, `phone_calls`. Allows SELECT for any signed-in user.
- `gideon_read` — present on `outbound_asks`, `nora_chat_messages`. Restricts SELECT to `(auth.jwt() ->> 'email') = 'g@reprime.com'`.

**Tables with no SELECT policy (= service-role only):** `blocked_contacts`. By
design — block ledger should be invisible to the client.

**Tables with effectively no RLS policy because they are absent from the
schema files entirely:** every table in "Tables queried but NOT defined"
above. Their RLS state is whatever was set when they were created in the
dashboard — we cannot audit it from the repo. The recovery migration enables
RLS and adds `service_role_all` + a sensible read policy on every table it
creates.

## Realtime subscriptions

Subscriptions found by grepping `components/` for `.channel(` and
`postgres_changes`:

| Table | Component | Event filter |
|---|---|---|
| `reminders` | components/center/ReminderToast.tsx | UPDATE |
| `bucket_items` | components/center/columns/BucketColumn.tsx | * |
| `bucket_items` | components/center/columns/CrewColumn.tsx | * (filtered by assigned_to) |
| `thread_tags` | components/chat/TagChips.tsx | * (filtered by thread_id) |
| `whatsapp_messages` | components/panels/InvestorChatPanel.tsx | INSERT |
| `thread_tags` | components/panels/InvestorChatPanel.tsx | INSERT |

`reminders` and `bucket_items` are explicitly added to `supabase_realtime`
publication in 2026-05-05-center.sql. `inforuptcy_filings` and `outbound_asks`
are added by their respective migrations but **no UI subscription consumes
them today** — wiring opportunity.

`whatsapp_messages` and `thread_tags` are subscribed by the UI but, because
the base CREATE for these tables is not in tree, we cannot confirm they were
added to the `supabase_realtime` publication. The recovery migration adds
both explicitly with safe `DO $$ … exception when duplicate_object then null`
blocks.

## Service-role usage

`createServiceClient()` is the elevated client that bypasses RLS. It should
be used only on the server, and only where a user-session client would not
work. Audit of every call site:

**Justified (cron / webhook / unauthenticated public endpoint):**
- `/api/cron/*` (inforuptcy-poll, center-drain, gmail-watch-arm, center-watch, email-watch, meeting-verify, investor-cadence, slack-digest) — cron, no user session.
- `/api/whatsapp/webhook`, `/api/phone/bb-webhook`, `/api/phone/quo-webhook`, `/api/center/gmail-push`, `/api/zoom/webhook`, `/api/zoom/ai-companion-ingest`, `/v/[token]`, `/api/invitations/[token]/calendar.ics`, `/api/invitations/[token]/reschedule`, `/api/bookings/confirm` — public webhooks/tokenized invite URLs, no Gideon JWT.
- `/api/center/voice-process` — internal callback from Whisper pipeline.

**Probably-justified (single-tenant single-user app — Gideon is the only authenticated user):**
- `/api/nora/*`, `/api/secretary/*`, `/api/center/*` (excluding gmail-push), `/api/bookings/*`, `/api/notes`, `/api/crew/*`, `/api/contacts/*`, `/api/bucket/*`, `/api/tags/*`, `/api/briefing/*`, `/api/email/*`, `/api/whatsapp/messages`, `/api/whatsapp/threads`, `/api/investors/*`, `/api/messages/failed-recent`, `/api/pipedrive/*` — all currently service-role even though a logged-in user session is present. Functionally fine because RLS would grant the same access, but in a multi-user world these should use the user-session client so RLS audits work.

**Tightening opportunity:** when the app moves beyond single-user, any
`/api/center/*` and `/api/whatsapp/*` route that already runs `authorize()`
to gate the request can drop service-role and use the user-session client
so RLS becomes the single source of truth on permissions.

## Migration written

**File:** `supabase/migrations/2026-06-29-schema-drift-recovery.sql`

Contains `CREATE TABLE IF NOT EXISTS` for every table in the "Queried but not
defined" list. Every column uses safe defaults — `text` where the exact type
is unclear (annotated with comments), `timestamptz` for any `*_at`/`*_iso`
timestamp, `jsonb` for `thread_json`/`proposed_slots`/`payload`, `boolean`
for `is_*` flags, `integer` for explicit ID columns. RLS is enabled on every
new table with `service_role_all` plus a read policy appropriate to the data
(authenticated read where the cockpit needs to query directly; service-role
only where the data is webhook-only). Indexes added for the hottest query
shapes (timelines_uid, phone, thread_id, status). Realtime publication
additions for `whatsapp_messages` and `thread_tags`, both of which already
have UI subscriptions.

The file is `IF NOT EXISTS` throughout, so applying it against a Supabase
project that already has these tables created in the dashboard is a no-op.
**Gideon-only action**: apply via Dashboard → SQL editor (or `supabase db
push` once credentials are restored).

## Highest-priority fixes

| # | Action | File / table | Risk if not done |
|---|---|---|---|
| 1 | Apply `2026-06-29-schema-drift-recovery.sql` | new migration | Any new Supabase project bootstrapped from this repo cannot run — 12 routes hit missing tables. |
| 2 | Apply `2026-06-23-whatsapp-threads-lane-override.sql` | whatsapp_threads | Lane override UI silently no-ops; chats can't be moved between Investor/Staff. |
| 3 | Verify RLS posture on dashboard-created tables | whatsapp_threads, whatsapp_messages, invitations, roster | Unknown RLS state — possibly wide-open SELECT to any signed-in user. |
| 4 | Fold standalone `supabase/*.sql` into `migrations/` | investor_reminders_migration.sql, overnight_migration.sql, phone_calls_migration.sql | Loss of version control; impossible to rebuild project from clean. |
| 5 | Add `whatsapp_messages` + `thread_tags` to `supabase_realtime` publication | (in new migration) | UI subscriptions in InvestorChatPanel + TagChips silently never fire on remote projects. |
| 6 | Tighten service-role usage on user-gated routes | /api/center/*, /api/whatsapp/* | When app goes multi-user, RLS will be bypassed silently. |
| 7 | Add `authenticated_read` policy to `whatsapp_threads`/`whatsapp_messages` if missing | RLS audit | Cockpit Realtime subscribes via the anon key path — needs SELECT. |
| 8 | Document base-table schema for `whatsapp_threads` and `whatsapp_messages` in repo | docs/SCHEMA.md (future) | New devs cannot understand the model without dashboard access. |
| 9 | Add `unique(timelines_uid)` enforcement check on `whatsapp_messages` | upsert path | Webhook upserts use `onConflict: 'timelines_uid'`; without the unique constraint they silently dup. Recovery migration adds it. |
| 10 | Add `unique(panel,phone,channel_type)` on `whatsapp_threads` | webhook upsert | Same as above for thread upserts. Recovery migration adds it. |
