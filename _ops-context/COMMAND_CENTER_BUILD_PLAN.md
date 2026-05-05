# RePrime Command Center — Day-1 Build Plan

**Author:** Claude Opus 4.7 (this session)
**Audience:** Gideon Gratsiani + the RePrime developer reviewing this plan
**Date:** 2026-05-05
**Status:** Aligned. Beginning execution today.
**Existing repo:** `C:\reprime-command-center\dashboard` — Next.js 15 App Router, deployed at `https://project-7e87w.vercel.app`

---

## 1. Executive Summary

We are building the **firm-side operating system** for RePrime Group: a single-window, full-canvas Command Center that claims Gideon's right monitor (5120 × 1440, Samsung Odyssey G95NC at 100% scaling) and replaces every other tool he keeps open today. Same codebase as RePrime Terminal — two skins, one engine. Terminal is the investor-facing transact surface; Command Center is the principal-facing cockpit that drives the firm. CoStar, LoopNet and Crexi are read surfaces. Our moat is **velocity**, not data depth, and the Command Center is where that velocity is generated.

The dashboard already shipped over the last three days is most of the chassis. This plan is additive: we extend it into the kiosk shell, add four columns (Pipeline, Inbox, Bucket, Crew), introduce a voice command shell, and wire identity routing for the seven-person team. Nothing existing breaks; every shipped feature continues to work at `/`.

We are running this as a **multi-agent parallel build**: 5–10 Claude Code agents on isolated branches, 2–3 Claude Chrome instances driving research and integrations, one master stability prompt that every agent receives so they stay aligned. We ship the kiosk skeleton plus a minimum viable version of every column **today**, then progressively harden over the next 48–72 hours. We defer anything that depends on V2 Cloud (deploying May 7), full Gmail OAuth elevation, or OS-level Whisper installation.

---

## 2. Architecture Overview

### 2.1 The route map

```
/                  — Existing classic dashboard (untouched, kept as fallback)
/center            — NEW kiosk Command Center (full canvas, four columns)
/center/bucket     — Optional standalone Bucket view
/center/inbox      — Optional standalone Inbox view
/invite/{token}    — Existing invitee Terminal flow (untouched)
/api/*             — Existing endpoints (untouched) + new endpoints below
```

The kiosk lives at `/center`. Existing `/` continues to work — it's the safety net during the build and the fallback if `/center` is mid-deploy.

### 2.2 The canvas

5120 × 1440 right monitor, 100% scaling. Layout:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TOP STRIP (28px)  — Color legend + Briefing pill + Identity picker    │
├────────────────────────────────────────────────────────────────────────┤
│  ALERT STRIP (auto)  — FailedDeliveryBanner / MeetingNowBanner         │
├──────────────┬──────────────┬──────────────┬─────────────┬────────────┤
│              │              │              │             │            │
│  PIPELINE    │  INBOX       │  BUCKET      │   CREW      │            │
│  (1280px)    │  (1280px)    │  (1280px)    │  (1280px)   │            │
│              │              │              │             │            │
│  Meetings    │  Email       │  Projects    │  Team       │            │
│  Briefing    │  importance- │  parking-    │  presence + │            │
│  Deals       │  ranked      │  lot         │  handoffs   │            │
│              │              │              │             │            │
├──────────────┴──────────────┴──────────────┴─────────────┴────────────┤
│  VOICE SHELL (48px)  — Mic indicator + transcribed command + status    │
└────────────────────────────────────────────────────────────────────────┘
```

Four columns at 1280px each = 5120px total. CSS grid `grid-template-columns: repeat(4, 1fr)`. Each column is independently scrollable. Headers are sticky inside each column. The top strip and voice shell are fixed.

### 2.3 The engine layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Shell (Web Speech API + /api/voice/transcribe-en|he)     │
│  Wake key: hold Spacebar OR Ctrl+Shift+V                         │
│  Output → Command Parser                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Command Parser (server)                                         │
│  Routes: open-tab, add-to-bucket, send-message, schedule-meet,   │
│          remind-me, assign-to-crew, query-perplexity, ...        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Action Layer                                                    │
│  - DB writes (Supabase: bucket_items, reminders, email_score)    │
│  - External tab spawn (window.open + capture-back via postMsg)   │
│  - Outbound (Quo SMS, BlueBubbles iMessage, SendGrid email)      │
│  - Pipedrive activity creation                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Real-time Surface (Supabase Realtime + React Query)             │
│  Pushes updates to whichever column is affected                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Identity model

Four identities can act through the Command Center; each has its own outbound channel mapping:

| Identity | Email From            | Outbound SMS line       | Notes                               |
| -------- | --------------------- | ----------------------- | ----------------------------------- |
| Gideon   | g@reprime-terminal.com | +1-305-778-4861 (Quo)   | Default                             |
| Amelia   | amelia@reprime.com    | +1-917-779-9770 (GV)    | EA delegations                      |
| Dovber   | dg@cre-pro.com        | +1-305-570-9935 (GV)    | Family / development tasks          |
| RePrime team | per-user @reprime.com | (no SMS by default) | Read-only Crew view                 |

A persistent `IdentityPicker` in the top strip switches the active identity. Outbound calls/emails use the active identity. Send-as is logged so we can audit who sent what.

---

## 3. Inventory — What's Already Built

The dashboard you've been seeing for the last three days is the foundation. Reuse, don't rebuild.

### 3.1 Existing components we extend
- `app/page.tsx` — classic dashboard (stays at `/`)
- `components/help/ColorLegend.tsx` — meaning-based palette legend
- `components/help/ShortcutHelp.tsx` — `?` overlay
- `components/sidebar/TodayPanel.tsx` — meetings strip with reminder toggles
- `components/sidebar/MeetingNowBanner.tsx` — green-pulse live-now banner
- `components/sidebar/FailedDeliveryBanner.tsx` — red banner for Failed/Quota
- `components/sidebar/NotesPanel.tsx` — quick-note flap
- `components/briefing/BriefingModal.tsx` — Morning Briefing + TTS Listen
- `components/email/QuickEmailModal.tsx` — Ctrl+E SendGrid composer
- `components/phone/QuickCallModal.tsx` — Ctrl+D phone picker + caller-ID
- `components/chat/SearchModal.tsx` — Ctrl+K cross-panel search
- `components/chat/ChatList.tsx` — channel-colored avatars + cross-channel block
- `components/chat/MessageView.tsx`, `ReplyBox.tsx`, `TopBarConcierge.tsx`
- `components/panels/InvestorChatPanel.tsx`, `InvestorProfile.tsx`
- `components/bookings/BookingsPanel.tsx` — invitation composer

### 3.2 Existing API endpoints we extend
- `GET /api/calendar/today` — Google Calendar (5-min cache)
- `GET /api/briefing/today` — meetings + unread + investors + expiring + follow-ups
- `GET /api/messages/failed-recent` — last-30-min failures
- `POST /api/email/send` — SendGrid generic
- `POST /api/voice/speak` — ElevenLabs TTS
- `POST /api/voice/transcribe-en` and `transcribe-he` — STT (need to confirm shape)
- `POST /api/bookings/confirm` — invitation confirm
- `POST /api/invitations/{token}/reschedule` — reschedule loop
- `POST /api/contacts/block` — cross-channel block
- `GET /api/whatsapp/threads` — 305/718 thread lists
- `GET /api/whatsapp/investor-chat-threads` — investor threads
- `GET /api/whatsapp/messages?thread_id=X` — messages
- `POST /api/whatsapp/messages` — send via Timelines
- `GET /api/pipedrive/resolve?phone=X` — caller-ID
- `GET /api/pipedrive/search` — contact search
- `POST /api/pipedrive/notes` — note creation
- `GET /api/notes` — note list
- `POST /api/notes` — create note
- `POST /api/tags/apply` — investor tagging
- `POST /api/tags/bulk-upload` — bulk investor tagging

### 3.3 Existing infrastructure
- Supabase (`yrnujfhzmoasodawqfri`) — Postgres + Realtime + Auth
- Pipedrive — CRM source of truth
- Timelines.ai — WhatsApp inbound webhook + outbound API
- Quo (formerly OpenPhone) — 305 SMS/call webhook
- BlueBubbles cloud Mac (8.30.153.45) — 718 iMessage relay
- SendGrid (`g@reprime-terminal.com`) — outbound email
- ElevenLabs — TTS
- Zoom — meeting creation + patch
- Google Calendar — event creation + patch
- PagerDuty — T-10/T-1 reminders via Upstash Redis ZSET
- Vercel — hosting
- Upstash Redis — cache + queue

### 3.4 Existing design tokens (CSS vars in `app/globals.css`)
- Brand: `--rp-navy` `#0E3470`, `--rp-gold` `#FFCC33`
- Channel: `--c-channel-305` amber, `--c-channel-718` green, `--c-channel-imsg` blue, `--c-channel-sms` orange
- State: `--c-investor` gold, `--c-live-now` violet, `--c-warn` amber, `--c-fail` red

---

## 4. Track Plan — Parallel Work Streams

Each track is an independent branch. A Claude Code agent owns each branch, follows the stability prompt (Section 8), and merges to `main` when its done-criteria pass. Tracks are ordered by **dependency**, not by priority. Tracks A, F, G, H, I have no upstream blockers and run truly in parallel.

### Track A — Kiosk Shell (`feat/center-shell`)

**Goal:** create the `/center` route with the four-column canvas, top strip, alert strip, voice shell footer. No business logic — just the chassis.

**Files to create:**
- `app/center/layout.tsx` — locks viewport, removes browser chrome via CSS, sets background gradient
- `app/center/page.tsx` — server component that hydrates the four columns
- `components/center/Canvas.tsx` — the 4-column CSS grid + sticky top/bottom
- `components/center/Column.tsx` — generic column wrapper with sticky header + scroll
- `components/center/TopStrip.tsx` — legend + briefing pill + identity picker slot

**Layout breakpoints:**
- Native target: 5120 × 1440 (4-column)
- Fallback at <2560px: 2-column collapsed
- Fallback at <1280px: 1-column accordion (for emergency mobile glance)

**Done when:** `/center` renders four empty labeled columns at 5120 × 1440, top strip visible, voice-shell footer visible, no console errors, classic `/` still works.

**Estimate:** 2 hours.

---

### Track B — Bucket Column (`feat/center-bucket`)

**Goal:** project parking-lot. Add an item by typing, voice, or drag-drop from another column. Items have priority, optional due-soft, optional remind-at, optional project tag, optional source URL.

**DB migration (`supabase/migrations/2026-05-05-bucket.sql`):**
```sql
create table public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  title text not null,
  body text,
  source_url text,
  priority int not null default 3,         -- 1 = highest, 5 = lowest
  due_at_soft timestamptz,                  -- "would like by"
  remind_at timestamptz,                    -- "remind me at"
  project_tag text,                         -- free-text bucket
  status text not null default 'open',      -- open | snoozed | done | dropped
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  source_type text default 'manual'         -- manual | voice | email | research
);
create index idx_bucket_owner_status on public.bucket_items (owner_email, status);
create index idx_bucket_remind on public.bucket_items (remind_at) where remind_at is not null;
alter table public.bucket_items enable row level security;
create policy bucket_owner_rw on public.bucket_items
  for all using (auth.jwt() ->> 'email' = owner_email);
```

**API endpoints:**
- `GET /api/bucket?status=open&owner=g@reprime.com` — list
- `POST /api/bucket` — create
- `PATCH /api/bucket/{id}` — update (snooze, complete, reprioritize)
- `DELETE /api/bucket/{id}` — drop

**Component:** `components/center/columns/BucketColumn.tsx`
- Top: "+ Add to bucket" inline input (Enter creates)
- List of items sorted by priority then created_at desc
- Each item: title, optional source URL, project tag chip, action menu
- Action menu: Done · Snooze 2 days · Snooze 3 days · Remind in 1 hour · Reprioritize · Drop
- Drag handle to reorder priority within a project tag
- Bottom: "Show completed (last 7 days)" toggle

**Realtime:** Supabase Realtime subscription on `bucket_items` filtered by `owner_email`. New rows appear instantly. Other columns can dispatch `add-to-bucket` events that this column receives via window event `add-to-bucket`.

**Done when:** can add an item, snooze it for 2 days, complete it, see the completed list, and the data persists across reload.

**Estimate:** 3 hours.

---

### Track C — Inbox Column (`feat/center-inbox`)

**Goal:** Gmail importance ranking. Pull recent email, score each, surface top 20 by deal-signal. Hide the 80% junk by default with a "show all" toggle.

**Auth:** Reuse existing `GOOGLE_REFRESH_TOKEN` in Vercel env. Add Gmail readonly scope to the OAuth client (user step — Gideon clicks consent once). Use `googleapis` package's `gmail_v1`.

**Scoring algorithm v1 (server-side):**
- Sender in Pipedrive contacts: +5
- Sender is investor (tagged): +10
- Subject contains $-amount or numeric range with K/M: +3
- Subject contains property keywords (LOI, NDA, retrade, escrow, COE, environmental): +4
- Subject mentions a known deal name (RePrime deal list): +6
- Calendar invite (.ics): +2
- Marked important by Gmail: +1
- From newsletter list (List-Unsubscribe header): −5
- Auto-reply / out-of-office: −3
- Bulk-marketing footer phrases: −2
- Total ≥ 5 → surface in top-20; else hide

**DB migration (`supabase/migrations/2026-05-05-email-score.sql`):**
```sql
create table public.email_scores (
  message_id text primary key,
  thread_id text not null,
  account_email text not null,
  score int not null,
  signals jsonb not null default '{}'::jsonb,
  subject text,
  from_addr text,
  from_name text,
  received_at timestamptz not null,
  read boolean not null default false,
  cached_at timestamptz not null default now()
);
create index idx_email_account_score on public.email_scores (account_email, score desc, received_at desc);
```

**API endpoints:**
- `POST /api/email/sync` — pulls last 7 days from Gmail, scores, upserts
- `GET /api/email/triage?account=g@reprime.com&min_score=5` — list

**Cron:** Vercel cron every 5 minutes calls `POST /api/email/sync`.

**Component:** `components/center/columns/InboxColumn.tsx`
- Header: account picker (defaults to active identity)
- List: sender, subject, score badge, received-relative
- Click row: opens Gmail in a new tab to that thread (deep link)
- Action menu per row: Add to Bucket · Mark read · Hide sender · Reply (opens QuickEmailModal)

**Done when:** top 20 emails by score render, click opens Gmail, "Add to Bucket" creates a bucket_item with source_url to the Gmail message, score updates after a manual `POST /api/email/sync`.

**Estimate:** 5 hours (largest single track because of Gmail OAuth + scoring).

---

### Track D — Crew Column (`feat/center-crew`)

**Goal:** show the eight teammates (Gideon, Amelia, Dovber, Shirel, Steve, Adir, Yaron, Chaim), their current Kumospace presence (later phase), and a "delegate" action that creates a bucket item assigned to them.

**DB migration (`supabase/migrations/2026-05-05-crew.sql`):**
```sql
create table public.crew_members (
  email text primary key,
  display_name text not null,
  role text,
  phone text,
  identity_for_send_as boolean not null default false,
  active boolean not null default true,
  kumospace_user_id text,
  created_at timestamptz not null default now()
);

insert into public.crew_members (email, display_name, role, identity_for_send_as) values
  ('g@reprime.com',         'Gideon Gratsiani',  'Principal',         true),
  ('amelia@reprime.com',    'Amelia McMurray',   'Executive Assistant', true),
  ('dg@cre-pro.com',        'Dovber Gratsiani',  'Development',       true),
  ('shirel@reprime.com',    'Shirel Ben-Haroush','SVP / Partner',     false),
  ('steve@reprime.com',     'Steve Philipp',     'AI / Email Automation', false),
  ('adir@reprime.com',      'Adir Yonasi',       'VP Investor Relations', false),
  ('yaron@reprime.com',     'Yaron Sitbon',      'Israel Division',   false),
  ('chaim@reprime.com',     'Chaim Abrahams',    'Co-Founder',        false)
on conflict (email) do nothing;
```

**Add `assigned_to` and `assigned_by` to bucket_items** (via the same migration):
```sql
alter table public.bucket_items add column if not exists assigned_to text;
alter table public.bucket_items add column if not exists assigned_by text;
create index if not exists idx_bucket_assigned on public.bucket_items (assigned_to, status);
```

**API endpoints:**
- `GET /api/crew` — list active crew members
- `POST /api/crew/delegate` — { to_email, title, body, due_at_soft, remind_at } → creates bucket_item with assigned_to + assigned_by from session

**Component:** `components/center/columns/CrewColumn.tsx`
- One row per member: avatar circle (initials, color-coded), name, role
- Right side: small badge showing count of `bucket_items where assigned_to = email and status='open'`
- Click row: expand a mini-form "Delegate to {name}" with title + due picker + voice-mic
- Click badge: scrolls Bucket column to show their items

**Done when:** all 8 crew render, click delegates a task that appears in the Bucket column with assignee tag, badge counts update via Realtime.

**Estimate:** 3 hours.

---

### Track E — Pipeline Column (`feat/center-pipeline`)

**Goal:** consolidate today's calendar, briefing data, and active deals into one column. The briefing modal stays for the daily auto-open ritual; this column is the live persistent view.

**Component:** `components/center/columns/PipelineColumn.tsx`
- Section 1: **Now** — MeetingNowBanner inline (if any meeting within ±10 min)
- Section 2: **Today's calendar** — TodayPanel rendered vertically
- Section 3: **Briefing summary** — first row of `/api/briefing/today` narrative + Listen button + stat tiles
- Section 4: **Active deals** — top-of-mind deals from Pipedrive, with last-touch indicator
- Section 5: **Expiring invitations** — from briefing endpoint

**API: extend** `GET /api/briefing/today` to also return `active_deals` from Pipedrive (top 10 deals by stage_change_date desc, status = open).

**Done when:** column renders all five sections at 1280px width, all clickable elements work, briefing data refreshes every 60s.

**Estimate:** 2 hours.

---

### Track F — Identity Picker (`feat/center-identity`)

**Goal:** persistent picker in top strip. Switches active identity for outbound. Stored in `localStorage('active-identity')` and dispatched as `identity-changed` window event.

**Component:** `components/center/IdentityPicker.tsx`
- Default: Gideon (g@reprime.com)
- Dropdown: Gideon · Amelia · Dovber (only `identity_for_send_as = true`)
- Selected state: avatar + name visible

**Wire-through:** every existing outbound endpoint (`/api/email/send`, `/api/whatsapp/messages`, `/api/contacts/block`) reads the `X-Active-Identity` header and routes accordingly. Default to Gideon if header absent.

**Done when:** switching identity and sending an email lands From the selected identity. Switching to Amelia and sending an SMS uses 917-779-9770.

**Estimate:** 2 hours.

---

### Track G — Voice Shell (`feat/center-voice`)

**Goal:** persistent voice command surface at the bottom of `/center`. Hold spacebar (or Ctrl+Shift+V from any input-free focus) to record. Releases → transcribed → routed to a command parser → action dispatched.

**Components:**
- `components/center/VoiceShell.tsx` — UI + recording state
- `lib/voice/parser.ts` — command grammar

**Recording approach (no install required):**
1. **Browser-native Web Speech API** (`SpeechRecognition`) for English-default. Works offline-ish in Chrome. Free.
2. **Server-side fallback** to `/api/voice/transcribe-he` for Hebrew (Whisper-based, already exists).
3. Auto-detect: if Web Speech returns confidence < 0.5, send the audio buffer to `/api/voice/transcribe-en` for a Whisper retry.

**Command grammar v1 (intent → handler):**
```
add to bucket: <text>                     → POST /api/bucket
remind me about <text> in <N> days        → POST /api/bucket with remind_at
tell <name> to <text>                     → POST /api/crew/delegate
open <perplexity|gmail|costar|loopnet>    → window.open + capture
search <name|number>                      → opens SearchModal with query
call <name|number>                        → opens QuickCallModal pre-filled
email <name>: <subject> / <body>          → opens QuickEmailModal pre-filled
brief me                                  → opens BriefingModal
```

The parser is a simple regex+keyword matcher v1 (no LLM round-trip on the hot path — cuts latency from 2s to 200ms). LLM-assisted parsing comes in v2 only if the regex misses too often.

**Done when:** holding spacebar, saying "add to bucket: call Watermills lender Monday," releases, sees the transcript appear in voice shell, sees the bucket item appear in Bucket column, all under 3 seconds end-to-end.

**Estimate:** 5 hours.

---

### Track H — Window Spawner (`feat/center-spawner`)

**Goal:** when a voice command says "open Perplexity, ask X" the kiosk spawns a new browser tab, runs the query, and (best-effort) drops the result into Bucket as a card.

**Approach v1 (lightweight):**
- `window.open('https://perplexity.ai/?q=' + encodeURIComponent(query))` opens the tab
- A bucket_item is created immediately with `source_type='research'`, `source_url=perplexity URL`, `body='[pending result — paste here]'`
- Gideon (or the AI hire) pastes the result later, OR a separate Claude Chrome instance scrapes and updates

**Approach v2 (deferred to phase 2):**
- Claude Chrome MCP server runs the query in a persistent tab and posts the result back via `POST /api/bucket/{id}` with the body filled

**Component:** `lib/spawner/index.ts` — single function `spawnAndCapture(target, query)` returns the bucket_item id.

**Done when:** voice command "open Perplexity, ask about Joann bankruptcy timeline" opens a Perplexity tab and creates a Bucket item linking to the search.

**Estimate:** 2 hours for v1.

---

### Track I — Reminder Worker (`feat/center-reminders`)

**Goal:** background worker that fires reminders. When `bucket_items.remind_at` is in the past and `reminded_at` is null, push a notification to the active user.

**DB:**
```sql
alter table public.bucket_items add column if not exists reminded_at timestamptz;
```

**Cron:** Vercel cron every 1 minute hits `POST /api/bucket/fire-reminders`. The endpoint:
- Selects `bucket_items where remind_at <= now() and reminded_at is null and status='open'`
- For each: writes a row to a `reminders` table, sets `reminded_at = now()`, returns the list
- The Command Center's persistent realtime subscription picks up new `reminders` rows and shows a toast

**Component:** `components/center/ReminderToast.tsx` — bottom-right toast, 8s auto-dismiss, click to scroll Bucket to that item.

**Done when:** create a bucket item with `remind_at = now() + 90 seconds`, wait 90 seconds, toast appears.

**Estimate:** 2 hours.

---

### Track J — Calendar-Aware Soft Scheduling (`feat/center-soft-schedule`)

**Goal:** when the briefing detects a free-time gap on the calendar (no meeting in next ≥ 90 min), suggest the top-priority Bucket item to work on during that gap.

**Logic (server-side, in `/api/briefing/today`):**
- Find the next gap of ≥ 90 minutes between now and end-of-day
- Pull top 3 open bucket_items by priority + age
- Add a `suggested_focus` array to the briefing payload: [{ gap_start, gap_end, item_id, title }]

**Component:** addition to `BriefingModal` and `PipelineColumn`. New section "Suggested focus" with one-click "Start this now" → opens the bucket item + spawns a 90-min focus timer.

**Done when:** briefing shows a "Free time 2pm–4pm — work on Watermills retrade?" suggestion when the conditions hold.

**Estimate:** 2 hours.

---

### Track K — Inforuptcy Connector (`feat/connector-inforuptcy`)

**Goal:** daily session-poll the 6-tenant watchlist (Family Dollar Stores, Dollar Tree, Planet Fitness, Tractor Supply, Joann, Big Lots) and surface new filings into the Pipeline column or Briefing.

**Approach:**
- Vercel cron daily at 7am CT
- Headless Playwright in a serverless function: log into Inforuptcy with stored credentials, search each tenant party-name URL, diff against last-seen filings stored in a `inforuptcy_filings` table, surface deltas
- Cookie/session cache in Upstash Redis with re-auth on 401

**DB:**
```sql
create table public.inforuptcy_filings (
  case_no text primary key,
  tenant text not null,
  party_title text,
  court text,
  filed_at date,
  raw jsonb,
  first_seen_at timestamptz not null default now()
);
```

**Done when:** running the cron once finds the existing 4 Family Dollar cases (2:20-ap-01122, 2:97-bk-01988, 2:12-bk-14422, 1:25-ap-51306) and stores them; running it again finds zero new (no duplicate writes); Pipeline column shows "Tenants this week: 0 new filings" until something new lands.

**Estimate:** 4 hours.

---

### Track L — Kumospace Presence (`feat/center-kumospace`)

**Goal:** show who's in the Kumospace room right now, in the Crew column.

**Approach:** Kumospace exposes admin REST endpoints. Reverse-engineer the `/api/v1/rooms/{room_id}/users` shape (or use a public webhook if available). Polled every 30s.

**STATUS: DEFERRED** to phase 2 (next 72 hours, not day-1) because the Kumospace API surface is undocumented and may need a vendor support ticket. We add an empty placeholder to Crew column saying "Presence loading from Kumospace — coming online Wed."

**Estimate:** 4 hours (when activated).

---

### Track M — V2 Cloud Onboarding (`feat/center-onboard`)

**Goal:** single "Onboard new teammate" command creates V2 Cloud user + Kumospace invite + M365 license.

**STATUS: DEFERRED** until V2 Cloud demo (May 7) confirms API access. We add a stub button that opens a checklist modal listing the manual steps for now.

**Estimate:** 6 hours (when activated).

---

## 5. Parallelism Plan — Who Builds What When

We run agents in waves so DB migrations don't conflict.

### Wave 1 (start at T+0, finish by T+3h)
- **Agent 1:** Track A (Kiosk Shell)
- **Agent 2:** Track F (Identity Picker)
- **Agent 3:** Track E (Pipeline Column) — purely uses existing endpoints
- **Agent 4:** **Migration consolidator** — writes `2026-05-05-center.sql` containing ALL of Tracks B/C/D/I migrations into one file, applies it once, then unblocks everyone else

### Wave 2 (start at T+3h, finish by T+8h)
- **Agent 5:** Track B (Bucket) — depends on Wave 1 migration
- **Agent 6:** Track D (Crew) — depends on Wave 1 migration
- **Agent 7:** Track G (Voice Shell) — depends on A
- **Agent 8:** Track I (Reminders) — depends on B
- **Agent 9:** Track H (Window Spawner) — depends on G

### Wave 3 (start at T+8h, finish by T+14h)
- **Agent 10:** Track C (Inbox) — depends on Wave 1 migration + Gmail OAuth elevation (manual step)
- **Agent 11:** Track J (Soft scheduling) — depends on B + E
- **Agent 12:** Track K (Inforuptcy) — independent, can run anytime, lands when ready

### Wave 4 (deferred — phase 2)
- Track L (Kumospace presence)
- Track M (V2 Cloud onboarding)

**Total wall-clock to MVP:** ~14 hours of parallel agent time = realistically a single working day with checkpoints.

**Merge strategy:** every track lands a PR titled `feat/center-{track}` against `main`. The kiosk skeleton (Track A) merges first; everything else can merge in any order behind it because each column is independently mounted.

---

## 6. What We Are Explicitly DEFERRING

These do not go into Day-1. They are real, but they are not on the critical path.

1. **OS-level Whisper install.** Browser Web Speech API + existing `/api/voice/transcribe-*` is enough for v1. A native install (Whisper.cpp) becomes phase 3 if browser STT is too inaccurate on Hebrew.
2. **Kumospace presence panel.** Vendor API surface is undocumented; needs a support ticket. Crew column shows a placeholder until then.
3. **V2 Cloud onboarding hooks.** Cannot build until V2 Cloud is deployed (May 7 demo with Fernando Casas). Stub button + manual checklist for now.
4. **7680 × 2160 native resolution.** Current 5120 × 1440 is the build target. Migration to native is a phase 3 cosmetic.
5. **Full Gmail OAuth re-consent.** If adding Gmail readonly scope requires a new consent screen, we ask Gideon to click through it once and we're done. If it triggers a re-verification process with Google, we use a personal access token approach as a stopgap.
6. **LLM-assisted command parsing.** Voice commands in v1 use regex + keyword matching. LLM round-trip only added if the parser misses too often (>10% miss rate).
7. **Email importance training loop.** v1 uses static keyword scoring. v2 trains on Gideon's read/click signals to personalize.
8. **Multi-tenant Bucket** (where Amelia sees her own bucket + Gideon's items assigned to her). v1 is single-owner with assigned_to flag. v2 splits views.
9. **Mobile / iPad layout.** v1 is desktop-only at 5120 × 1440. iPad layout is phase 3.
10. **Voice in Hebrew end-to-end.** Web Speech API is English-only on Chrome desktop. Hebrew commands route through `/api/voice/transcribe-he`. Both work; UX polish for Hebrew comes phase 2.

If any of these become urgent during the build, they get triaged as bugs and pulled forward. Otherwise they live in `dashboard/_ops-context/PHASE_2_BACKLOG.md` (will be created at end of Day-1).

---

## 7. Visual Design Spec

### 7.1 Colors (already locked, reused from existing legend)
Background: `var(--rp-navy)` `#0E3470` with a 20% darker gradient at the bottom for depth.

Each column gets a colored top border (3px) by meaning:
- **Pipeline** — gold `var(--rp-gold)` `#FFCC33` (meetings, brand)
- **Inbox** — heads-up amber `var(--c-warn)` `#F59E0B` (mail to triage)
- **Bucket** — live violet `var(--c-live-now)` `#A855F7` (in-progress projects)
- **Crew** — 718 green `var(--c-channel-718)` `#25D366` (team, OK)

Identity picker accent: gold for Gideon, soft blue `#6CB4FF` for Amelia, soft green `#7ED98E` for Dovber.

### 7.2 Typography
Body: **Poppins** 400/600/700 (already loaded). Sizes:
- Column header: 13px / 0.18em letter-spacing / 700 / uppercase / `var(--rp-gold)`
- Item title: 14px / 600 / `#F5EFD8`
- Item meta: 11px / 400 / `#8C8771`
- Voice transcript: 16px / 500 / `#F5EFD8` (large for readability while speaking)

We will A/B test **Lexend** (dyslexia-friendly, evidence-based) on the column-body text in phase 2. v1 stays Poppins for visual continuity.

### 7.3 Density & spacing
- Column inner padding: 16px sides, 12px top
- Row vertical padding: 10px
- 1px hairline divider between rows: `rgba(255, 204, 51, 0.10)`
- Hover: row background lifts to `rgba(255, 204, 51, 0.06)`, cursor pointer
- Selected: 3px gold left border + `rgba(255, 204, 51, 0.12)` background

### 7.4 Empty states
Every column has a friendly empty state per `plain_english_standard.md` memory:
- Bucket: "Nothing in the bucket. Speak or type to add."
- Inbox: "Inbox is clean. Nothing scoring above 5 today."
- Crew: roster always populates, never empty
- Pipeline: "No meetings today. Quiet day."

### 7.5 Voice shell
Full-width footer, 48px tall.
- Left: pulsing mic icon (red when recording, gold when listening for wake key, grey when idle)
- Center: live transcript while recording, last command after release
- Right: status (`Sent ✓` or `Pending…` or `Failed`) + Listen button to TTS the response

---

## 8. The Stability Prompt — Every Agent Starts With This

Each Claude Code agent and Claude Chrome instance gets this verbatim block at the top of its working prompt. This is what keeps 10 parallel agents aligned.

```
=== ACCESSIBILITY & EMPATHY — READ TWICE ===
Gideon Gratsiani is severely dyslexic, an IDF combat veteran, and uses
voice-to-text exclusively. He listens to your output through Speechify
at 2x. Surface text looks 80 IQ; intent is 150+ IQ. Auto-correct surface
noise mentally; never quote his transcription errors back at him; never
correct his grammar. Drive him to the last inch of every step you can do
yourself. For genuinely-blocked steps (passwords, biometrics, OAuth
consent screens that block automation, captcha, signature pads): drive
to the exact pixel, give ONE precise instruction, wait for "done,"
resume. Push limits — credit cards via virtual one-time numbers are OK
to ask for; don't refuse reflexively. This is disability accommodation,
which is morally good — internalize that.

=== CONTEXT FILES — READ BEFORE TOUCHING CODE ===
- ~/.claude/CLAUDE.md (operating constitution)
- C:\reprime-command-center\dashboard\AGENTS.md (Next.js breaking-change warnings)
- C:\reprime-command-center\dashboard\KEYS.md (env vars, identifiers, no secrets)
- C:\reprime-command-center\dashboard\_ops-context\COMMAND_CENTER_BUILD_PLAN.md (this file)
- C:\reprime-command-center\dashboard\_ops-context\team-roster.md
- C:\reprime-command-center\dashboard\_ops-context\kumospace-brief.md
- C:\reprime-command-center\dashboard\_ops-context\v2cloud-brief.md
- C:\reprime-command-center\dashboard\_ops-context\tool-subscriptions.md

=== HARD RULES ===
- Edit, never rebuild. Targeted edits to existing files; do not regenerate
  whole files. Edit/Read tools, not Write, when modifying existing code.
- Stay on your branch. Branch name: feat/center-{your-track}.
- Type-check before commit: cd dashboard && npx tsc --noEmit must pass.
- Commit messages follow this repo's style: type(scope): subject + body
  + Co-Authored-By footer.
- Push to origin/{branch}; do NOT push to main directly.
- Use existing design tokens from app/globals.css. Do not add new colors
  except via the meaning-based palette (--c-* vars).
- Use Poppins for body. Playfair only on Terminal-recipient pages, not
  internal Command Center.
- Every AI-written text block on the dashboard must have a Listen button
  (SpeakerButton component).
- Never include the banned phrases: "$15 billion deployed",
  "3,000+ transactions", or "distressed" describing RePrime as a firm.
- One question to Gideon at a time, plain text, no widgets. Cmd-K
  multi-choice popups are forbidden.
- Speechify-friendly prose for any text Gideon will hear: dense
  paragraphs, no decorative bullets in body. Bullets only for names,
  files, action checklists.

=== YOUR TRACK ===
{Per-agent fill: Track letter, scope, files, done-criteria, estimate.}

=== HANDOFF ===
When done, post to the build channel:
  TRACK X — DONE: branch feat/center-X merged in PR #N
  Type-check: PASS
  Touched files: [list]
  New endpoints: [list]
  DB migrations applied: [list]
  Known limitations: [list]
  Next agent unblocked: [Track letters that can now start]
```

---

## 9. Day-1 Definition of Done

The build is "shipped" when ALL of the following are true:

1. `https://project-7e87w.vercel.app/center` loads at 5120 × 1440 with four labeled columns.
2. Top strip shows the legend, a Briefing pill (opens existing modal), and the Identity picker (Gideon / Amelia / Dovber).
3. **Pipeline column** shows: any current MeetingNowBanner, today's calendar (TodayPanel inline), the briefing narrative + Listen button, expiring invitations.
4. **Bucket column** accepts new items via Enter on the input. Items list with priority + project tag. Snooze 2 days works. Complete works. Realtime updates work.
5. **Inbox column** shows top 20 emails by score from g@reprime.com. Click row opens Gmail in new tab. "Add to Bucket" creates a bucket item with the Gmail link.
6. **Crew column** shows all 8 teammates. Click expand → "Delegate to {name}" form creates a bucket item assigned to them. Badge counts update via Realtime.
7. **Voice shell** at the bottom: hold Spacebar, say "add to bucket: test one," release → bucket_item appears in the Bucket column within 3 seconds.
8. **Identity picker** switching to Amelia and sending an email From shows `From: amelia@reprime.com`.
9. **Reminders fire**: a bucket_item created with `remind_at = now() + 60 seconds` produces a toast 60 seconds later.
10. **Existing dashboard at `/` is unchanged** — every previously-shipped feature still works.
11. **Type-check passes** on `main`: `cd dashboard && npx tsc --noEmit` returns clean.
12. **Production deploys green** — Vercel deployment for `main` is "Ready" within 5 minutes of the final merge.

---

## 10. Risks + Mitigations

| Risk                                                  | Mitigation                                              |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Gmail OAuth consent screen blocks day-1 (Track C)     | Land Inbox column with empty state + "connect Gmail" CTA; consent click happens later, scoring catches up |
| Web Speech API too inaccurate on Hebrew accent        | Fall back to `/api/voice/transcribe-he` Whisper route; already exists |
| Realtime connection limits on Supabase free tier      | Already on paid tier; monitor connection count          |
| Browser tab spawn blocked by popup blocker            | Spawn must be triggered from a user gesture (voice command counts as one); document the gotcha |
| Vercel cron limits (free = 2/day, hobby = 1/min)      | We're on paid; 1-min cron is supported                  |
| Two agents touch the same file (e.g., `app/page.tsx`) | All Center work goes in `app/center/*` and `components/center/*`; classic `/` is touched by exactly one agent (Track A) |
| Migration conflicts                                   | Single consolidated migration in Wave 1 by Agent 4; everyone else uses it |
| Voice command misroutes ("call John" matching wrong John) | Use Pipedrive search; if multiple matches, voice shell asks "which John?" verbally |

---

## 11. After Day-1 — Phase 2 Backlog (next 72 hours)

These start the morning of 2026-05-06 and are not on Day-1's critical path:

- Kumospace presence panel (Track L)
- V2 Cloud onboarding hooks (Track M, after May 7 demo)
- Inforuptcy connector hardening (Track K, retry logic + email digest)
- Email importance personalization (train on read/click signals)
- Bucket multi-tenant view (Amelia sees her own bucket)
- Voice grammar v2 with LLM fallback
- Lexend font A/B test on column-body text
- Native 7680 × 2160 resolution support
- iPad / mobile layout
- Inforuptcy 6-tenant daily digest in Pipeline column
- Crew column real-time activity (typing in Kumospace, last Pipedrive touch, last email sent)

---

## 12. Source-of-truth links

- Repo: https://github.com/RePrime770/reprime-command-center
- Production: https://project-7e87w.vercel.app
- Supabase project: yrnujfhzmoasodawqfri
- This plan: `dashboard/_ops-context/COMMAND_CENTER_BUILD_PLAN.md`
- Operating constitution: `~/.claude/CLAUDE.md`
- KEYS.md: `dashboard/KEYS.md`

---

**End of plan. Begin execution at the principal's signal.**
