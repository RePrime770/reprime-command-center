# ERROR_HANDLING_AND_OBSERVABILITY.md

How errors flow through the Command Center today, where they leak, and a tight design for surfacing per-integration status in the cockpit.

Public repo — every snippet here is a path, a pattern, or a synthetic example. No secret values.

---

## Current state — what exists

### Error boundaries

The Next.js App Router only honors `error.tsx` / `global-error.tsx` at the locations Next looks for them. There are exactly two:

| Location | File | Behavior |
| --- | --- | --- |
| Root segment | `app/error.tsx` | Client component. Renders a navy/yellow card showing `error.message` verbatim and a "Try again" button wired to `unstable_retry()`. **Risk:** prints the raw error message — any throw that surfaces a secret-bearing message will paint it on screen. |
| Root (HTML-level) | `app/global-error.tsx` | Calls `Sentry.captureException(error)` in `useEffect`, then renders a static "Something broke. Reload to try again." page. No retry button, no error text shown to user. **Good.** |

| Route | Has its own `error.tsx`? | Falls back to |
| --- | --- | --- |
| `/center`, `/center/v2` | No | `app/error.tsx` |
| `/cockpit` | No | `app/error.tsx` |
| `/compose` | No | `app/error.tsx` |
| `/login`, `/login/layout` | No | `app/error.tsx` |
| `/invite/[token]/*` | No | `app/error.tsx` |
| `/legacy` | No | `app/error.tsx` |
| `app/v/[token]` | No (route handler, not a page) | n/a |

There are no per-segment `error.tsx` files. Every page-level throw routes to the root boundary, which exposes raw `error.message`.

### Server-side error handling patterns

100 `route.ts` files were inspected. The patterns in use cluster into five distinct shapes.

**Pattern A — No try/catch wrapping the handler. RISK.**

A throw inside one of these will trigger Next's default 500 response, which (in dev) renders the stack trace and (in prod) returns a generic 500 with no structured body. Either way, no Sentry capture path other than `instrumentation.onRequestError`.

Routes with no `try {` block at top level:

- `app/api/bookings/list/route.ts`
- `app/api/center/status/route.ts`
- `app/api/crew/route.ts`
- `app/api/voice/transcribe-en/route.ts`
- `app/api/voice/transcribe-he/route.ts`
- `app/api/voice/speak/route.ts`
- `app/api/bucket/fire-reminders/route.ts`
- `app/api/phone/recording/[id]/route.ts`
- `app/api/outreach/export/route.ts`
- `app/api/whatsapp/investor-threads/route.ts`
- `app/api/invitations/[token]/calendar.ics/route.ts`
- `app/api/invitations/by-contact/route.ts`

`voice/transcribe-en` and `voice/transcribe-he` are the worst — they construct an `OpenAI` client with `process.env.OPENAI_API_KEY!` and call `client.audio.transcriptions.create(...)` with no surrounding try. A network error or 401 from upstream throws raw to Next.

**Pattern B — Catch but echo `e.message` to the client. RISK.**

These leak whatever the upstream library puts in `error.message`. Supabase, OpenAI, ElevenLabs, and Anthropic all produce messages that can contain rate-limit hints, internal IDs, or stack-context strings. None of them are PII by themselves, but they're internal-facing and shouldn't be on the wire.

Examples (representative, not exhaustive):

- `app/api/secretary/asks/route.ts:141` — `{ error: 'update_failed', message: error.message }`
- `app/api/crew/route.ts:46` — `{ error: 'db_error', message: error.message }`
- `app/api/notes/route.ts:38,69,108,131` — four spots, all return `error.message`
- `app/api/bucket/[id]/route.ts:59,144,181`
- `app/api/bucket/route.ts:144,172,235`
- `app/api/center/track|remind|outcome|upload|export|approval|email-audit|send` — all return `{ error: error.message }` from Supabase failures
- `app/api/email/triage/route.ts:112`, `email/draft/route.ts:77`, `email/mark-read/route.ts:52`
- `app/api/cron/email-watch|center-watch|meeting-verify` — return raw `error.message` on cron failures
- `app/api/investors/reminder/route.ts:66` — `{ error: 'db_insert_failed', detail: error.message }`
- `app/api/whatsapp/threads/[id]/route.ts:62-68` — branches on regex of `error.message` then returns it

**Pattern C — Catch and swallow silently. RISK (medium).**

Returns success-shaped or empty payloads on failure. The cockpit sees "no data" instead of "something broke," so Gideon can't tell the difference between "no reminders" and "reminders endpoint crashed."

- `app/api/invitations/by-contact/route.ts:32` — on Supabase error returns `{ invitation: null }` with status 200. Caller can't distinguish "no row" from "DB down."
- Frontend `.catch(() => ({}))` / `.catch(() => null)` pattern used in 15+ components (`components/chat/*`, `components/center/columns/*`, `components/panels/*`). Each one silently degrades to an empty object on JSON parse failure.

**Pattern D — Catch and structured-error response. OK.**

Returns a tagged error code + non-sensitive message, no upstream `e.message`. Used in:

- `app/api/auth/code/route.ts:86-88` — narrows `err instanceof Error`, logs detail server-side, returns a code on the wire.
- `app/api/ai/summarize/route.ts:84` — `{ error: 'summarize_failed', message: err instanceof Error ? err.message : 'unknown' }` — still leaks `err.message`, but at least guarded.

**Pattern E — Catch, log, PagerDuty-page or noop. GOOD.**

`app/api/briefing/today/route.ts` and `briefing/evening/route.ts` are the gold standard: every section runs under a labelled timeout wrapper, errors are `console.error`-logged with a `[briefing] ${label}` prefix, and the response degrades gracefully (the missing section renders empty in the briefing card, not the whole route 500ing).

`app/api/bookings/confirm/route.ts` follows the same model and additionally pages PagerDuty when a post-confirmation email send fails.

### Sentry wiring

- `instrumentation.ts` — registers `sentry.server.config` for `nodejs` runtime and `sentry.edge.config` for `edge`. Exports `onRequestError = Sentry.captureRequestError`. This is the only path that captures Next route exceptions.
- `instrumentation-client.ts` — calls `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })`, with `enabled: !!dsn` so it's a no-op if DSN is missing. Includes a `beforeSend` that drops ResizeObserver noise and sub-500ms NetworkError blips.
- `sentry.server.config.ts` and `sentry.edge.config.ts` — both use `SENTRY_DSN` (no `NEXT_PUBLIC_` prefix) and `enabled: !!dsn`. Same ResizeObserver `ignoreErrors`.

**Manual `captureException` call sites:** exactly one — `app/global-error.tsx:12`. Every other capture happens automatically via Sentry's Next integration (route errors via `onRequestError`, unhandled client errors via the browser SDK).

**DSN gaps:**

- Client uses `NEXT_PUBLIC_SENTRY_DSN`. Server uses `SENTRY_DSN`. These must both be set in Vercel for full coverage. `.env.example` should list both.
- `enabled: !!dsn` is a quiet-by-default trap: if DSN is missing in production, errors silently vanish. Health endpoint should expose Sentry-configured status.

### Health endpoint

Current shape (`app/api/health/route.ts`):

```json
{
  "sha": "abc1234",
  "deployedAt": "2026-06-29T12:00:00Z",
  "env": {
    "CRON_SECRET": true,
    "ANTHROPIC_API_KEY": true,
    "OPENAI_API_KEY": true,
    "ELEVENLABS_API_KEY": true,
    "TIMELINES_API_KEY": false,
    "PIPEDRIVE_API_TOKEN": true,
    "GOOGLE_REFRESH_TOKEN": true,
    "SENDGRID_API_KEY": true,
    "INFORUPTCY_EMAIL": true,
    "INFORUPTCY_PASSWORD": true,
    "UPSTASH_REDIS_REST_URL": true,
    "UPSTASH_REDIS_REST_TOKEN": true
  },
  "db": { "reachable": true, "latencyMs": 42 },
  "overall": "degraded"
}
```

What it checks:
1. Required env vars (boolean presence only, never the value).
2. Supabase DB reachability via a `crew_members?limit=0` head fetch with a 5s `AbortController` timeout.
3. Aggregates to `ok` / `degraded` (missing env) / `down` (DB unreachable).

The flat `env: { KEY: bool }` map is too low-level for the cockpit. The UI needs to render *per-integration* state, not per-env-var state — WhatsApp doesn't care that Pipedrive is misconfigured. The adapter pattern at `lib/adapters/status.ts` already exists for this; the health endpoint should be the consumer.

**Adapter pattern (already in place):** `lib/adapters/status.ts` defines `AdapterStatus`, plus helpers `ok()`, `setupRequired()`, `unreachable()`, `checkEnv()`, `checkEnvAny()`. `lib/sendgrid/client.ts`, `lib/pipedrive/client.ts`, `lib/zoom/client.ts` already expose `getStatus()`. Timelines, Anthropic, OpenAI, ElevenLabs, Google, Bluebubbles, Quo, Apollo, Inforuptcy, Supabase don't yet.

---

## Gaps

### Routes with no try/catch

(See "Pattern A" list above — 12 routes.) Highest priority for triage: `voice/transcribe-en|he|speak` (called from the always-on mic, every failure is user-visible silence), `bucket/fire-reminders` (cron-critical — silent failure means reminders stop firing), `center/status` (cockpit polls this), `crew/route.ts` (loaded on cockpit boot).

### Routes that leak `e.message` in responses

Already enumerated above. Severity ranking:

- HIGH: `cron/*` (3 files) — return DB error strings to whatever calls them. Cron logs end up in Vercel.
- HIGH: `notes/route.ts` — four places, called from the cockpit, exposes Supabase errors to the browser.
- MED: `bucket/*`, `center/*` — exposes Supabase errors to the cockpit. Bad UX (raw error in toast) but not a public endpoint.
- MED: `whatsapp/threads/[id]:62-68` — regex-matches on `error.message` from Postgres ("column does not exist") to branch behavior. Brittle. The shape of pg errors is not API.
- LOW: `auth/code:86-88`, `ai/summarize:84` — narrowed and tagged, but still echoes `err.message`.

### Routes that swallow errors silently

- `app/api/invitations/by-contact/route.ts:32` — Supabase error returns `{ invitation: null }` (200 OK).
- All 15+ `.catch(() => ({}))` / `.catch(() => null)` sites in `components/` (see Pattern C list).
- `components/center/VoiceShell.tsx` has four `.catch(() => null)` calls on fire-and-forget telemetry pings — acceptable for telemetry, but currently impossible to distinguish from a real failure.

### UI gaps

1. **No "setup required" state per panel.** Cockpit panels (`components/cockpit/panels/CommsPanel.jsx`, `InvestorsPanel.jsx`, `EmailPanel.jsx`, etc.) render an empty list when the upstream returns `[]`. There is no distinction between "no investors today" (valid empty) and "TIMELINES_API_KEY not set, WhatsApp can't load" (broken empty). `RecentlyActiveStrip.jsx` literally says "No investor activity yet." on both.
2. **No retry path for transient 500s.** The only retry surface is the root `app/error.tsx` boundary, which only fires if the *page* throws. A 500 from `/api/center/status` consumed by `CockpitLiveData.jsx` shows up as missing data, no banner, no retry button, no log. Reloading the page is the only user remediation.
3. **No global "something is wrong" status surface.** Compare: Linear and Stripe ship a chrome-corner integration light. The cockpit has `TopChrome.jsx` but no health indicator on it.

---

## Design — Integration Status surface in the UI

Goal: low-noise, glance-able, click-to-act. Gideon should see at a glance that WhatsApp is unhealthy without the cockpit nagging him when everything's green.

### Where it lives

Three coordinated surfaces — each at a different altitude.

**1. Top-chrome health pill (always visible).**
A single pill in `components/cockpit/chrome/TopChrome.jsx`, right side, next to the existing palette/PTT controls. States:
- All green: small green dot, no text. ~12px wide.
- Any non-ok: amber/red dot + count, e.g. `● 2`. Click expands the drawer.

**2. Integration drawer (click-to-expand).**
Slides from the right when the pill is clicked. Lists every integration with its `AdapterStatus`. Grouped: messaging (WhatsApp / SMS / iMessage / email), CRM (Pipedrive), calendar (Google), voice (ElevenLabs / Groq), AI (Anthropic / OpenAI), infra (Supabase / Upstash / Sentry).

**3. Per-panel inline banner (only when that panel's integration is broken).**
Thin amber strip at the top of the panel body (above the existing white scroll area in `PanelShell.jsx`). One line. Click opens the drawer to the relevant entry. Only shown when the panel's primary integration is non-ok — never on plain empty.

### States (mirrors `AdapterFailureReason`)

| State | Pill color | Meaning | What Gideon does |
| --- | --- | --- | --- |
| `ok` | green | Adapter env present, last call succeeded | Nothing. |
| `setup_required` | amber | Required env var missing | Click pill → drawer → "Copy `TIMELINES_API_KEY`" → paste into Vercel env, redeploy. |
| `auth_failed` | red | Env present but upstream rejected creds (401/403) | Click pill → drawer → "Rotate key" link to provider console. |
| `unreachable` | amber | Network/timeout to upstream | Click pill → drawer → "Retry" button → re-hits the adapter's getStatus. |
| `rate_limited` | amber | 429 from upstream | Drawer shows "Retry after Xs." Counts down. |

### Action affordances

For `setup_required`: drawer entry shows the env var name in a `<code>` block with a copy-to-clipboard button. One-click copy, then a small instruction "Paste in Vercel → Settings → Environment Variables → Redeploy." No magic deeplink to Vercel — too brittle across teams.

For `auth_failed`: link to the integration's API key page (e.g. timelines.com, openai.com).

For `unreachable` / `rate_limited`: "Retry now" button that re-hits `/api/health` and refreshes the pill.

### ASCII mock

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMMAND CENTER       🔍 Search    🎙  Talk to Nora     ● 2  G        │
├─────────────────────────────────────────────────────────────────────────┤  ← pill, amber, count=2
│                                                                         │
│  ┌── INVESTORS ──────────┐  ┌── COMMS ──────────────┐  ┌── EMAIL  ──┐  │
│  │ ⚠ WhatsApp not set up │  │                       │  │            │  │
│  │   (set TIMELINES_…)   │  │  iMessage             │  │            │  │
│  │                       │  │  SMS                  │  │            │  │
│  │ [empty]               │  │  WhatsApp ⚠           │  │  3 unread  │  │
│  └───────────────────────┘  └───────────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

  Click the pill ──▶

  ┌─── Integrations ───────────────────────────────┐
  │                                                │
  │  Messaging                                     │
  │  ● Email                  ok                   │
  │  ⚠ WhatsApp (Timelines)   setup required       │
  │      Missing: TIMELINES_API_KEY     [copy]     │
  │      Then redeploy from Vercel.                │
  │  ● iMessage               ok                   │
  │  ⚠ SMS (OpenPhone)        auth failed          │
  │      Rotate key → openphone.com  [open]        │
  │      [retry now]                               │
  │                                                │
  │  CRM                                           │
  │  ● Pipedrive              ok                   │
  │                                                │
  │  AI / Voice                                    │
  │  ● Anthropic              ok                   │
  │  ● OpenAI                 ok                   │
  │  ● ElevenLabs             ok                   │
  │                                                │
  │  Infrastructure                                │
  │  ● Supabase               ok    (42ms)         │
  │  ● Upstash                ok                   │
  │  ⚠ Sentry                 setup required       │
  │      Missing: NEXT_PUBLIC_SENTRY_DSN, SENTRY_  │
  │      DSN. Errors not being reported.   [copy]  │
  │                                                │
  └────────────────────────────────────────────────┘
```

---

## Health endpoint v2 spec

Augment the current response with an `integrations` array. Keep `env` for backward compat through one release, then drop it.

```json
{
  "sha": "abc1234",
  "deployedAt": "2026-06-29T12:00:00Z",
  "overall": "degraded",
  "db": { "reachable": true, "latencyMs": 42 },
  "sentry": { "configured": false },
  "integrations": [
    { "ok": true,  "integration": "anthropic" },
    { "ok": true,  "integration": "openai" },
    { "ok": true,  "integration": "elevenlabs" },
    { "ok": false, "integration": "timelines",
      "reason": "setup_required",
      "missingEnv": ["TIMELINES_API_KEY"],
      "message": "Missing env: TIMELINES_API_KEY" },
    { "ok": true,  "integration": "pipedrive" },
    { "ok": true,  "integration": "sendgrid" },
    { "ok": true,  "integration": "google" },
    { "ok": false, "integration": "openphone",
      "reason": "auth_failed",
      "message": "Upstream returned 401" },
    { "ok": true,  "integration": "supabase" },
    { "ok": true,  "integration": "upstash" }
  ]
}
```

Rules:
- Every integration MUST come from a `getStatus()` call on its adapter — the route does not inspect `process.env` directly. Single source of truth.
- `getStatus()` is env-only (cheap, no network) by default. A `?deep=1` query parameter triggers a real ping per adapter (call this from a 30s background poll, not on every cockpit render).
- `overall` derivation: `down` if Supabase unreachable; `degraded` if any adapter `ok: false`; otherwise `ok`.
- Cache-Control: `no-store, must-revalidate` (already correct).
- Public route. Returns no secret values — only env var *names* and presence booleans.

---

## Highest-priority fixes

Top 10, ranked:

1. **Add try/catch + Sentry capture to the 12 Pattern-A routes.** Highest blast radius: `voice/transcribe-en|he|speak` (mic dead-air), `bucket/fire-reminders` (cron silently stops), `center/status` (cockpit polls). Wrap with a shared `withErrorHandler` helper that returns a tagged 500 and calls `Sentry.captureException`.

2. **Stop returning `error.message` on the wire.** Add a shared `routeError(code, status)` helper. Server logs the full `error.message` + stack; the response gets `{ error: code }` only. Replace all 35+ call sites mechanically.

3. **Implement `getStatus()` on the remaining adapters.** `lib/timelines/client.ts`, `lib/anthropic`, `lib/openai`, `lib/elevenlabs`, `lib/google`, `lib/bluebubbles`, `lib/quo`, `lib/apollo`, `lib/inforuptcy`, `lib/supabase`, `lib/redis`. Use `checkEnv()` from `lib/adapters/status.ts`. Five-line PRs each.

4. **Wire `integrations: AdapterStatus[]` into `/api/health`.** Coordinate with the in-flight parallel agent — they're adding this field. Don't duplicate. Verify the shape matches the v2 spec above.

5. **Build the top-chrome health pill + drawer.** New component `components/cockpit/chrome/HealthPill.jsx`. Polls `/api/health` every 30s. Drawer opens on click, lists integrations grouped, with copy-env-name buttons.

6. **Per-segment `error.tsx` for `/cockpit` and `/center`.** Don't leak `error.message` to the user — show "This panel hit a snag. Reload?" with a Sentry `eventId` line so Gideon can correlate.

7. **Per-panel inline "setup required" banner in `PanelShell.jsx`.** Add an optional `integrationStatus?: AdapterStatus` prop. When non-ok, renders a single-line amber strip above the body. The cockpit's `CockpitLiveData.jsx` resolves the relevant adapter status per panel and passes it down.

8. **Audit `.catch(() => ({}))` / `.catch(() => null)` in components.** Each one should either (a) call `Sentry.captureException` then return empty, or (b) surface a toast via `showToast`. Silent JSON-parse failures are masking real bugs.

9. **Replace the `whatsapp/threads/[id]:62` `/column .* does not exist/i.test(error.message)` regex** with a proper Postgres error-code check (`error.code === '42703'`). Stringly-typed branching on upstream error messages is brittle and fails on locale changes.

10. **Structured logging in API routes.** Today everything is `console.error('[label]', err.message)`. Standardize on a JSON line per error: `console.error(JSON.stringify({ at: 'api/<route>', err: msg, stack }))`. Vercel parses JSON logs, which lets Gideon filter by `at=` in the dashboard. No new dependency.

---

## Bonus — Sentry coverage check

In addition to wiring the pill, the `/api/health` v2 response should include `sentry.configured: boolean`. Today, if both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are missing, Sentry silently no-ops — meaning errors disappear into the void with no UI signal. Surfacing this as `setup_required` in the drawer closes the loop.
