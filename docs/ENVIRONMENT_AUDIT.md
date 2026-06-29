# ENVIRONMENT_AUDIT.md

**Project:** RePrime Command Center
**Audit date:** 2026-06-29
**Repo visibility:** **PUBLIC** — no real secret values appear anywhere in this document.
**Live env source:** Vercel project `project-7e87w` environment variables (Gideon-managed).

This audit inventories every `process.env.*` reference in the codebase, classifies each variable by integration / scope / criticality, and lists which features break when each is missing. A clean `.env.example` is generated as a companion (see §5).

---

## 1. Summary

| Metric | Value |
|---|---|
| Unique env vars referenced in code | **49** |
| Client-exposed (`NEXT_PUBLIC_*`) | 4 |
| Server-only | 45 |
| Required for the cockpit to render at all | 6 |
| Required for at least one panel to work | 18 |
| Optional (graceful degradation) | 25 |
| `.env.example` exists in repo | **No** (created by this audit — see §5) |
| `.env.local` exists locally | Yes (not read, contains real secrets) |
| Dual-named (legacy + new) | 2 pairs |
| Auto-populated by Vercel/Next | 4 |

---

## 2. Master Table — by integration, in load-bearing order

Status legend:
- **Required** = code throws or feature is unusable when missing
- **Recommended** = feature degrades visibly but app keeps running
- **Optional** = feature is a nice-to-have or only used in specific operational paths

### 2.1 Supabase (auth + DB) — **MUST be set**

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | **Required** | All Supabase clients (14 files) | App cannot fetch any data; `/cockpit` empty-states everywhere |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | **Required** | Browser + SSR client (6 files) | Same — no DB reads |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **Required** | Service-role ops in 8 routes (Nora, bookings/confirm, secretary, webhooks) | Service-role routes return 500; webhooks fail silently |
| `SUPABASE_URL` | server | Recommended | 4 server files that didn't use the `NEXT_PUBLIC_*` copy | Code falls back to `NEXT_PUBLIC_SUPABASE_URL` in most places — duplicate; consolidate (see §6) |

### 2.2 Auth — REPRIME access code

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `AUTH_ACCESS_CODE` | server | **Required (login)** | `/api/auth/code` constant-time compare | Login via access code always fails; OAuth still works |

### 2.3 AI providers

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | server | **Required (Nora)** | `/api/nora/chat`, `/api/email/draft`, `/api/ai/summarize`, `/api/ai/concierge`, `/api/ai/draft`, WhatsApp inbound classifier | Nora returns errors; AI drafts/summaries fail |
| `OPENAI_API_KEY` | server | Recommended | `/api/voice/transcribe-en` (Whisper) | English voice STT fails |
| `GROQ_API_KEY` | server | Recommended | `/api/voice/transcribe-he` (Hebrew STT) | Hebrew voice-in fails (flagged missing on Vercel) |

### 2.4 Google (Gmail + Calendar + Sheets)

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | server | **Required (email/cal)** | 16 files | Gmail + Calendar disabled |
| `GOOGLE_OAUTH_CLIENT_SECRET` | server | **Required** | 16 files | Same |
| `GOOGLE_REFRESH_TOKEN` | server | **Required** | 11 files | OAuth never completes; sync fails |
| `GOOGLE_CLIENT_ID` | server | Legacy alias | 7 files | Duplicates the OAuth_* version — see §6 |
| `GOOGLE_CLIENT_SECRET` | server | Legacy alias | 7 files | Same |
| `GMAIL_PUSH_AUDIENCE` | server | Recommended | `/api/center/gmail-push` (OIDC verification) | Push verification skips audience check; less secure but not breaking |
| `SHEETS_OUTREACH_TAB` | server | Optional | `lib/google/sheets.ts` | Outreach export to Sheets disabled; cockpit unaffected |

### 2.5 Upstash Redis (caching + dedup)

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | server | Recommended | 21 files | Each `getRedis()` returns `null`; calls fall back to no-cache (slower, more API hits but functional) |
| `UPSTASH_REDIS_REST_TOKEN` | server | Recommended | 21 files | Same |

### 2.6 Comms — Timelines (WhatsApp) + Quo (SMS) + BlueBubbles (iMessage)

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `TIMELINES_API_KEY` | server | **Required (WhatsApp)** | `/api/whatsapp/*` (4 files) | WhatsApp panel empty; outbound fails |
| `QUO_API_KEY` | server | **Required (SMS)** | `/api/phone/quo-send` | SMS outbound fails |
| `QUO_SEND_FROM` | server | Recommended | `/api/phone/quo-send` | Falls back to hard-coded `+13057784861` |
| `QUO_WEBHOOK_SECRET`(`S`) | server | **Required (inbound)** | `/api/phone/quo-webhook` (signature validation) | Inbound SMS dropped without signature check |
| `BLUEBUBBLES_WEBHOOK_SECRET` | server | Required (iMessage) | `/api/phone/bb-webhook` | Inbound iMessage dropped (BlueBubbles Mac is offline anyway) |

### 2.7 Calendar / Meetings / Voice

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `ZOOM_ACCOUNT_ID` | server | **Required (Zoom)** | `lib/zoom/client.ts` (account-credentials OAuth) | Zoom create-meeting fails |
| `ZOOM_CLIENT_ID` | server | **Required** | Same | Same |
| `ZOOM_CLIENT_SECRET` | server | **Required** | Same | Same |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | server | Recommended | `/api/zoom/webhook` | Webhook signature unverified (flagged missing on Vercel) |
| `STATIC_ZOOM_FALLBACK_URL` | server | Optional | Calendar drop-Zoom UI | Falls back to Zoom create-meeting |
| `ELEVENLABS_API_KEY` | server | Recommended | `/api/voice/speak` (TTS read-aloud) | Read-aloud disabled |
| `ELEVENLABS_VOICE_ID` | server | Recommended | Same | Default voice used |
| `ZMANIM_ZIP` | server | Optional | `lib/zmanim/postville.ts` | Defaults to Postville zip 52162 |

### 2.8 CRM + Enrichment

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `PIPEDRIVE_API_TOKEN` | server | Recommended | 4 routes + Nora context | Investor/deal context absent; Nora answers without CRM grounding |
| `APOLLO_API_KEY` | server | Optional | `lib/enrich/` | Falls back to stub provider |

### 2.9 Email send (transactional)

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `SENDGRID_API_KEY` | server | **Required (send)** | `/api/email/send`, `/api/invitations`, bookings | Outbound email fails |
| `SENDGRID_FROM_EMAIL` | server | **Required** | `lib/sendgrid/client.ts` (flagged missing on Vercel) | Crashes when missing — needs graceful path |
| `SENDGRID_FROM_NAME` | server | Recommended | Same | Defaults to "RePrime" |

### 2.10 Ops / observability

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `CRON_SECRET` | server | **Required (cron)** | 11 cron routes (bearer-token check) | All Vercel crons 401 |
| `SENTRY_DSN` | server | Recommended | `instrumentation.ts` | No server error reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | client | Recommended | `instrumentation-client.ts` | No browser error reporting |
| `SLACK_WEBHOOK_URL` | server | Optional | `lib/slack/client.ts` | Returns `{ sent: false, reason: 'no_webhook' }` — graceful |
| `PAGERDUTY_ROUTING_KEY` | server | Optional | `lib/pagerduty/client.ts` | Throws on use — should be graceful (STEP 7) |
| `CENTER_ALERT_CHAT_ID` | server | Optional | Alert dispatcher | Alerts skipped |
| `CENTER_PASSWORD` | server | Required (Center) | `/api/center/*` header gate | All Center endpoints return 401 |
| `CAPTAIN_API_TOKEN` | server | Required (extension mint) | `/api/invitations` via `X-Captain-Token` | Extension can't mint invites |
| `CHROME_PATH` | server | Required (inforuptcy cron) | `lib/inforuptcy/` Playwright | Bankruptcy poll fails |

### 2.11 Inforuptcy (bankruptcy watchlist)

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `INFORUPTCY_EMAIL` | server | Required (cron) | Headless login | Cron fails; manual data still surfaces |
| `INFORUPTCY_PASSWORD` | server | Required (cron) | Same | Same |

### 2.12 App config

| Var | Scope | Required? | Used by | Behavior if missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | client | **Required** | 12 files (invitation links, redirects) | Invites and OAuth redirects break |

### 2.13 Auto-populated (do not set manually)

`NEXT_RUNTIME`, `VERCEL_ENV`, `VERCEL_DEPLOYMENT_TS`, `VERCEL_GIT_COMMIT_SHA` — set by Next/Vercel at build/runtime.

---

## 3. Status snapshot — what's flagged missing on Vercel

Carried over from prior session memory + known integration gaps. These are the only deltas blocking features today:

| Var | Status | Blocks |
|---|---|---|
| `AUTH_ACCESS_CODE` | **MISSING** | REPRIME code login (OAuth still works) |
| `GROQ_API_KEY` | **MISSING** | Hebrew voice-in |
| `SENDGRID_FROM_EMAIL` | **MISSING** | Outbound email (crash on use — needs both env set AND graceful adapter) |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | **MISSING** | Zoom webhook signature verification |

Everything else listed as Required is presumed present on Vercel (the cockpit is rendering live data — Anthropic, Google, Timelines, Supabase, Upstash, Pipedrive, SendGrid key, Quo are all working).

---

## 4. Findings — issues that affect more than one variable

1. **Dual naming of Google OAuth vars.** Both `GOOGLE_OAUTH_CLIENT_ID/SECRET` and `GOOGLE_CLIENT_ID/SECRET` are read. Code in 16 files reads the `_OAUTH_*` form; 7 read the legacy form. **Recommended fix in STEP 8:** standardize on `GOOGLE_OAUTH_CLIENT_*` everywhere; keep legacy fallback for one deploy then drop.

2. **Dual Supabase URL.** `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` should be the same value. Code reads both. **Recommended fix:** read only `NEXT_PUBLIC_SUPABASE_URL` everywhere (safe — URLs aren't secrets) and remove `SUPABASE_URL`.

3. **Crash vs setup-required asymmetry.** Pipedrive, Zoom, SendGrid, Timelines, PagerDuty `throw` on missing env. Slack and Bucket gracefully return null. The cockpit UI cannot distinguish "no data" from "integration off" because adapters don't expose a status flag. **Fix lives in STEP 7** (uniform `AdapterStatus`).

4. **No `.env.example`.** Onboarding a fresh dev or rebuilding from scratch requires reverse-engineering the env from `process.env.*` greps. Fixed by §5 below.

5. **`/api/health` checks 18 vars but doesn't surface per-integration status to UI.** Routes can't gate-render setup-required states from one source of truth. **Fix lives in STEP 10** (observability layer).

---

## 5. `.env.example` — generated

Written to `.env.example` at repo root. Public-safe: no real values, comments explain each var, blocked features, and where to set them on Vercel.

See the file itself; this section just documents what it contains. The file is grouped by integration (mirrors §2 above) and includes:

- All 4 `NEXT_PUBLIC_*` vars
- All 45 server-side vars
- A header section explaining the public-repo rule (never commit real values)
- Per-section comments explaining what breaks when each is missing
- A footer noting which 4 vars are auto-populated by Vercel/Next (do not set)

---

## 6. Cleanup actions

These are tracked in STEP 8 (root-cause fixes), grouped here for clarity:

| Action | Touches | Risk |
|---|---|---|
| Consolidate `GOOGLE_OAUTH_CLIENT_*` (drop legacy `GOOGLE_CLIENT_*` reads after migration) | 7 files | Low |
| Consolidate `SUPABASE_URL` → use only `NEXT_PUBLIC_SUPABASE_URL` server-side | 4 files | Low |
| Add graceful fallback to SendGrid adapter (return setup_required object instead of throwing) | `lib/sendgrid/client.ts` | Low |
| Add graceful fallback to Pipedrive / Zoom / Timelines / PagerDuty adapters | 4 files | Medium (route call sites assume `throw` semantics; need handling at each site too) |
| Vercel: set `AUTH_ACCESS_CODE`, `GROQ_API_KEY`, `SENDGRID_FROM_EMAIL`, `ZOOM_WEBHOOK_SECRET_TOKEN` | Vercel dashboard (Gideon action) | N/A |

---

## 7. Where to set each var on Vercel

Vercel project: `project-7e87w` → Settings → Environment Variables.

- `NEXT_PUBLIC_*` → set in **all environments** (Production + Preview + Development)
- Service keys / API keys → **Production + Preview** (Development uses `.env.local`)
- Cron secrets → **Production only**

Gideon-only actions are flagged in §3.

---

**Next doc:** `API_ROUTE_AUDIT.md` — every route, its callers, auth, env deps, request/response shape, observed status.
