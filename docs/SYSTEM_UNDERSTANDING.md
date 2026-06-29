# SYSTEM_UNDERSTANDING.md

**Project:** RePrime Command Center (Terminal by RePrime)
**Audit date:** 2026-06-29
**Auditor:** Claude (Opus 4.7)
**Scope:** Single-tenant CRE operations cockpit for Gideon Gratsiani / RePrime

This document is the factual baseline for the repair pass. It is descriptive, not prescriptive — what *exists*, not what *should* exist. Every fact below was derived by reading the actual source on `main` (HEAD = `ad089bd`), not assumed.

---

## 1. Framework + Runtime

| Item | Value |
|---|---|
| Framework | Next.js **16.2.4** (App Router) |
| React | 19.2.4 |
| TypeScript | ^5, strict, ES2017 target, `moduleResolution: bundler`, path alias `@/*` → repo root |
| Build | **Turbopack default**. Local `next build` fails on darwin-arm64 (missing `@next/swc-darwin-arm64` native binding) — must use `next build --webpack` for local verification. Vercel builds Turbopack-native fine. |
| Middleware | Renamed to **`proxy.ts`** in Next 16 (no more `middleware.ts`). |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss`. |
| Deploy | Vercel auto-deploy on push to `main`. Project: `project-7e87w.vercel.app`. |
| Sentry | `@sentry/nextjs` ^10.51.0, wrapped via `withSentryConfig`. |
| Tests | Vitest 2.1.9. **Only 4 test files** total (`lib/bucket/cache.test.ts`, `lib/voice/parser.test.ts`, `lib/scoring/email.test.ts`, `lib/scoring/investor-cadence.test.ts`). 786 LOC. Single-digit coverage. |

---

## 2. Top-Level Directory Layout

| Dir | Purpose |
|---|---|
| `app/` | App Router — every `page.tsx` is a route, every `route.ts` is an API endpoint |
| `components/` | Client React components (most non-trivial UI lives here, including the cockpit) |
| `lib/` | Server-side service/adapter layer — third-party clients, scoring, voice parser |
| `hooks/` | Custom React hooks (small) |
| `legacy/` | Pre-cockpit dashboard kept for the `/legacy` route |
| `public/` | Static assets, fonts, `center.html` standalone outreach kiosk |
| `scripts/` | Node CLI: smoke tests, seeds, repair utilities |
| `docs/` | Documentation — this audit + `FIX_AUDIT.md` (gitignored) |
| `_ops-context/` | Operational handoff prose (not code) |
| `_terminal-design-reference/` | Design exploration files |
| `claude-extension/`, `setup-extension/` | Companion Chrome extension source |
| `supabase/` | DB migrations + Supabase config |

---

## 3. App Router Routes

### Pages (with `page.tsx`)
- `/` — root redirect
- `/login` — Supabase auth entry (used by both OAuth and code login)
- `/auth/callback` — Supabase OAuth callback
- **`/cockpit`** — the main kiosk dashboard (single page; everything lives inside via client components)
- `/compose` — email/message composer
- `/center`, `/center/v2` — standalone outreach tool (also reachable via `/outreach` rewrite → `/center.html`)
- `/invite/[token]` + `/choose`, `/calendar`, `/confirm` — recipient-facing booking flow
- `/legacy` — legacy UI
- `/v/[token]` — video watch tracking redirect

### API routes
**98 routes**, full inventory in §6. By domain:

| Domain | Count |
|---|---|
| Auth | 1 |
| AI / Nora | 7 |
| Calendar / Zoom / Religious | 11 |
| Email (Gmail + SendGrid) | 11 |
| Comms (WhatsApp / SMS / voice) | 17 |
| Contacts | 4 |
| Notes / Bucket / Followups | 6 |
| Invitations / Bookings | 8 |
| Deals / Investors / Pipedrive | 14 |
| Tags / Crew / Center admin | 7 |
| Center exports / cron | 8 |
| Diagnostics / Health | 3 |
| **TOTAL** | **97** + 1 webhook bucket |

---

## 4. Middleware / Auth (`proxy.ts`)

**Single allowed user:** `user.email === 'g@reprime.com'`. All other authenticated users get redirected to `/login`.

**Session source:** Supabase SSR session via `_createServerClient`, cookies propagated on response.

**Public allowlist (47 paths)** — bypass session check:
- `/login`, `/auth/callback`, `/invite/*`, `/v/*` (recipient flows)
- `/api/auth/code` — REPRIME access-code → Supabase session mint (constant-time compare)
- External provider webhooks: `/api/whatsapp/webhook`, `/api/phone/*-webhook`, `/api/zoom/webhook`
- Public booking endpoints: `/api/bookings/available-slots`, `/api/bookings/confirm`
- `/api/invitations` — extension mint via `X-Captain-Token` header
- `/api/cron/*`, `/api/email/sync` — Vercel cron via `CRON_SECRET` bearer (validated inside each route)
- `/api/health` — read-only env + DB ping
- `/outreach`, `/center.html`, `/api/center/*` — gated separately by `x-center-pass` header

**Protected overrides** (force session even though path-prefix would otherwise be public): `/api/invitations/by-contact` (closed after prior session's audit found public exposure of a contact-id PII endpoint).

**No CSRF tokens.** No double-submit. No origin checks. The single-user kiosk model makes CSRF risk lower but not zero — webhooks and the access-code route are the most attractive targets and are individually hardened (constant-time comparison, raw-header signature validation on the OpenPhone webhook).

---

## 5. State Management

- **React Query** (`@tanstack/react-query` ^5.100.6) — `QueryClientProvider` in `components/Providers.tsx`; defaults `staleTime: 30s`, `refetchOnWindowFocus: false`.
- **CockpitLiveDataProvider** (`components/cockpit/live/CockpitLiveData.jsx`) — the cockpit's own context: fetches threads/calendar/email/brief/noraDesk client-side and exposes them via `useLiveData()`. EMPTY values on first SSR paint.
- **LocaleProvider** (`components/cockpit/lib/i18n.jsx`) — EN/HE language toggle, localStorage-persisted, text-only (no RTL flip).
- No Redux / Zustand / Jotai. Local state in components where appropriate.

---

## 6. Integration Adapter Layer (`lib/`)

| Module | Purpose | Health/setup pattern |
|---|---|---|
| `lib/google/` | Gmail + Calendar + Sheets OAuth client | Reads `GOOGLE_OAUTH_CLIENT_ID/SECRET` + `GOOGLE_REFRESH_TOKEN` (+ `_2` for second account). No `getStatus()`. |
| `lib/anthropic/` (implicit via `@anthropic-ai/sdk`) | Claude calls | Direct SDK use in routes; no shared adapter. |
| `lib/openai/` (implicit) | GPT models — currently only `whisper-1` for STT | Direct SDK use. |
| `lib/supabase/` | `createClient()` (browser, anon) + `createServiceClient()` (server, service-role) | Throws on missing client keys in browser init. |
| `lib/redis/` (Upstash REST) | Caching, dedup, queues | Returns `null` client when env missing (graceful — bucket/inforuptcy/timelines all check for this). |
| `lib/zoom/` | OAuth account-credentials, createMeeting, getMeeting, attendance | **Throws** on missing creds. No `getStatus()`. |
| `lib/pipedrive/` | CRM: persons, deals, notes | **Throws** on missing token. No `getStatus()`. |
| `lib/sendgrid/` | Transactional email | **Throws** on missing key. |
| `lib/slack/` | Webhook posts | **Graceful** — returns `{ sent: false, reason: 'no_webhook' }`. |
| `lib/pagerduty/` | Incident events | **Throws** on missing key. |
| `lib/timelines/` | WhatsApp threads + send (Timelines.ai bridge) | **Throws** on missing key. |
| `lib/whatsapp/` | Template rendering | Pure functions, no env. |
| `lib/contact-directory/` | Caller-ID lookups | Graceful: catches table-not-found Supabase errors. |
| `lib/inforuptcy/` | Bankruptcy watchlist (Playwright headless) | **Throws** on missing creds. |
| `lib/bucket/` | Bucket-item cache | Graceful Redis null. |
| `lib/enrich/` | Apollo (or stub) for contact enrichment | Conditional init. |
| `lib/voice/` | Local intent parser (regex only, no I/O) | N/A. |
| `lib/zmanim/` | Hebcal REST + Redis cache for Postville candle/havdalah | Reads `ZMANIM_ZIP`. |
| `lib/scoring/` | Email + investor-cadence heuristics | Pure math. |
| `lib/secretary/` | Outbound-ask tracker writes | Supabase dependency. |
| `lib/openphone/` (in routes) | SMS send (no dedicated lib dir; logic in `app/api/phone/quo-send/route.ts`) | Direct fetch in route, raw-key auth, E.164 enforced. |

**Adapter consistency gaps** (collected for STEP 7):
1. No uniform `AdapterStatus { ok, error }` interface — every adapter signals "config missing" differently (throw vs return).
2. `/api/health` checks env presence but doesn't expose a per-integration status to the cockpit UI — so no panel can render a clean "setup required" state from a single source of truth.
3. No adapter registry mapping `integrationName → adapter → status fn`.
4. `lib/openphone/` doesn't exist as a directory — SMS adapter is inlined in the route. Should be lifted.

---

## 7. Database (Supabase)

**Migrations in `supabase/migrations/`:**

| File | Purpose |
|---|---|
| `2026-05-05-center.sql` | `bucket_items`, `email_scores`, `crew_members` (6-person roster seed), `reminders` |
| `2026-05-05-inforuptcy.sql` | `inforuptcy_filings` (6-tenant bankruptcy watchlist) |
| `2026-05-05-perf-bucket.sql` | Composite index on `bucket_items(status, priority, created_at)` |
| `2026-05-05-secretary.sql` | `outbound_asks` (Gideon-sent message tracker with expected-reply deadline) |
| `2026-05-06-whatsapp-is-blocked.sql` | `is_blocked` column on `whatsapp_threads` + `blocked_contacts` ledger |
| `2026-06-22-nora-chat.sql` | `nora_chat_messages` (user/assistant history) |
| `2026-06-23-whatsapp-threads-lane-override.sql` | Manual lane override (investor/staff/general) — **flagged as not auto-applied (DB password rotation); must run manually in Supabase SQL editor.** |

**Root-level standalone SQL** (run-once in SQL editor):
- `overnight_migration.sql` — duplicate blocking + `contact_directory` (caller-ID phonebook from xlsx import)
- `phone_calls_migration.sql` — `phone_calls` (both panels: Quo/305 + BlueBubbles/718)
- `investor_reminders_migration.sql` — `investor_reminders` (briefing-surfaced scheduled reminders)

**Tables referenced in code but with no migration file in repo** (likely created by hand or in a pre-repo schema dump):
- `whatsapp_threads`, `whatsapp_messages` — heavily queried (38 + 17 calls)
- `invitations` — 38 query sites (booking state machine)
- `roster` — 36 query sites (overlaps with `crew_members`?)
- `thread_tags`, `approvals`, `gmail_watch_state`

**RLS:** Every migration enables RLS. Two policy patterns:
- `service_role_all` — full CRUD for server-side (cron, webhook, service-client routes)
- `authenticated_read` — SELECT for signed-in users (RLS-gated)
- `gideon_read` (Nora messages, outbound_asks) — `(auth.jwt() ->> 'email') = 'g@reprime.com'`

**Service-role usage** (bypasses RLS):
- `/api/nora/chat`, `/api/nora/history`
- `/api/bookings/confirm`
- `/api/secretary/asks`, `/api/secretary/poll-overdue`
- Every cron + webhook route

**Top 10 most-queried tables** (call sites in `app/api/`):
1. `whatsapp_threads` — 38
2. `invitations` — 38
3. `roster` — 36
4. `whatsapp_messages` — 17
5. `outbound_asks` — 11
6. `bucket_items` — 11
7. `thread_tags` — 7
8. `reminders` — 5
9. `inforuptcy_filings` — 5
10. `gmail_watch_state` — 5

**Realtime subscribed:** `bucket_items`, `reminders`, `inforuptcy_filings`, `outbound_asks` (cockpit kiosk subscribes via Supabase Realtime).

---

## 8. Environment Variables — 49 unique

**Client-side exposed (4):**
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`

**Server-only (45)**, grouped by integration. Full table in `ENVIRONMENT_AUDIT.md` (next doc). Key ones:

- **Supabase** — `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (server copy)
- **Anthropic** — `ANTHROPIC_API_KEY` (8 files)
- **OpenAI** — `OPENAI_API_KEY` (Whisper STT)
- **Groq** — `GROQ_API_KEY` (Hebrew STT — **flagged missing on Vercel**)
- **Google** — `GOOGLE_OAUTH_CLIENT_ID/SECRET`, plus legacy `GOOGLE_CLIENT_ID/SECRET` (dual names, code reads both — STEP 7 cleanup), `GOOGLE_REFRESH_TOKEN`, `GMAIL_PUSH_AUDIENCE`, `SHEETS_OUTREACH_TAB`
- **Upstash Redis** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (21 files)
- **Zoom** — `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN` (**flagged missing**), `STATIC_ZOOM_FALLBACK_URL`
- **SendGrid** — `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (**flagged missing**), `SENDGRID_FROM_NAME`
- **Quo (OpenPhone SMS)** — `QUO_API_KEY`, `QUO_SEND_FROM`, `QUO_WEBHOOK_SECRET`(S)
- **Pipedrive** — `PIPEDRIVE_API_TOKEN`
- **Timelines** — `TIMELINES_API_KEY`
- **ElevenLabs** — `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **Apollo** — `APOLLO_API_KEY`
- **Slack** — `SLACK_WEBHOOK_URL`
- **PagerDuty** — `PAGERDUTY_ROUTING_KEY`
- **BlueBubbles** — `BLUEBUBBLES_WEBHOOK_SECRET`
- **Captain (extension)** — `CAPTAIN_API_TOKEN`
- **Internal** — `CRON_SECRET` (11 routes), `AUTH_ACCESS_CODE` (**flagged missing**), `CENTER_ALERT_CHAT_ID`, `CENTER_PASSWORD`, `CHROME_PATH`
- **Inforuptcy** — `INFORUPTCY_EMAIL`, `INFORUPTCY_PASSWORD`
- **Zmanim** — `ZMANIM_ZIP` (default Postville zip 52162)
- **Next/Vercel auto** — `NEXT_RUNTIME`, `VERCEL_ENV`, `VERCEL_DEPLOYMENT_TS`, `VERCEL_GIT_COMMIT_SHA`

**`.env.example` does NOT exist.** Will be generated in STEP 3.

**Naming dupes to consolidate:**
- `GOOGLE_OAUTH_CLIENT_ID/SECRET` ↔ `GOOGLE_CLIENT_ID/SECRET` (legacy)
- `SUPABASE_URL` ↔ `NEXT_PUBLIC_SUPABASE_URL` (these should be the same value; code reads both)

---

## 9. Dependency Map (component → hook → route → service → env)

The most load-bearing flow — the cockpit at `/cockpit`:

```
app/cockpit/page.tsx
  └── CockpitClient.tsx (mount-gate fixes #418)
        └── CockpitLiveDataProvider (useLiveData)
              ├── GET /api/whatsapp/threads ─► lib/timelines + supabase whatsapp_threads ─► TIMELINES_API_KEY, UPSTASH_*, SUPABASE_*
              ├── GET /api/whatsapp/messages ─► lib/timelines + supabase whatsapp_messages
              ├── GET /api/email/sync ─► lib/google/gmail + supabase ─► GOOGLE_OAUTH_*, GOOGLE_REFRESH_TOKEN
              ├── GET /api/calendar/today ─► lib/google/calendar + redis ─► GOOGLE_OAUTH_*, UPSTASH_*
              ├── GET /api/briefing/today ─► pipedrive + supabase + redis ─► PIPEDRIVE_API_TOKEN, UPSTASH_*
              ├── GET /api/notes ─► supabase bucket_items
              └── GET /api/nora/history ─► supabase nora_chat_messages
        └── CockpitApp
              ├── TopChrome (clock + Shabbat + EN/HE) ─► /api/religious-calendar ─► lib/zmanim (Hebcal REST + Redis)
              ├── APEX panel ─► /api/nora/chat (via nora:prefill custom event)
              ├── Nora chat ─► POST /api/nora/chat ─► Claude ─► ANTHROPIC_API_KEY
              ├── Comms ─► useThreadMessages (channel-aware send)
              │     ├── WhatsApp ─► POST /api/whatsapp/messages ─► TIMELINES_API_KEY
              │     └── SMS 305 ─► POST /api/phone/quo-send ─► QUO_API_KEY
              ├── Email triage ─► /api/email/draft + /api/email/send ─► ANTHROPIC + SENDGRID
              ├── Calendar ─► Zoom drop ─► /api/zoom/create-meeting ─► ZOOM_*
              ├── Notes ─► /api/notes (CRUD)
              ├── Brief ─► /api/briefing/today + /evening
              └── Nora's Desk ─► /api/secretary/asks + /api/ai/summarize
```

---

## 10. Cron Jobs (Vercel)

10 schedules in `vercel.json`. All gated by `CRON_SECRET` bearer in their handlers.

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/center-drain` | `*/1 * * * *` | Drain pending Center queues |
| `/api/cron/dispatch-alerts` | `*/1 * * * *` | Dispatch PagerDuty/Slack alerts |
| `/api/cron/inforuptcy-poll` | `0 13 * * *` | Daily bankruptcy poll (2048 MB, 300s, headless Chromium) |
| `/api/cron/slack-digest` | `0 13 * * *` | Daily Slack digest |
| `/api/cron/email-watch` | (re-armed via watch-arm) | Gmail Pub/Sub poll |
| `/api/cron/gmail-watch-arm` | re-arm Pub/Sub | Renew Gmail watch |
| `/api/cron/investor-cadence` | TBD | Investor cadence emitter |
| `/api/cron/meeting-verify` | TBD | Verify upcoming meetings |
| `/api/cron/center-watch` | TBD | Watch queue health |
| `/api/email/sync` | `*/5 * * * *` | Gmail sync (added in prior session) |

---

## 11. Build / Deploy Notes

- **Local build:** must use `next build --webpack` (Turbopack missing native binding on darwin-arm64). Vercel is fine with Turbopack.
- **Type check:** `npx tsc --noEmit` — currently passes (verified in prior session: `TSC: 0`).
- **Lint:** No ESLint config visible at top level — relying on `tsc` for type safety only.
- **Test suite:** `npm test` — only 4 vitest files (~786 LOC). Coverage gap is severe.
- **Sentry instrumentation:** `instrumentation.ts` + `instrumentation-client.ts`, both wired. DSN present in `.env.local`.
- **Output file tracing:** explicit include of chromium binary for `/api/cron/inforuptcy-poll`.
- **No-cache headers** are force-set on `/`, `/cockpit`, `/login`, `/legacy`, `/outreach`, `/center.html` via `next.config.ts`.

---

## 12. Known Failure Classes (entering this audit)

Carried over from prior session — these are the failure *types* I'll be looking for in STEP 2 (RUNTIME_FAILURE_AUDIT):

1. **Hydration mismatch (React #418)** — fixed in `c1a6bb0` + `ad089bd` (mount-gate + `suppressHydrationWarning`). Verify on fresh load.
2. **Adapter `throw` on missing env** — Pipedrive, Zoom, SendGrid, Timelines, PagerDuty all crash rather than returning typed `setup_required`. Surfaces as 500s in routes whose env vars are missing.
3. **Schema drift** — `whatsapp_threads`, `invitations`, `roster`, `thread_tags`, `gmail_watch_state` have no migration file. Pending lane-override migration not applied.
4. **Public-repo secret exposure risk** — repo is public; standing rule is never echo secrets back. `.env.example` doesn't exist; need to generate without values.
5. **Dual-named env vars** — `GOOGLE_OAUTH_*` vs legacy `GOOGLE_CLIENT_*`; `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`. Code currently reads both — consolidation needed.
6. **Single-user assumption** — `proxy.ts` hardcodes `g@reprime.com`. Anyone else gets bounced. Not a bug but a constraint to document.
7. **Missing `getStatus()` on adapters** — UI can't render clean setup-required states because no central registry exists.
8. **Sparse test coverage** — 4 vitest files. Most code is untested.
9. **Console errors / hidden network failures** — to be verified live in STEP 2.

---

## 13. Git State at Audit Start

- **HEAD:** `ad089bd` (suppressHydrationWarning on html/body)
- **Branch:** `main`
- **Working tree:** clean except for 4 untracked ops docs (`SESSION_HANDOFF_2026-06-18.md` + 3 `_ops-context/*.md`)
- **Recent commits** (last 10):
  - `ad089bd` fix: suppressHydrationWarning on <html>/<body>
  - `c1a6bb0` fix: eliminate React #418 hydration crash on /cockpit
  - `3f6f319` fix: render WhatsApp media (images/video/files)
  - `c846799` feat: EN/HE language toggle (i18n framework)
  - `b5cbaaa` feat: SMS outbound via OpenPhone
  - `5174f55` feat: real Nora's-read (AI summaries)
  - `2e92616` feat: global ⌘K command palette
  - `fd0bdc4` feat: Tier-1 alert lane from real calendar
  - `aa34af2` feat: notes edit/pin/search
  - `43cfdc3` feat: Concierge buttons → real drawers

---

## 14. What this audit is NOT

- It is **not a redesign**. The UI shape stays as is.
- It is **not a rewrite**. Adapters and routes already in place are kept and repaired.
- It is **not a feature-add**. New work only when it closes a gap surfaced by the audit (e.g., a missing `getStatus()` registry, a missing migration file for an existing table).

The audit's outputs are: structured docs (this one + 10 more) + targeted root-cause fixes + tests + a final repair report.

---

**Next doc:** `RUNTIME_FAILURE_AUDIT.md` — live test every cockpit feature end-to-end with the dev server running and the browser console open. Record actuals.
