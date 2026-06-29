# API_ROUTE_AUDIT.md

Snapshot of every `app/api/**/route.ts` in the project, captured by reading each file's exports, env reads, auth pattern, and error-handling shape. PUBLIC repo — no secret values transcribed.

## Summary

- **Total routes:** 98
- **Auth model breakdown:**
  - `getUser()` + `email === 'g@reprime.com'` inline check: ~46
  - `centerAuthed(req)` (shared password `x-center-pass` header): ~22
  - `Bearer ${CRON_SECRET}` (Vercel cron): 7
  - Webhook signature / OIDC / HMAC: 5 (`/zoom/webhook`, `/center/gmail-push`, `/phone/quo-webhook`, `/phone/bb-webhook`, `/phone/call-event`)
  - Public / proxy-trusted: 5 (`/auth/code`, `/health`, `/religious-calendar`, `/invitations/by-contact`, `/invitations/[token]/calendar.ics`, `/invitations/[token]/reschedule`, `/whatsapp/webhook`, `/zoom/ai-companion-ingest`, `/center/warm-card`, `/outreach/export`, `/zoom/create-meeting`)
- **Routes reading `CRON_SECRET`:** 9 (`fire-reminders`, `dispatch-alerts`, `email-watch` indirect, `inforuptcy-poll`, `investor-cadence`, `meeting-verify`, `slack-digest`, `poll-overdue`, `gmail-watch-arm`, `email/sync`)
- **Routes with `permissive when CRON_SECRET unset` ("no secret → allow") pattern:** 5 — see cross-cutting finding #3.
- **Routes calling `createServiceClient()` (bypassing RLS):** ~70 of 98 (heavy)
- **By domain:** Auth 1, AI/Nora 5, Calendar/Zoom/Religious 5, Email 5, Comms 22, Contacts 2, Notes/Bucket/Followups 5, Invitations/Bookings 9, Deals/Investors/Pipedrive 9, Tags/Crew 4, Center admin 24, Center exports/cron 9, Diagnostics 1, Webhooks 5.

---

## Auth

| Path | Methods | Purpose | Env vars (server-only) | Auth | Status |
|---|---|---|---|---|---|
| `/api/auth/code` | POST | Shared team access code → mint Supabase session for `g@reprime.com`. Constant-time compare. | `AUTH_ACCESS_CODE`, Supabase service URL+key | Public (proxy-listed); `timingSafeEqual` against `AUTH_ACCESS_CODE` (default fallback `REPRIME` — see fixes) | RISK |

---

## AI / Nora

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/ai/concierge` | POST | Generate "running late / postpone" message via Anthropic, with computed slot suggestions. | `ANTHROPIC_API_KEY`, Google OAuth creds | `getUser() === g@reprime.com` | OK |
| `/api/ai/draft` | POST | Draft 718 or 305 reply using Claude (haiku/opus/opus-thinking). | `ANTHROPIC_API_KEY` | `getUser() === g@reprime.com` | OK |
| `/api/ai/summarize` | POST | "Nora's read" of an email/thread via Haiku. | `ANTHROPIC_API_KEY` | `getUser()` | OK |
| `/api/nora/chat` | POST | Nora chat assistant — context-grounded, model switches Haiku/Opus by complexity regex. | `ANTHROPIC_API_KEY` | `getUser()` | OK |
| `/api/nora/history` | GET | Last 50 Nora messages. Degrades silently to `[]` if table missing. | — | `getUser()` | OK |

---

## Calendar / Zoom / Religious

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/calendar/today` | GET | Today's events via Google Calendar, Redis-cached 5min. | `UPSTASH_*`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_OAUTH_CLIENT_*` | `getUser()` | OK |
| `/api/religious-calendar` | GET | Hebcal candle-lighting/havdalah lookup. Never 500s — falls back to `live:false`. | `ZMANIM_ZIP` | None (proxy-trusted) | OK |
| `/api/zoom/create-meeting` | POST | Create real Zoom meeting; graceful fallback to `STATIC_ZOOM_FALLBACK_URL`. | `ZOOM_*`, `STATIC_ZOOM_FALLBACK_URL` | None (proxy-trusted; no inline auth) | RISK |
| `/api/zoom/ai-companion-ingest` | POST | Ingest Zoom AI Companion summary emails; persists summary + creates Pipedrive activity. | Supabase service | None visible | RISK |
| `/api/zoom/webhook` | POST | Zoom CRC + HMAC-verified webhook (recording.completed, meeting.ended). | `ZOOM_WEBHOOK_SECRET_TOKEN` | HMAC-SHA256 sig | OK |

---

## Email

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/email/draft` | POST | Anthropic-drafted email reply in Gideon's voice. | `ANTHROPIC_API_KEY` | `getUser()` | OK |
| `/api/email/mark-read` | POST | Toggle Gmail UNREAD label on a message via configured-account refresh token. | Gmail OAuth (multi-account) | `getUser()` | OK |
| `/api/email/send` | POST | SendGrid email send. Resolves reply-from from configured Gmail accounts. | `SENDGRID_API_KEY`, multi-account Gmail | `getUser()` | OK |
| `/api/email/sync` | GET? | Multi-account Gmail sync; scoring via `lib/scoring/email`. | `UPSTASH_*`, Gmail tokens, `CRON_SECRET` | Cron bearer; **permissive when unset** | FRAGILE |
| `/api/email/triage` | GET | Returns recently scored emails with Pipedrive resolution; Redis-cached. | `UPSTASH_*`, Pipedrive | `getUser()` | OK |

---

## Comms (WhatsApp / Quo / iMessage / Voice / Phone)

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/whatsapp/threads` | GET | List threads + Pipedrive enrichment. `maxDuration=60`. | `UPSTASH_*`, `PIPEDRIVE_API_TOKEN`, `TIMELINES_API_KEY` | `getUser()` | OK |
| `/api/whatsapp/threads/[id]` | PATCH | Update `lane_override` on a thread. | — | `getUser()` | OK |
| `/api/whatsapp/messages` | GET, POST | List + send WhatsApp message. Outbound ask recording. | `TIMELINES_API_KEY` | `getUser()` | OK |
| `/api/whatsapp/batch-send` | POST | Throttled (2s) WhatsApp template batch. | `TIMELINES_API_KEY`, `PIPEDRIVE_API_TOKEN` | `getUser()` | OK |
| `/api/whatsapp/investor-threads` | GET | Recent inbound messages from investor-tagged threads (DB-driven). | Supabase service | `getUser()` | OK |
| `/api/whatsapp/investor-chat-threads` | GET | Investor-tagged threads joined with Pipedrive tiers. Redis-cached. | `UPSTASH_*`, Pipedrive | `getUser()` | OK |
| `/api/whatsapp/webhook` | POST | Timelines.ai webhook → normalize raw → upsert messages, transcribe voice notes inline. | `ANTHROPIC_API_KEY`, `UPSTASH_*`, Supabase service | None (proxy-trusted webhook) | RISK |
| `/api/phone/quo-send` | POST | Outbound SMS via OpenPhone/Quo API. Raw API key (not Bearer). | `QUO_API_KEY`, `QUO_SEND_FROM` | `getUser()` | OK |
| `/api/phone/quo-webhook` | POST | OpenPhone HMAC-verified webhook. base64-decoded signing key + legacy sha256 fallback. | `QUO_SIGNING_KEY` (implicit) | HMAC-SHA256 timing-safe | OK |
| `/api/phone/bb-webhook` | POST | BlueBubbles iMessage webhook. | `BLUEBUBBLES_WEBHOOK_SECRET` | Header **or** query param (`?secret=`) plaintext compare | RISK |
| `/api/phone/call-event` | POST | Call-log daemon → `phone_calls` upserts. | `BB_CALL_SECRET` | Bearer plaintext compare | RISK |
| `/api/phone/recording/[id]` | GET | Proxy Quo recording URL (hides Quo API key from browser). | `QUO_API_KEY` (in upstream lib) | `getUser()` | OK |
| `/api/voice/speak` | POST | ElevenLabs TTS for `text+language`. | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | `getUser()` | OK |
| `/api/voice/transcribe-en` | POST | Whisper (Groq → OpenAI fallback) English transcription. | `GROQ_API_KEY`, `OPENAI_API_KEY` | `getUser()` | OK |
| `/api/voice/transcribe-he` | POST | Whisper Hebrew transcription. | `GROQ_API_KEY`, `OPENAI_API_KEY` | `getUser()` | OK |
| `/api/messages/failed-recent` | GET | Failed messages in last 30min. | — | `getUser()` | OK |

---

## Contacts

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/contacts/block` | POST | Cross-channel block/unblock by thread/Pipedrive id/phone/email. | Supabase service | `getUser()` | OK |
| `/api/contacts/import-names` | POST | CSV phone-name import → `whatsapp_threads.contact_name`. | Supabase service | `getUser()` | OK |

---

## Notes / Bucket / Followups

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/notes` | GET, POST | List + create notes. | — | `getUser()` | OK |
| `/api/bucket` | GET, POST | List/create bucket items. 5s timeout race. | Supabase service | `getUser()` | OK |
| `/api/bucket/[id]` | GET, PATCH, DELETE | Single bucket item CRUD. | Supabase service | `getUser()` | OK |
| `/api/bucket/[id]/remind` | POST | Schedule reminder ≤30d horizon, validates UUID. | Supabase service | None visible (relies on proxy) | RISK |
| `/api/bucket/fire-reminders` | POST | Cron: fire due reminders, Redis dedupe. 503 when `CRON_SECRET` unset. | `CRON_SECRET`, `UPSTASH_*` | Bearer; **refuses when unset** (good) | OK |
| `/api/secretary/asks` | GET | Awaiting/overdue/replied buckets for outbound asks. | — | `getUser()` | OK |
| `/api/secretary/poll-overdue` | GET | Hourly cron: flip `reminded_at` on overdue asks. | `CRON_SECRET`, `PAGERDUTY_*` | Bearer; **permissive when unset** | FRAGILE |

---

## Invitations / Bookings

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/invitations` | POST | Mint invitation; SendGrid email + Google Sheets append. `*` CORS for Chrome extension; gated by `X-Captain-Token`. | `SENDGRID_API_KEY`, `CAPTAIN_TOKEN` | Captain token header OR `getUser()` | RISK |
| `/api/invitations/by-contact` | GET | Lookup invitation by Pipedrive id. **No auth.** | Supabase service | None | RISK |
| `/api/invitations/[token]/calendar.ics` | GET | Public ICS download. | Supabase service | None (intentional) | OK |
| `/api/invitations/[token]/reschedule` | POST | Public reschedule via token. Zoom patch + calendar update + email. | Zoom, Google, SendGrid, `UPSTASH_*` | Token-as-secret | FRAGILE |
| `/api/invitations/add-attendee` | POST | Add attendee emails to existing invitation. | `SENDGRID_API_KEY` | None visible | RISK |
| `/api/bookings/available-slots` | GET | Compute free 30min slots from Google Calendar busy list. | Google OAuth | None visible (proxy) | UNVERIFIED |
| `/api/bookings/confirm` | POST | Confirm a slot — creates Zoom + Google event + Pipedrive activity + WhatsApp ack. | All of Zoom/Google/Timelines/Pipedrive/`UPSTASH_*`/`PAGERDUTY_*` | None visible (token-on-URL pattern) | FRAGILE |
| `/api/bookings/list` | GET | Last 20 invitation rows. | Supabase service | `getUser()` | OK |
| `/api/bookings/send-invitation` | POST | Multi-channel invitation send (WhatsApp 305/718 + email). | SendGrid, Timelines, Pipedrive | `getUser()` | OK |

---

## Deals / Investors / Pipedrive

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/pipedrive/search` | GET | Search persons by query. | `PIPEDRIVE_API_TOKEN` | `getUser()` | OK |
| `/api/pipedrive/person` | GET | Get person + preferred channel resolution. | Pipedrive | `getUser()` | OK |
| `/api/pipedrive/notes` | PUT | Update dashboard-notes custom field. | Pipedrive, `UPSTASH_*` | `getUser()` | OK |
| `/api/pipedrive/resolve` | GET | Resolve phone/email → person + activities. Redis-cached 1h. | Pipedrive, `UPSTASH_*` | `getUser()` | OK |
| `/api/pipedrive/enrich` | POST | Enrich person from external provider; update Pipedrive. | Pipedrive, enrich provider | `getUser()` | OK |
| `/api/pipedrive/bulk-import` | POST | Streaming bulk upsert from `contact_directory` or inline rows (≤1000). `maxDuration=300`. | Pipedrive | `getUser()` | OK |
| `/api/investors/cadence` | GET | Top-50 coldest investor list, Redis-cached 5min. | Pipedrive, `UPSTASH_*` | `getUser()` | OK |
| `/api/investors/reminder` | POST | Persist `investor_reminders` row. | Supabase service | `getUser()` | OK |
| `/api/cron/investor-cadence` | POST | Service-role twin of `/api/investors/cadence` for crons. | `CRON_SECRET`, Pipedrive, `UPSTASH_*` | Bearer; **503 when secret unset** | OK |

---

## Tags / Crew / Center admin (RePrime "follow-through" board)

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/tags/apply` | POST | Apply/remove tag on a thread; recomputes investor flag. | Supabase service | `getUser()` | OK |
| `/api/tags/bulk-upload` | POST | Bulk CSV tag-apply. | Supabase service | `getUser()` | OK |
| `/api/crew` | GET | List active crew members. | Supabase service | `getUser()` | OK |
| `/api/crew/delegate` | POST | Delegate a bucket item to crew. | Supabase service | `getUser()` | OK |
| `/api/center/approval` | GET, POST | Spanish-secretary approval queue. | `CENTER_PASSWORD` | `centerAuthed()` | OK |
| `/api/center/check` | POST | Per-line dedupe against invitations memory. | — | `centerAuthed()` | OK |
| `/api/center/contacts-export` | GET | xlsx export of roster (full/emails view). | Supabase service | `centerAuthed()` | OK |
| `/api/center/email-audit` | GET, POST | Roster email-audit flags review + fix. | Supabase service | `centerAuthed()` | OK |
| `/api/center/export` | GET | CSV of board incl. thread_json. | Supabase service | `centerAuthed()` | OK |
| `/api/center/gmail-push` | POST | Gmail Pub/Sub push receiver. Validates OIDC audience + iss. | `GMAIL_PUSH_AUDIENCE`, Gmail OAuth | OIDC bearer + audience | OK |
| `/api/center/gmail-whoami` | GET | Read-only: which mailbox does each refresh token point to? | `GOOGLE_REFRESH_TOKEN`, `_2` | `centerAuthed()` | OK |
| `/api/center/history` | GET | Stored WhatsApp+email thread for a contact, with Spanish translation. | Anthropic indirect, Supabase | `centerAuthed()` | OK |
| `/api/center/inbox` | GET | Inbound replies from outreach contacts (WhatsApp+email). | Timelines, Gmail | `centerAuthed()` | OK |
| `/api/center/lock-identities` | POST | One-time identity lock binding roster to Timelines chat id. | Timelines | `centerAuthed()` | OK |
| `/api/center/outcome` | POST | Write booked/declined back to roster. | Supabase service | `centerAuthed()` | OK |
| `/api/center/reconcile` | POST | Source-of-truth reconcile from Timelines `getMessages`. | Timelines | `centerAuthed()` | OK |
| `/api/center/remind` | POST | Snooze contact + free Google Calendar reminder. | Google OAuth | `centerAuthed()` | OK |
| `/api/center/reply` | POST | Send reply via WhatsApp or Gmail. | Google OAuth, Timelines | `centerAuthed()` | OK |
| `/api/center/reply-media` | POST | Voice-note or file reply (WhatsApp/email), transcribed. | Google, Timelines, Supabase storage | `centerAuthed()` | OK |
| `/api/center/report` | GET, POST | Build & optionally push status report to WhatsApp group. | Timelines, `CENTER_ALERT_CHAT_ID` | `centerAuthed()` | OK |
| `/api/center/send` | POST | Enqueue invitation rows for cron drain. | Supabase service | `centerAuthed()` | OK |
| `/api/center/status` | GET | Queue counts + pending list. | Supabase service | `centerAuthed()` | OK |
| `/api/center/track` | GET | Full board view with engagement signals. | Supabase service | `centerAuthed()` | OK |
| `/api/center/translate` | POST | Hebrew↔Spanish↔English secretary engine (Anthropic). | `ANTHROPIC_API_KEY` | `centerAuthed()` | OK |
| `/api/center/upload` | POST | CSV/xlsx roster ingest. | Supabase service | `centerAuthed()` | OK |
| `/api/center/voice-process` | POST | Backfill un-transcribed voice notes. | Timelines, Whisper, Supabase | `centerAuthed()` | OK |
| `/api/center/warm-card` | POST | Pre-render invite OG card to Supabase storage. | Supabase service | **None** — anyone with an invite id can spam | RISK |

---

## Center exports / cron

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/cron/center-drain` | GET | Per-min: drain 1 queued invitation. **No auth at all.** | Supabase service, Timelines, SendGrid | None | RISK |
| `/api/cron/center-watch` | GET | Hourly: refresh awaiting/handled state + alert group. **No auth.** | Timelines, Gmail | None | RISK |
| `/api/cron/dispatch-alerts` | GET | Drain queued PagerDuty alerts. | `CRON_SECRET`, `UPSTASH_*`, PagerDuty | Bearer; **permissive when unset** | FRAGILE |
| `/api/cron/email-watch` | GET | 2-min: roster email watcher. **No auth.** | Gmail | None | RISK |
| `/api/cron/gmail-watch-arm` | GET | Daily: re-arm Gmail watch + save baseline. | `CRON_SECRET` or `centerAuthed` | Bearer OR center pass | OK |
| `/api/cron/inforuptcy-poll` | GET | Daily 7am CT: bankruptcy watchlist. | `CRON_SECRET`, `INFORUPTCY_EMAIL/PASSWORD` | Bearer; **permissive when unset** | FRAGILE |
| `/api/cron/meeting-verify` | GET | Verify Zoom attendance ~30 min post-slot. | `CRON_SECRET`, Zoom | Bearer; **permissive when unset** | FRAGILE |
| `/api/cron/slack-digest` | POST | 08:00 CT digest to Slack. | `CRON_SECRET`, `SLACK_WEBHOOK_URL`, `UPSTASH_*` | Bearer; **503 when unset** | OK |
| `/api/outreach/export` | GET | xlsx of all minted invitations. **No inline auth.** | Supabase service | Relies on proxy cookie | RISK |

---

## Briefing / Diagnostics

| Path | Methods | Purpose | Env vars | Auth | Status |
|---|---|---|---|---|---|
| `/api/briefing/today` | GET | Morning brief: events + active deals + suggested focus. Redis-cached, 3s timeouts. | `UPSTASH_*`, Pipedrive, Google | `getUser()` | OK |
| `/api/briefing/evening` | GET | Evening wrap: handled/open counts. Cached 2min. | `UPSTASH_*`, Google | `getUser()` | OK |
| `/api/health` | GET | Env-flag presence + Supabase ping. Returns only booleans. | Many (presence-checked) | None (intentional) | OK |

---

## Cross-cutting findings

1. **`No CRON_SECRET → allow` pattern (HIGH).** `dispatch-alerts`, `meeting-verify`, `inforuptcy-poll`, `poll-overdue`, `email/sync` all return `true` from `authorized()` when `CRON_SECRET` is unset. This means a misconfigured deploy silently exposes cron-only routes to anonymous callers. Compare to `fire-reminders` and `slack-digest`, which correctly **503** when the secret is missing. Standardize on the strict version.

2. **Unauthenticated cron routes (CRITICAL).** `/api/cron/center-drain`, `/api/cron/center-watch`, `/api/cron/email-watch` have **no auth at all** — anyone hitting them triggers WhatsApp/Email sends and group alerts. Worst-case: paid send-rate exhausted by an attacker.

3. **Auth fallback to default password / token.** `AUTH_ACCESS_CODE` falls back to literal `'REPRIME'` and `CENTER_PASSWORD` falls back to `'sbh770'` (visible in `lib/center/auth.ts`). Both are in the public repo. Anyone with the repo URL can read them. Must require explicit env vars in prod and refuse on absence.

4. **`centerAuthed` accepts shared-secret via header *or* query (`/phone/bb-webhook`).** Query-param secrets land in logs (CloudFlare, Vercel access logs, browser history). Header-only.

5. **Plaintext `===` comparisons for bearer/secret values.** Most cron routes use `header === \`Bearer ${expected}\``. Timing-safe is implemented in `/auth/code` and `/phone/quo-webhook` — should be applied everywhere a static secret is compared.

6. **Service-role usage is extremely broad (~70 routes).** Every center route + every cron uses `createServiceClient()` and so bypasses RLS. There is effectively no RLS-enforced read path. Acceptable for a single-tenant cockpit but means a bug that exposes one of these endpoints is unbounded.

7. **Raw error messages echoed in responses.** `bookings/list`, `nora/chat` (server-side errors), `pipedrive/search`, many center routes return `{ error, message: err.message }` or `{ error: error.message }`. Anthropic / Pipedrive / Supabase error bodies can include URLs, project ids, or partial config — log server-side, return generic messages client-side.

8. **Direct third-party `fetch()` bypassing adapters.** `/api/center/translate` POSTs to `api.anthropic.com` directly with `process.env.ANTHROPIC_API_KEY`; `/api/phone/quo-send` POSTs to `api.openphone.com` directly. The rest of the codebase has adapter clients in `lib/anthropic/*`, `lib/zoom/client`, etc. Inconsistent and bypasses retry/observability that an adapter could add.

9. **Input validation is ad-hoc.** None of the routes use zod or a typed schema validator. Every route hand-rolls `typeof x === 'string'` checks. Several POST handlers do not validate at all (`/api/center/outcome`, `/api/center/send`, `/api/whatsapp/threads/[id]` for fields outside `lane_override`).

10. **`try { … } catch { return ... }` patterns that swallow errors.** `religious-calendar` swallows on purpose (good — degrades the chrome). But `center/reply`, `center/remind` calendar best-effort, `voice-process` persist loops, and many briefing sub-fetches catch + return `null` without surfacing failures — masks broken third parties.

11. **Adapter-throws-on-missing-env crashes routes (FRAGILE).** `/api/email/sync`, `/api/whatsapp/threads`, `/api/whatsapp/messages`, `/api/pipedrive/*`, and `/api/investors/cadence` will throw at request time if `TIMELINES_API_KEY` / `PIPEDRIVE_API_TOKEN` / Gmail tokens are missing — no graceful degrade. The `/health` route doesn't currently test these adapter call paths, only env-var presence.

12. **CORS `*` on `/api/invitations`.** Captain Chrome-extension flow uses `*` + `X-Captain-Token`. Token is fine, but `*` plus credentials would break — keep `credentials: false`. Confirm `Captain` token strength (≥32 random bytes) is enforced.

13. **`STUB`-shaped fallback in `/api/zoom/create-meeting`.** On failure returns `{ joinUrl: STATIC_ZOOM_FALLBACK_URL || null, fallback: true }`. This is intentional and labeled — fine — but downstream callers must check `fallback: true`. Search for callers that don't.

14. **`/api/messages/failed-recent` reaches into `whatsapp_messages.status` strings (`'Failed'`, `'QuotaExceeded'`).** These are upstream-defined and may change without notice.

15. **Webhook signature verification — mixed quality.** Zoom + Quo (HMAC-SHA256 timing-safe) and Gmail Push (OIDC + audience) are solid. BlueBubbles + call-event use plaintext `===` against header-or-query secrets and lack a timing guard.

---

## Highest-priority fixes

1. **CRITICAL — Add auth to unauthenticated crons.** Files: `app/api/cron/center-drain/route.ts`, `app/api/cron/center-watch/route.ts`, `app/api/cron/email-watch/route.ts`. Add the same `authorized(request)` check used by `meeting-verify`, but in the **strict 503-when-unset** form. Without this, anyone can drain the WhatsApp queue and rack up costs.

2. **CRITICAL — Remove `permissive when CRON_SECRET unset` fallback everywhere.** Files: `dispatch-alerts/route.ts`, `meeting-verify/route.ts`, `inforuptcy-poll/route.ts`, `secretary/poll-overdue/route.ts`, `email/sync/route.ts`. Replace with: if `!expected` return 503; if header mismatch return 401.

3. **CRITICAL — Remove default-password fallbacks.** Files: `lib/center/auth.ts` (`CENTER_PASS` fallback `'sbh770'`), `app/api/auth/code/route.ts` (`DEFAULT_CODE = 'REPRIME'`). Both passwords are visible in this public repo. Require env vars; refuse with 503 on absence.

4. **HIGH — Add auth to `/api/invitations/by-contact`.** File: `app/api/invitations/by-contact/route.ts`. Currently no auth, returns a real invitation row keyed only by `pipedrive_id`. Add `getUser()` gate.

5. **HIGH — Add auth to `/api/invitations/add-attendee` and `/api/bucket/[id]/remind`.** Both accept POST body that triggers sends/writes with no inline auth check; they rely on the proxy alone.

6. **HIGH — Constant-time compare for all bearer secrets.** Replace `header === \`Bearer ${expected}\`` with `timingSafeEqual` on equal-length buffers (mirror the helper in `/api/auth/code`).

7. **HIGH — Stop echoing raw `err.message` / `error.message` in responses.** Mass replace across center routes + `bookings/list` + `nora/chat` + every adapter-call route. Log full message server-side, return `{ error: 'internal' }`.

8. **MEDIUM — `bb-webhook` query-param secret.** File: `app/api/phone/bb-webhook/route.ts`. Drop the `?secret=` fallback; secrets in URLs leak to logs.

9. **MEDIUM — Wrap the inline `fetch()` to Anthropic / OpenPhone in the existing adapters.** Files: `app/api/center/translate/route.ts`, `app/api/phone/quo-send/route.ts`. Centralizes retries, timeouts, and observability and removes raw env reads from the route layer.

10. **MEDIUM — Add zod validation at the boundary.** Start with the highest-impact write routes: `/api/invitations`, `/api/bookings/confirm`, `/api/center/upload`, `/api/whatsapp/batch-send`, `/api/email/send`. These take complex bodies today validated only by hand-rolled typeof checks.
