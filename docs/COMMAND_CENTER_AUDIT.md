# Command Center Audit — 2026-07-02, HEAD f5ab5d3

Synthesized from six repository mappers (API routes, frontend, data layer, integrations/env, docs/knowledge, quality gates), with every headline claim re-verified against code at HEAD `f5ab5d3` ("feat(cockpit): fix email account mix-up, actionable integration pill, kiosk-grade button sizing"). Where mappers disagreed with each other or with older docs, the code wins; discrepancies are called out inline.

---

## 1. Executive Summary

The cockpit's core loop — WhatsApp/SMS comms, email triage + reply, calendar, briefings, notes, Nora chat/voice — is real and wired; quality gates are green (tsc clean, 142/142 Vitest tests pass). The single biggest systemic failure is **scheduled automation: 5 of 10 vercel.json crons never execute** — `dispatch-alerts`, `secretary/poll-overdue`, and `meeting-verify` are proxy-redirected to `/login` (not in `proxy.ts` PUBLIC_PATHS), while `slack-digest` and `bucket/fire-reminders` export POST only and Vercel cron issues GET (405). Reminder firing, PagerDuty alerting, overdue-ask nudges, meeting attendance verification, and the daily Slack digest are all silently dead. Three inbound webhooks (`zoom/webhook`, `zoom/ai-companion-ingest`, `phone/call-event`) are likewise unreachable by their sessionless callers. Three write endpoints accept unauthenticated input: `whatsapp/webhook` (no verification at all), `quo-webhook` (signature skipped when header omitted), and `center/warm-card` + `center/reconcile` GET (no auth). Roughly a third of `components/cockpit` is orphaned dead code, several live buttons are decorative, and two Supabase migrations remain unapplied (Gideon-only action). The 2026-06-18 exposed-secrets list is still unrotated in this **public** repo. Most fixes are one-commit sized; the repair order in §11 sequences them smallest-risk-first.

## 2. Stack Overview

| Layer | Details |
|---|---|
| Framework | Next.js 16.2.4 App Router (middleware = `proxy.ts`, not middleware.ts), React 19.2.4, TypeScript 5.9.3. Local builds require `next build --webpack` (Turbopack darwin-arm64 binding missing); Vercel builds Turbopack fine. |
| Auth | 4 mechanisms: (1) Supabase SSR session hard-gated to `g@reprime.com` in `proxy.ts`; shared access-code login via `/api/auth/code` (fail-closed on missing `AUTH_ACCESS_CODE`); (2) board password `x-center-pass` via `centerAuthed` (timing-safe, fail-closed) on `/api/center/*`; (3) `CRON_SECRET` bearer — two variants: fail-closed timing-safe `cronAuthed()` (`lib/cron/auth.ts`) vs. older fail-OPEN inline checks; (4) capability tokens (invitation UUIDs, `CAPTAIN_API_TOKEN`, Google OIDC on gmail-push). |
| DB | Supabase Postgres (project `yrnujfhzmoasodawqfri`), ~70 routes use the service-role client (RLS bypassed). 8 migrations in `supabase/migrations/`, 3 standalone SQL files outside migration control. DDL only via Supabase SQL editor (direct DB password rotated). |
| Deploy | Vercel auto-deploy on push to `main` (project `project-7e87w.vercel.app`, team g-8390s-projects). CLI deploys broken — never use. 10 vercel.json crons. `reprime-terminal.com` serves `/api/*`, `/invite/*`, `/v/*` only (redirect exclusion is load-bearing). |
| Test | Vitest: 5 suites, 142 tests, all green, all in `lib/` — 0 route/component tests (~3.1% coverage by LOC: 786 test LOC vs 25k+ production). |
| Scale | 101 `route.ts` files under `app/api`, 153 tsx/jsx components, ~63k LOC. 25 top-level deps. Sentry wired but no-ops without `SENTRY_DSN`. |

## 3. Feature Status Matrix

### Cockpit UI (live tree, mounted from `components/cockpit/App.jsx`)

| Feature | Status | Evidence | Fix Required |
|---|---|---|---|
| Cockpit shell (fixed 4000×1440 canvas) | fully-working | `components/cockpit/App.jsx:77-81` | By design (kiosk for 5120×1440 monitor); overflow clips <1440px viewports |
| CockpitLiveDataProvider (60s poll, 7 endpoints) | fully-working | `components/cockpit/live/CockpitLiveData.jsx` | familyTag/noraDraft have no live source (`adapters.js:84-85`); staff regex duplicated from `lib/cockpit/staff-roster.ts` (`adapters.js:50`) |
| CommsPanel — lanes, WA/SMS send, uploads, Zoom link, AI summary | partial | `components/cockpit/panels/CommsPanel.jsx:864` (doSend) | Sent messages never appear in open thread — `doSend` sets sendState only, no refetch/optimistic append (verified: `useThreadMessages` fetches only on `[phone, panel]`, lines 87-117) |
| CommsPanel — 718 SMS/iMessage outbound | broken | `CommsPanel.jsx:822-823` (send silently disabled) | No send path exists; BlueBubbles Mac offline (Gideon) + no outbound client in repo |
| CommsPanel — RemindBell / ReminderPicker | UI-no-logic | `CommsPanel.jsx:1267, 1309` | Local-state only, fake success; wire to `/api/bucket` + reminders |
| CommsPanel — Nora "elevated read" action chips | UI-no-logic | `CommsPanel.jsx:786-806` (no onClick) | Wire or remove; the "Nora draft" is a hardcoded template (`:456-457`), not AI |
| CommsPanel — ★ Profile button | UI-no-logic | `CommsPanel.jsx:570-578` | Targets `InvestorProfileDrawer` which is never imported/mounted anywhere (verified by grep) |
| EmailPanel — tabs, search, compose/reply, AI draft/read, read-toggle | partial | `components/cockpit/panels/EmailPanel.jsx` | Opened email shows snippet only, body never fetched (`:777`); tab badge shows total when unread=0 (`:88-92`); hardcoded fallback URL `project-7e87w.vercel.app` (`:1285`) |
| EmailPanel — attach paperclip, Nora chips, RemindButton, VoiceMessageButton | UI-no-logic | `EmailPanel.jsx:1132-1139, 856, 886-905, 1193` | No onClick / local-only / intentionally disabled; also invalid nested `<button>`s at `:490-491` |
| TopChrome — meeting banner, PTT→Whisper→Nora, Concierge, clock, Shabbat pill, sign-out | partial | `components/cockpit/chrome/TopChrome.jsx:91-131` | SpeedSelector writes `speechifySpeed` nothing reads (`:658-687`; `voiceClient.js` never sets playbackRate); NoraLiveStatus always "idle" (`:617-656`); Row3 demo copy unreachable (`:354-365`) |
| IntegrationStatusPill | fully-working | `components/cockpit/chrome/IntegrationStatusPill.jsx`, mounted `TopChrome.jsx:171` | None. **Mapper conflict resolved:** the integrations mapper claimed this pill "does not exist" and `lib/cockpit/integration-setup-links.ts` is unwired — wrong at HEAD; it landed in f5ab5d3 and imports `getSetupLink` (verified). Docs' "health pill unbuilt" (ERROR_HANDLING_AND_OBSERVABILITY.md) is now stale. |
| SearchPalette (⌘K) | fully-working | `components/cockpit/chrome/SearchPalette.jsx` | Event/email rows display-only (`:164, :175`) — acceptable |
| RecentlyActiveStrip | partial | `components/cockpit/chrome/RecentlyActiveStrip.jsx` | FAMILY strip can never populate (no familyTag source) — permanently "Quiet at home." |
| CalendarPanel | fully-working | `components/cockpit/panels/CalendarPanel.jsx` | Dictated memo is session-only (not persisted) |
| BriefPanel (morning + evening) | fully-working | `components/cockpit/panels/BriefPanel.jsx` | Unused local Card component (`:270`) |
| NotesPanel (full CRUD) | fully-working | `components/cockpit/panels/NotesPanel.jsx` | Delete has no confirm (per FRONTEND_INTERACTION_AUDIT) |
| NorasDesk (bucket + asks cards, Done/Snooze/Remind) | fully-working | `components/cockpit/panels/NorasDesk.jsx` | Unwired actions honestly rendered disabled (`:329-347`) |
| NoraChat | partial | `components/cockpit/panels/NoraChat.jsx:97-108` vs `:203` | **Verified bug:** `nora:sendMessage` listener registered with `[]` deps captures mount-time `send`, but `send`'s deps are `[turns, sending, live, speak]` (line 203) — PTT messages go out with empty history + mount-time empty context. Route through a ref. |
| BriefingDrawer / ReligiousCalendarDrawer | fully-working | `components/cockpit/drawers/` | ReligiousCalendarDrawer "Tag contact observance" chips are static decoration (`:124-139`) |
| InviteComposerDrawer | mock-only | `components/cockpit/drawers/InviteComposerDrawer.jsx:186-229, 301-317` | Opens from Concierge but nothing works: hardcoded slots ("Mon May 11 14:30 CT"), no onClick on channel/duration, send disabled "setup required". Wire to `/api/bookings/available-slots` + `send-invitation` or remove entry point |
| ZoomWindow / WindowShell | mock-only | `components/cockpit/windows/ZoomWindow.jsx` | Unreachable (needs `meetingState==='zoom-with-susan'`, settable only by unmounted DemoStatesPanel) |
| ToastStack / MissionToast | mock-only | `components/cockpit/toasts/ToastStack.jsx` | Renders nothing in prod; would show fake content if triggered. Live toasts handled by `components/center/ReminderToast` (App.jsx:141) |
| KeyboardShortcutsModal | partial | `components/cockpit/modals/KeyboardShortcutsModal.jsx` | Lists "Space PTT" and "⌘\ EN/HE" shortcuts that aren't implemented globally |
| Orphaned panels (Investors/Bucket/Deals/Ops/TerminalActivity) | mock-only (dead code) | `components/cockpit/panels/{InvestorsPanel,BucketPanel,DealsPanel,OpsPanel,TerminalActivityPanel}.jsx` | Never imported (verified for InvestorProfileDrawer; mapper-verified for rest). Delete or archive |
| Orphaned pillars / wideTabs / 3 drawers / DemoStatesPanel / buttonStyles / voiceCommands | mock-only (dead code) | `components/cockpit/pillars/`, `wideTabs/`, `drawers/{InvestorProfileDrawer,CallerIdDrawer,EmailComposeDrawer}.jsx`, `lib/{buttonStyles.js,voiceCommands.js}` | Zero importers. Note: `DemoContext.jsx`/`demoStateReducer.js` ARE load-bearing (global UI store) — only the panel is dead; ~20 reducer keys permanently at defaults |
| Mock data corpus | mock-only | `components/cockpit/data/` (~1,700 lines) | Referenced only by orphaned components; safe to delete with them |
| Login page | fully-working | `app/login/page.tsx` | None |
| Legacy surfaces (/center, /center/v2, /legacy) | partial | `app/center/page.tsx`, `app/center/v2/page.tsx`, `app/legacy/page.tsx` | Kept as fallbacks per HANDOFF-BRIEF — do NOT delete without Gideon confirmation |

### API surfaces

| Feature | Status | Evidence | Fix Required |
|---|---|---|---|
| AI routes (concierge, draft, summarize, email/draft, nora/chat+history) | fully-working | `app/api/ai/*`, `app/api/nora/*` | Echo raw Anthropic err.message to authed client (part of error sweep) |
| Auth (code login, signout) | fully-working (needs-env) | `app/api/auth/code/route.ts` | Fail-closed 503 if `AUTH_ACCESS_CODE` unset in Vercel (flagged missing in FINAL_REPAIR_REPORT) |
| Bookings (available-slots, confirm, list, send-invitation) | fully-working | `app/api/bookings/*` | available-slots leaks `err.message` to unauthenticated callers (verified `route.ts:303`) |
| Briefings (today, evening) | fully-working | `app/api/briefing/*` | None (3s section timeouts, degraded flag) |
| Bucket CRUD + remind | fully-working | `app/api/bucket/*` | None |
| **Bucket fire-reminders cron** | **broken** | `app/api/bucket/fire-reminders/route.ts:23` — POST only (verified); vercel.json schedules `* * * * *` GET | Add `export const GET = POST`-style handler; reminders never fire |
| Calendar today | fully-working | `app/api/calendar/today/route.ts` | — |
| Center suite (approval, check, inbox, reply, reply-media, send, status, track, translate, upload, outcome, remind, export, contacts-export, email-audit, history, lock-identities, voice-process, gmail-whoami) | fully-working | `app/api/center/*` | All board-password gated via `centerAuthed`; error.message echoes are password-gated only |
| Center gmail-push | fully-working | `app/api/center/gmail-push/route.ts` | Real Google OIDC verification (`GMAIL_PUSH_AUDIENCE`) |
| **Center reconcile GET** | **broken (unprotected)** | `app/api/center/reconcile/route.ts:146` — `GET()` has no auth check (verified; POST at `:127` is gated) | This IS the */5 cron entry; add `cronAuthed \|\| centerAuthed` to GET |
| **Center warm-card** | **broken (unprotected)** | `app/api/center/warm-card/route.ts:26,63` — no auth on POST or GET (verified) | Open unauthenticated write (storage) bounded by UUID guessing; add auth or validate invite token freshness |
| Contacts (block, import-names) | fully-working | `app/api/contacts/*` | — |
| Crew (list, delegate) | fully-working | `app/api/crew/*` | — |
| Cron center-drain | fully-working | `app/api/cron/center-drain/route.ts` | Gold standard: `cronAuthed` fail-closed + PUBLIC_PATHS + GET + scheduled |
| Cron center-watch / email-watch | partial (never runs) | `app/api/cron/{center-watch,email-watch}/route.ts` | Public + authed + GET but **no vercel.json entry** (verified: 10 crons, neither listed) — add schedules or delete their claim comments |
| **Cron dispatch-alerts** | **broken** | `app/api/cron/dispatch-alerts/route.ts:27-31` fail-open auth (verified); path absent from `proxy.ts` PUBLIC_PATHS (verified) | Vercel cron GET redirected to /login — PagerDuty queue never drains. Add to PUBLIC_PATHS + switch to `cronAuthed` |
| Cron gmail-watch-arm | fully-working | `app/api/cron/gmail-watch-arm/route.ts` | Fail-open if `CRON_SECRET` unset; standardize on cronAuthed |
| Cron inforuptcy-poll | fully-working (needs-env) | `app/api/cron/inforuptcy-poll/route.ts` | Fail-open auth; docs flag Vercel timeout risk (maxDuration 300 set); needs `INFORUPTCY_EMAIL/PASSWORD` |
| **Cron investor-cadence** | **broken** | `app/api/cron/investor-cadence/route.ts`; not in PUBLIC_PATHS (verified) | Its only caller (slack-digest self-fetch) gets proxy-redirected; add to PUBLIC_PATHS |
| **Cron meeting-verify** | **broken** | `app/api/cron/meeting-verify/route.ts`; scheduled */30 but not in PUBLIC_PATHS (verified) | Attendance stamping + no-show nudges never run. Add to PUBLIC_PATHS + cronAuthed |
| **Cron slack-digest** | **broken** | `app/api/cron/slack-digest/route.ts:214` — POST only (verified); cron issues GET → 405 | Add GET handler; also fix investor-cadence proxy block for its cadence section |
| Email sync (cron) | fully-working | `app/api/email/sync/route.ts:330-331` — `export const GET = runSync; export const POST = runSync` (verified) | Fail-open auth; standardize |
| Email (triage, send, mark-read) | fully-working | `app/api/email/*` | Sends via SendGrid, not Gmail API — never appears in Gmail Sent (documented rebuild item) |
| Google connect-secondary + callback | fully-working | `app/api/google/connect-secondary/` | No OAuth `state` param (minor CSRF); session-gated via proxy |
| Health | fully-working | `app/api/health/route.ts` | Public by design; env NAMES only |
| Investors (cadence, reminder) | fully-working / needs-migration | `app/api/investors/*` | `reminder` hard-500s if `investor_reminders` table absent (standalone SQL, apply-status unknown) |
| Invitations (mint, by-contact, token routes, add-attendee, .ics) | fully-working | `app/api/invitations/*` | `by-contact` correctly in PROTECTED_OVERRIDES (verified in proxy.ts); mint token compare non-timing-safe (nit) |
| Messages failed-recent | fully-working | `app/api/messages/failed-recent/route.ts` | — |
| Notes CRUD | fully-working | `app/api/notes/route.ts` | error.message echoes (authed) |
| Outreach export | fully-working | `app/api/outreach/export/route.ts` | Session-gated via proxy (public `/outreach` prefix doesn't match `/api/outreach` — verified reasoning correct) |
| Phone bb-webhook | partial | `app/api/phone/bb-webhook/route.ts` | Fail-OPEN if `BLUEBUBBLES_WEBHOOK_SECRET` unset; accepts `?secret=` query param (log leak risk); non-timing-safe |
| **Phone call-event** | **broken** | `app/api/phone/call-event/route.ts`; not in PUBLIC_PATHS (verified) | Sessionless daemon proxy-redirected; also fail-open `BB_CALL_SECRET` + missing from .env.example |
| Phone quo-send (305 SMS) | fully-working | `app/api/phone/quo-send/route.ts:39` reads `QUO_API_KEY` (verified) | None — note FIX_AUDIT's "SMS outbound deferred" is stale; commit b5cbaaa landed it |
| **Phone quo-webhook** | **broken (unprotected)** | `app/api/phone/quo-webhook/route.ts:100-108` — `if (sig) { verify }` (verified) | Omitting the `openphone-signature` header bypasses HMAC entirely; make header mandatory |
| Phone recording proxy | fully-working | `app/api/phone/recording/[id]/route.ts` | — |
| Pipedrive suite (search, person, notes, resolve, enrich, bulk-import) | fully-working | `app/api/pipedrive/*` | — |
| Religious calendar (Hebcal) | fully-working | `app/api/religious-calendar/route.ts` | HANDOFF-BRIEF "hardcoded heuristic" claim is stale — live Hebcal since commit 56891ff |
| Secretary asks | fully-working | `app/api/secretary/asks/route.ts` | — |
| **Secretary poll-overdue cron** | **broken** | `app/api/secretary/poll-overdue/route.ts`; scheduled hourly but not in PUBLIC_PATHS (verified) | Overdue nudges never fire. Add to PUBLIC_PATHS + cronAuthed |
| Tags (apply, bulk-upload) | fully-working | `app/api/tags/*` | — |
| Voice (speak, transcribe-en/he) | fully-working (needs-env) | `app/api/voice/*` | `ELEVENLABS_VOICE_ID` required by speak but not checked by adapter (health can show green while TTS fails); transcribe-en `process.env.OPENAI_API_KEY!` non-null assertion crashes if both Groq+OpenAI keys absent |
| WhatsApp (threads, messages, batch-send, investor-threads×2) | fully-working / needs-migration | `app/api/whatsapp/*` | `threads/[id]` PATCH returns 503 `migration_not_applied` until lane-override migration runs (verified `route.ts:62-67`) |
| **WhatsApp webhook** | **broken (unprotected)** | `app/api/whatsapp/webhook/route.ts` — zero signature/secret verification (verified by grep) | Any POST injects fake messages + burns Anthropic/Whisper spend; raw payload console-logged up to 8KB. Add shared-secret (coordinate Timelines config — Gideon gate) |
| **Zoom webhook** | **broken** | `app/api/zoom/webhook/route.ts`; not in PUBLIC_PATHS (verified) | Zoom's POSTs (incl. CRC) redirected to /login. Once exposed: signature only checked when header present — fix both together |
| **Zoom AI-companion ingest** | **broken** | `app/api/zoom/ai-companion-ingest/route.ts`; not in PUBLIC_PATHS (verified) | Meeting summaries never land; its only "auth" is a spoofable From-domain form field — do NOT allowlist as-is, add a real secret first |
| Zoom create-meeting | fully-working | `app/api/zoom/create-meeting/route.ts` | Degrades to `STATIC_ZOOM_FALLBACK_URL` gracefully; session via proxy only |

## 4. Broken Feature List

1. **Reminders never fire.** `/api/bucket/fire-reminders` exports POST only; Vercel cron issues GET → 405 every minute. Root cause: method mismatch (`app/api/bucket/fire-reminders/route.ts:23`, verified). Cockpit RemindPicker POSTs real reminder rows that nothing ever fires.
2. **Daily Slack digest never posts.** Same POST-only/GET-cron mismatch (`app/api/cron/slack-digest/route.ts:214`, verified).
3. **PagerDuty alert queue never drains.** `/api/cron/dispatch-alerts` scheduled every minute but absent from `proxy.ts` PUBLIC_PATHS → cron GET is 307-redirected to /login and "succeeds" silently (verified against proxy.ts:5-50).
4. **Overdue-ask nudges never run.** `/api/secretary/poll-overdue` — same proxy block (scheduled hourly, not in PUBLIC_PATHS).
5. **Meeting attendance verification never runs.** `/api/cron/meeting-verify` — same proxy block (scheduled */30).
6. **Investor-cadence cache warmer unreachable.** `/api/cron/investor-cadence` not in PUBLIC_PATHS; its only caller (slack-digest self-fetch) is proxy-blocked too.
7. **Zoom webhook can never receive events.** Not in PUBLIC_PATHS → CRC handshake and live events blocked; secondary omit-header signature bypass once exposed.
8. **Zoom AI Companion summaries never land.** `/api/zoom/ai-companion-ingest` proxy-blocked; interior auth is a spoofable From-domain check.
9. **Phone call-event ingest dead.** `/api/phone/call-event` proxy-blocked; the call-log daemon can never deliver; `BB_CALL_SECRET` fail-open and undocumented.
10. **center-watch and email-watch never run automatically.** Routes are healthy but have no vercel.json cron entry despite their comments claiming schedules (verified: 10 entries, neither present).
11. **Sent WhatsApp/SMS messages don't appear in the open thread.** `CommsPanel.jsx` `doSend` (line 864) never refetches or appends; `useThreadMessages` only fetches on thread change (verified).
12. **PTT→Nora sends with empty history/context.** `NoraChat.jsx` `nora:sendMessage` listener (`:97-108`, empty deps) captures mount-time `send`, whose real deps are `[turns, sending, live, speak]` (`:203`, verified) — the in-code comment claiming `send` is stable is wrong.
13. **718 iMessage/SMS outbound has no send path** (`CommsPanel.jsx:822-823`); BlueBubbles Mac offline (Gideon-only) and no outbound client exists in the repo (`lib/bluebubbles/` is status-check only).
14. **Investor/staff lane manual toggle no-ops** until `2026-06-23-whatsapp-threads-lane-override.sql` is applied — PATCH returns 503 `migration_not_applied` (verified `app/api/whatsapp/threads/[id]/route.ts:62-67`).
15. **/api/investors/reminder hard-500s** if `investor_reminders` table is missing (standalone `supabase/investor_reminders_migration.sql`, apply-status unknown).
16. **Quo health signal is wrong.** `lib/quo/status.ts:4` and `lib/cockpit/integration-setup-links.ts:34` check `OPENPHONE_API_KEY` while every real route reads `QUO_API_KEY` (verified) — the pill can show setup_required while SMS works, and vice versa.
17. **iMessage ingest dead** — cloud Mac at the BlueBubbles endpoint offline; only Gideon can power it on (env/infra, not code).

## 5. Dead / Fake UI List

- CommsPanel ★ Profile button (`CommsPanel.jsx:570-578`) — sets state read only by never-mounted `InvestorProfileDrawer`.
- CommsPanel RemindBell (`:1267`) and ReminderPicker (`:1309`) — local-state fake success, no API call.
- CommsPanel NoraElevatedRead action chips (`:786-806`) — no onClick; "Nora draft" is a hardcoded template (`:456-457`), not AI.
- CommsPanel ListenButton at `:598` — rendered without text prop, silently no-ops (same pattern `EmailPanel.jsx:490-491`, `InviteComposerDrawer.jsx:318`).
- EmailPanel paperclip attach (`:1132-1139`), Nora chips (`:856, 886-905`), RemindButton (local-only), VoiceMessageButton (`:1193`, intentionally disabled).
- TopChrome SpeedSelector (`:658-687`) — writes `speechifySpeed`; `lib/voiceClient.js` never reads it / never sets playbackRate.
- TopChrome NoraLiveStatus (`:617-656`) — permanently "idle"; Listen/Participate toggle writes unread state.
- TopChrome Row3 demo branches (`:354-365`) — hardcoded "Doron Zoom"/"Bay Valley" copy with no-op CTA, unreachable.
- InviteComposerDrawer — entire drawer non-functional (see matrix).
- ZoomWindow — unreachable mock meeting window.
- ReligiousCalendarDrawer "Tag contact observance" chips (`:124-139`) — static decoration.
- KeyboardShortcutsModal — lists two unimplemented shortcuts.
- FAMILY strip in RecentlyActiveStrip — permanently empty (no familyTag source, `adapters.js:84-85`).
- Orphaned-but-listening: CommsPanel's `openInvestorChat` listener is live but its only dispatcher (InvestorsPanel) is unmounted.
- NotesPanel delete — works but no confirm step.

## 6. Mock/Static Data List

- `components/cockpit/data/` — entire old mock corpus (threads/emails/calendar/deals/investors/morningBrief/noraDesk/notes/pinned/tasks/terminalFeed, ~1,700 lines), imported only by orphaned components.
- `components/cockpit/toasts/ToastStack.jsx` — hardcoded sample toasts ("Filing Bay-Valley-Counter-LOI-v2.pdf", "Call Steve…"), gated on demo keys that are never set.
- `InviteComposerDrawer.jsx:225-229` — hardcoded time slots "Mon May 11 14:30 CT".
- `CommsPanel.jsx:456-457` — hardcoded "Nora draft" reply template presented as AI output.
- `TopChrome.jsx:354-365` — "Doron Zoom"/"Bay Valley" demo copy.
- `ZoomWindow.jsx` — "Daniel Schuchalter" / Nora Sterling placeholder tiles.
- `EmailPanel.jsx:1285` — hardcoded fallback URL `project-7e87w.vercel.app`.
- Orphaned panels/pillars/wideTabs/drawers — all render static mocks (see matrix).

## 7. Dependency & Environment Variable Map

Env NAMES only. ✗ = referenced in code but **missing from `.env.example`** (verified).

| Integration | Env vars |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+legacy `SUPABASE_URL`) |
| Auth / cron / board | `AUTH_ACCESS_CODE` (fail-closed; flagged missing in Vercel), `CRON_SECRET`, `CENTER_PASSWORD`, `CAPTAIN_API_TOKEN` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` (legacy `GOOGLE_CLIENT_ID`/`SECRET` fallback), `GOOGLE_REFRESH_TOKEN` (= g@floridastatetrust.com), `GOOGLE_REFRESH_TOKEN_2` (= g@reprime.com, not yet minted), `GMAIL_PUSH_AUDIENCE`, `SHEETS_OUTREACH_TAB` |
| Timelines.ai (WhatsApp) | `TIMELINES_API_KEY` — **no inbound webhook secret exists at all** |
| Quo/OpenPhone (SMS) | `QUO_API_KEY`, `QUO_SEND_FROM`, `QUO_WEBHOOK_SECRETS`/`QUO_WEBHOOK_SECRET`; ✗ `OPENPHONE_API_KEY` (read only by the mis-wired status adapter — fix the adapter, don't add the var) |
| Zoom | `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN` (flagged missing in Vercel), `STATIC_ZOOM_FALLBACK_URL` |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (flagged missing), `SENDGRID_FROM_NAME` |
| Pipedrive | `PIPEDRIVE_API_TOKEN` |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (fully graceful when absent) |
| Voice | `OPENAI_API_KEY`, `GROQ_API_KEY` (flagged missing; OpenAI fallback works), `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (required by speak, NOT checked by adapter) |
| Slack | `SLACK_WEBHOOK_URL` (graceful) |
| PagerDuty | `PAGERDUTY_ROUTING_KEY` (client throws when unset) |
| Apollo | `APOLLO_API_KEY` (graceful stub) |
| BlueBubbles | `BLUEBUBBLES_WEBHOOK_SECRET`; ✗ `BLUEBUBBLES_SERVER_URL`, ✗ `BLUEBUBBLES_PASSWORD` (read only by status check — no outbound client exists), ✗ `BB_CALL_SECRET` (call-event route) |
| Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (silent no-op when unset); build-time ✗ `SENTRY_ORG`, ✗ `SENTRY_PROJECT`, ✗ `SENTRY_AUTH_TOKEN` (next.config.ts) |
| InfoRuptcy | `INFORUPTCY_EMAIL`, `INFORUPTCY_PASSWORD`, `CHROME_PATH` (local) |
| Hebcal | keyless; optional `ZMANIM_ZIP` (defaults 52162) |

Every var present in `.env.example` has a live reader (mapper-verified). Not-graceful-when-missing clients: PagerDuty, SendGrid, Timelines, Pipedrive (all throw → 500 unless caller catches).

## 8. Database & Schema Drift

**Declared in `supabase/migrations/` and used (8):** `bucket_items`, `email_scores`, `crew_members`, `reminders` (2026-05-05-center.sql), `inforuptcy_filings` (2026-05-05-inforuptcy.sql), `outbound_asks` (2026-05-05-secretary.sql), `blocked_contacts` (2026-05-06-whatsapp-is-blocked.sql), `nora_chat_messages` (2026-06-22-nora-chat.sql).

**Recovered by 2026-06-29-schema-drift-recovery.sql (13, back-filled CREATEs for tables that predate the repo):** `invitations` (54 refs — heaviest), `whatsapp_threads`, `whatsapp_messages`, `roster`, `roster_emails`, `tags`, `thread_tags`, `approvals`, `gmail_watch_state`, `notes`, `tr_cache`, `zoom_events`, `meeting_summaries`.

**Still drift — declared only in standalone SQL outside `supabase/migrations/`, apply-status unknown (3):**
- `contact_directory` (`supabase/overnight_migration.sql`) — graceful: `lib/contact-directory/client.ts` returns null on 42P01 (lines 43, 171).
- `phone_calls` (`supabase/phone_calls_migration.sql`) — call-event hard-500s; quo-webhook logs-and-continues. Write-only: no read route/UI.
- `investor_reminders` (`supabase/investor_reminders_migration.sql`) — `/api/investors/reminder` hard-500s if absent.

**Pending migrations (Gideon-only, Supabase SQL editor — direct DB password rotated):**
1. `2026-06-23-whatsapp-threads-lane-override.sql` — blast radius: PATCH `/api/whatsapp/threads/[id]` 503s (verified); GET degrades gracefully (`lane_override ?? null`); cockpit Staff lane falls back to roster auto-detect; manual lane moves dead.
2. `2026-06-29-schema-drift-recovery.sql` — blast radius in prod is low (tables already exist) but Realtime publication adds are missing and a fresh Supabase bootstrap from the repo fails on 13 tables (DATABASE_AUDIT.md:187).

`attachments` is a Supabase **Storage bucket**, not a table (all 6 `.from('attachments')` hits are `supabase.storage.from()`); no SQL governs it — must exist in Storage.

## 9. Security Notes

**Unauthenticated write endpoints (highest priority):**
1. `/api/whatsapp/webhook` — zero verification of any kind (verified). Fake message injection + LLM/Whisper spend burn; raw payload console-logged up to 8KB.
2. `/api/phone/quo-webhook` — HMAC verified **only when the `openphone-signature` header is present**; omit it and the check is skipped entirely (verified `route.ts:100-108`).
3. `/api/center/warm-card` — no auth on GET or POST (verified `route.ts:26,63`); unauthenticated storage writes bounded by invite-UUID guessing.
4. `/api/center/reconcile` GET — no auth (verified `route.ts:146`); anyone can trigger 12-contact service-role reconciles + Timelines API burn.

**Fail-open cron auth** (allow-all when `CRON_SECRET` unset, non-timing-safe): dispatch-alerts, meeting-verify, inforuptcy-poll, secretary/poll-overdue, email/sync, gmail-watch-arm. Standardize on `lib/cron/auth.ts` `cronAuthed()` (fail-closed, timing-safe). Similarly fail-open: bb-webhook (`BLUEBUBBLES_WEBHOOK_SECRET`), call-event (`BB_CALL_SECRET`); bb-webhook also accepts `?secret=` in the query string (log-leak risk).

**Error-message leakage:** near-universal `error.message` echoing, but almost all behind session/board-password auth. The only unauthenticated leak: `/api/bookings/available-slots` returns `(err as Error).message` to the public (verified `route.ts:303`). 35+ routes queued for a `safeError()` sweep; 12 routes have no try/catch at all (ERROR_HANDLING_AND_OBSERVABILITY.md).

**2026-06-18 exposed-secrets rotation list — STILL OPEN (all verified still present):**
- Hardcoded `CAPTAIN_API_TOKEN` value in `scripts/generate-email-only-drafts.mjs` (~line 27).
- Shared login password in `_terminal-design-reference/briefs/TERMINAL_ENGINE_MASTER_BRIEF.md`.
- BlueBubbles / cloud-Mac / SSH passwords + server IP in `SESSION_HANDOFF_2026-05-04.md`.
- **New finding:** `proxy.ts:39` comment still names the old center board password value in plaintext (the runtime fallback was removed 2026-06-29, but the comment survives in this public repo) — scrub it.
- Tension: rotation conflicts with the standing "never rotate keys" directive (HANDOFF-BRIEF) — Gideon decision gate. The repo being public (should be private) makes this urgent.

**Other:** ~70 routes use service-role (RLS bypassed) — acceptable single-tenant, fatal for the multi-tenant roadmap. No zod validation at any route boundary. Google connect-secondary OAuth flow lacks a `state` param (minor CSRF). `/api/invitations` mint token compare is non-timing-safe.

## 10. Known Constraints & Non-Goals (from docs)

- **NOT a public product** — single-tenant, Gideon-only (`proxy.ts` hardcodes `g@reprime.com`). Multi-tenancy is a future rebuild (REBUILD-BLUEPRINT.md), not now.
- **NOT a Pipedrive replacement** — it surfaces Pipedrive data; Pipedrive stays source of truth.
- **NOT investor-facing** — that is RePrime Terminal, a separate surface. Core thesis: velocity over data depth.
- **Gideon decision gate** — anything changing live dashboard behavior, recurring cost, credentials, or scope needs his sign-off first.
- **Two LOCKED reference builds** (terminal-artifact-v2.vercel.app, public-nu-six-60.vercel.app) — read-only.
- **Public repo: env var NAMES only, never values.** In tension with the "never rotate keys" directive.
- **Deploy only via git push to main** (Vercel CLI broken for both teams); env vars settable only via Vercel REST API.
- **DB DDL via Supabase SQL editor only** (direct password rotated).
- **Local builds: `next build --webpack`** (Turbopack darwin-arm64 binding missing).
- **Accessibility:** Gideon is severely dyslexic, voice-first, Speechify at 2x — every AI text block needs a Listen button; one question at a time; edit-never-rebuild.
- **vercel.json redirect must keep excluding `/api/` paths** (`/((?!api/|invite/|v/).*)`) or Timelines webhooks break (regression already happened once).
- **Legacy code preserved** — `components/center/*`, `components/chat/*` (/legacy fallback) must not be deleted without confirmation; banned-forever Yosef assets (KEYS.md); banned copy phrases ("$15 billion deployed", "3,000+ transactions", "distressed"); Adir Yonasi never on broker-facing copy; monthly-only billing; Amelia McMurray & Dovber Gratsiani removed from roster 2026-05-05 (stale docs still list them).
- **Stale docs to distrust:** HANDOFF.md (2026-04-30 Windows-era architecture), KEYS.md "defaults to REPRIME" (fallbacks removed — now fail-closed), FIX_AUDIT's "SMS outbound deferred / no ⌘K / no HE toggle" (all landed later), "Shabbat is hardcoded heuristic" (now live Hebcal), "'.env.example missing" (exists, 49 vars), the dated-Anthropic-model-ID rule (undated `claude-haiku-4-5` verified valid), and ERROR_HANDLING's "health pill unbuilt" (IntegrationStatusPill shipped in f5ab5d3).

## 11. Recommended Repair Order

Smallest-risk-first; each item sized to one commit. Items marked **[G]** need Gideon (env/infra/decision gate).

### (a) Pure fixes

1. Add a GET export to `/api/bucket/fire-reminders` (delegate to the existing POST body) — un-breaks every scheduled reminder.
2. Add a GET export to `/api/cron/slack-digest` — un-breaks the daily digest.
3. Add `/api/cron/dispatch-alerts`, `/api/secretary/poll-overdue`, `/api/cron/meeting-verify`, `/api/cron/investor-cadence` to `proxy.ts` PUBLIC_PATHS (each already has an in-route gate; pair with item 4).
4. Standardize all fail-open cron auth on `cronAuthed()` (`lib/cron/auth.ts`): dispatch-alerts, meeting-verify, inforuptcy-poll, secretary/poll-overdue, email/sync, gmail-watch-arm — one-line each, fail-closed + timing-safe.
5. `/api/phone/quo-webhook`: return 401 when the `openphone-signature` header is absent (close the omit-header bypass).
6. `/api/center/reconcile` GET: require `cronAuthed(request) || centerAuthed(request)`.
7. `/api/center/warm-card`: add `centerAuthed` on POST and cron/board auth on GET (or verify the invite token maps to a pending invitation before doing work).
8. Fix the Quo env mismatch: point `lib/quo/status.ts` and `lib/cockpit/integration-setup-links.ts:34` at `QUO_API_KEY` (+ `QUO_SEND_FROM`) — makes the integration pill truthful.
9. `/api/bookings/available-slots`: replace the echoed `err.message` with a generic error (only unauthenticated leak).
10. Scrub the old board-password value from the `proxy.ts:39` comment (public repo).
11. NoraChat stale closure: hold `send` in a ref (`sendRef.current = send`) and have the `nora:sendMessage` listener call the ref — PTT gets real history/context.
12. CommsPanel `doSend`: on success, optimistically append the sent message and/or trigger a thread refetch.
13. Add missing env NAMES to `.env.example`: `BB_CALL_SECRET`, `BLUEBUBBLES_SERVER_URL`, `BLUEBUBBLES_PASSWORD`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (drop `OPENPHONE_API_KEY` references per item 8); add `ELEVENLABS_VOICE_ID` to the ElevenLabs adapter check.
14. `safeError()` sweep: shared helper returning `{ error: 'internal' }` + server-side log/Sentry across the 35+ leaking routes; add try/catch to the 12 bare routes (voice routes first).
15. **[G]** Rotate the 2026-06-18 exposed secrets and delete the hardcoded token from `scripts/generate-email-only-drafts.mjs` + the two handoff docs — requires overriding the "never rotate keys" directive; flip repo private.

### (b) Wiring / completion of existing features

16. **[G]** Apply the two pending migrations in the Supabase SQL editor (`2026-06-23-whatsapp-threads-lane-override.sql`, then `2026-06-29-schema-drift-recovery.sql`) — unlocks manual lane toggle; then fold the 3 standalone SQL files (`investor_reminders`, `overnight`, `phone_calls`) into `supabase/migrations/`.
17. Expose `/api/zoom/webhook` in PUBLIC_PATHS **and** make the signature check mandatory (reject when header absent) in the same commit; **[G]** set `ZOOM_WEBHOOK_SECRET_TOKEN` in Vercel and re-run Zoom CRC validation.
18. `/api/zoom/ai-companion-ingest`: replace the From-domain check with a shared-secret query/header, then add to PUBLIC_PATHS — never allowlist as-is.
19. `/api/phone/call-event`: fail-closed `BB_CALL_SECRET` + add to PUBLIC_PATHS (pairs with the daemon; inert until the Mac is online).
20. **[G]** Add a shared-secret to `/api/whatsapp/webhook` (requires configuring the Timelines.ai webhook URL with the token — live-behavior change, Gideon gate); stop logging raw payloads.
21. Add vercel.json cron entries for `/api/cron/center-watch` (hourly) and `/api/cron/email-watch`, or delete their claim comments — decide, then one commit.
22. Wire the fake reminder controls (CommsPanel RemindBell/ReminderPicker, EmailPanel RemindButton) to the real `/api/bucket` + reminders API (which item 1 makes actually fire).
23. EmailPanel: fetch the full message body on open (Gmail API `messages.get`) instead of the snippet; fix the unread-badge total fallback (`:88-92`).
24. WhatsApp contact-name resolution: pass Timelines pushName/group subject through `adaptThreads` (kills raw E.164/JID display); import the staff regex from `lib/cockpit/staff-roster.ts` in `adapters.js` instead of duplicating it.
25. InviteComposerDrawer: wire recipient search (Pipedrive), real slots (`/api/bookings/available-slots`), and send (`/api/bookings/send-invitation`) — or remove its Concierge entry point until then.
26. Wire or remove remaining dead chrome: SpeedSelector → set `playbackRate` in `voiceClient.js`; delete NoraLiveStatus or feed it real state; remove Nora action chips / ★ Profile / paperclip until backed by logic.
27. Dead-code deletion commit: orphaned panels, pillars, wideTabs, 3 drawers, DemoStatesPanel, ToastStack mocks, `buttonStyles.js`, `voiceCommands.js`, `components/cockpit/data/` (~1,700+ lines). Keep `DemoContext.jsx`/`demoStateReducer.js` (load-bearing store). Do NOT touch `components/center/*` / `components/chat/*` (legacy constraint).
28. **[G]** Env completion in Vercel: `AUTH_ACCESS_CODE`, `SENDGRID_FROM_EMAIL`, `GROQ_API_KEY`, `GOOGLE_REFRESH_TOKEN_2` (mint via `scripts/get-reprime-gmail-token.mjs` — verify against the f5ab5d3 in-cockpit OAuth flow first), verify `CRON_SECRET`/`CENTER_PASSWORD` present; **[G]** power on the BlueBubbles Mac.
29. Merge the orphaned `feat/research-connectors` branch (SEC EDGAR / CourtListener / Census): commit, run its 3 migrations, set `CENSUS_API_KEY`, replace placeholder TARGET_MARKETS.

### (c) Genuinely new modules

30. Gmail-API send (reply-in-thread from the correct mailbox) replacing SendGrid for cockpit replies — fixes the "never in Gmail Sent" gap.
31. Per-panel setup-required banners driven by the AdapterStatus registry (5 panels can't distinguish "empty" from "unconfigured").
32. phone_calls read surface (call log + recording playback UI) — table is currently write-only.
33. react-window virtualization for the 861 thread rows in CommsPanel (new dependency; perf follow-up list in PERFORMANCE_AUDIT.md).
34. **[G]** Persistent worker (Trigger.dev/Railway/Fly.io) for InfoRuptcy scraping + cron migration off Vercel's runtime limits (recurring cost — Gideon gate).
35. Expand `buildNoraContext` with Pipedrive deals/contacts/emails or trim the NORA_SYSTEM claim — closes the hallucination gap on deal questions.
36. 718 outbound iMessage/SMS: build a BlueBubbles outbound client (`BLUEBUBBLES_SERVER_URL`/`PASSWORD`) once the Mac is online — last missing send path.
