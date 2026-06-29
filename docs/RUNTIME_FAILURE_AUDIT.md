# RUNTIME_FAILURE_AUDIT.md

## Test environment
- **Target URL:** https://project-7e87w.vercel.app/cockpit
- **Build SHA visible in console:** none. `window.__NEXT_DATA__.buildId` was null. The only deployment marker is the Vercel `dpl_` query string on static assets — `dpl_BoXyUZoSdqmUtALq6xjrsv4rrTbQ` was the active deployment at the time of capture (the page hot-redeployed several times during the audit window: `dpl_4QvngkqdfdmfBWC88WbJJfKPPePt` → `dpl_6Ed2n9FaRxXFAtaLi6PPVVs3yvrE` → `dpl_BeGwKZCKxw5osenXz5ic5GZRsv6g` → `dpl_G8rDX8uB78NnMYuUQZjmVEcaKg1M` → `dpl_9eW78SBjCNy82SXVsBePMv3fisiB` → `dpl_BoXyUZoSdqmUtALq6xjrsv4rrTbQ`).
- **Date:** 2026-06-29
- **Browser:** Chrome (macOS), Claude-in-Chrome extension, single tab `1560298522`.
- **Session:** Authenticated as g@reprime.com (no redirect to `/login`).

## Console / network summary
- **Total console errors / warnings:** 0 captured (no messages matched `error|warn|Error|Warning|418|404|500|fail`).
- **Total network failures (status >= 400):** 0. All 341 captured requests were 200 (or `pending` because they were still in flight when read).
- **React #418 / hydration messages:** none observed.
- **Unique errors verbatim:** none.

Caveat: Claude-in-Chrome's console capture only starts on the first `read_console_messages` call, so pre-load errors before that boundary cannot be ruled out. Post-load polling cycles (the same nine API endpoints repeat every few seconds) all return 200.

## Per-panel walkthrough

| Panel | State | Notes |
|---|---|---|
| Top chrome (clock, Shabbat label, EN/HE, PTT, APEX, Concierge) | OK | Clock shows `23:30`, date "Mon · Jun 29", `שבת in 4d`, EN/HE toggle present, `APEX NOW · NOW`/`Talk to Nora`/PTT speed selectors (1.2x–2.0x) all rendered. |
| Comms / WhatsApp 305 | OK | `/api/whatsapp/threads?panel=305` → 642 threads. The cockpit shows "OTHERS · 8 recent". |
| Comms / WhatsApp 718 | OK | `/api/whatsapp/threads?panel=718` → 219 threads. |
| Message preview / media | Partial | Many threads expose `contact_name` as the bare phone number ("+19176359911", "+120363201733549020"), and `last_message` is empty for the sampled top thread. Media is delivered as S3 URLs with `media_type: document` (PDF attachments) — `<img>` tag count in the DOM is **0**, meaning image media is not rendered inline by the current cockpit (or there is no image-type media in the most recent messages). |
| Email triage | OK | `/api/email/triage` → `count: 20`, `items.length: 20`, `min_score: 5`, account: `all`. |
| Calendar (today's events, Zoom links) | OK | `/api/calendar/today` → 7 events, Zoom links rendered (`Join Zoom` x7) at 20:30, 23:00, 23:30, 00:00…; "In progress" banner for Terminal Introduction — Nir. |
| Brief (morning/evening) | OK | `/api/briefing/today` → meetings 7, plus `unread`, `recent_investors`, `expiring_invitations`, `pending_followups`, `active_deals`, `tenant_filings_today`, `suggested_focus`. |
| Notes | OK | `/api/notes` → 4 notes (top: `BACKLOG.md`). |
| Nora's Desk | OK | Panel header found ("Nora · idle", `Talk to Nora`). |
| Nora chat | OK (read-only) | `/api/nora/history` → `{messages: []}` — chat history is empty. Did not send a message. |
| Religious calendar | OK | `Postville, IA / 52162`, candle-lighting 2026-07-03 20:31, havdalah 2026-07-04 21:42. |
| Bucket / Secretary asks | OK | `/api/bucket?status=open` → `items: []` (cached). `/api/secretary/asks` → `awaiting/overdue/replied_recent` all empty. |

## Backend route spot-checks

| URL | Status | Top-level keys | Notes |
|---|---|---|---|
| `/api/whatsapp/threads?panel=305` | 200 | `threads` | 642 items. |
| `/api/whatsapp/threads?panel=718` | 200 | `threads` | 219 items. |
| `/api/whatsapp/messages?phone=<num>&panel=305` | 200 | `messages` | Sampled `+19176359911` → 3 messages, one with `media_type: document` (S3 URL). |
| `/api/email/triage` | 200 | `account, min_score, count, items` | 20 items returned. |
| `/api/calendar/today` | 200 | `events, cached` | 7 events. |
| `/api/briefing/today` | 200 | `date, meetings, unread, recent_investors, expiring_invitations, pending_followups, active_deals, tenant_filings_today, suggested_focus` | Full payload. |
| `/api/notes` | 200 | `notes` | 4 items. |
| `/api/nora/history` | 200 | `messages` | Empty array. |
| `/api/religious-calendar` | 200 | `location, zip, candleLighting, havdalah, isRestNow, title, upcoming, live` | OK. |
| `/api/secretary/asks` | 200 | `awaiting, overdue, replied_recent` | All empty arrays. |
| `/api/bucket?status=open` | 200 | `items, cached` | Empty (cached). |
| `/api/email/sync` | not observed | — | The cockpit mount loads `/api/email/triage` instead of `/api/email/sync`; sync is presumably worker-triggered. |

There is heavy polling — `/api/whatsapp/threads`, `/api/calendar/today`, `/api/briefing/today`, `/api/email/triage`, `/api/bucket`, `/api/secretary/asks` repeat dozens of times per minute. Combined with several deployment swaps during the audit (six distinct `dpl_*` IDs in <2 min), this looks like an active rolling deploy plus aggressive client polling.

## Findings

1. **Build SHA not exposed to the client.**
   - What failed: there is no `VERCEL_GIT_COMMIT_SHA` injected into `window`, no `<meta name="build-sha">`, and `__NEXT_DATA__.buildId` is null. Hard to correlate user-reported bugs with a deployment.
   - Where: app shell.
   - Evidence: `buildSha: null` from `window.__NEXT_DATA__?.buildId`; only `dpl_*` markers visible on static URLs.
   - Hypothesis: missing `env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` wiring in `next.config` or root layout.
   - Fix layer: env + frontend root layout (single `<meta>` tag).

2. **WhatsApp `contact_name` falling back to raw phone number.**
   - What failed: cockpit shows `+19176359911`, `+120363201733549020`, `+120363204511710659` as contact labels in the "OTHERS" section.
   - Where: `/api/whatsapp/threads?panel=305` thread rows.
   - Evidence: thread sample `{contact_name: "+120363201733549020", ...}`; body text "+19176359911 305 WhatsApp".
   - Hypothesis: contact-resolution path (push-name / address-book lookup) returns null and the UI falls back to E.164. Group-chat IDs (`120363…`) are JIDs without a stored display name.
   - Fix layer: adapter / DB — populate `contact_name` from WhatsApp `pushName` and resolve group JIDs to subject titles.

3. **Top-thread `last_message` is empty.**
   - What failed: sampled top 305 thread (`+120363201733549020`) returned `last_message: ""`.
   - Where: `/api/whatsapp/threads?panel=305`.
   - Evidence: `lastMsg: ""` on the first thread.
   - Hypothesis: latest event in that thread is media-only (no `text.body`) or a non-text system event, and the thread aggregation only carries `text`. Empty previews make the list unscannable.
   - Fix layer: route — when `text` is empty, derive a preview like `📄 PDF`, `📷 Photo`, `[reaction]`, or `[joined group]`.

4. **No inline image rendering for WhatsApp media.**
   - What failed: `document.images.length === 0` despite the WhatsApp threads carrying media.
   - Where: Comms panel.
   - Evidence: rendered DOM has zero `<img>` elements; sampled message media is `media_type: document` with an `s3.amazonaws.com` URL — but no `<img>` tag, link, or thumbnail surfaces in the cockpit body text.
   - Hypothesis: the cockpit currently surfaces only text previews on the comms list; media attachments are not previewed in the row. Acceptable for documents, but ambiguous for images.
   - Fix layer: frontend — add a small `media_type` badge or thumbnail to the row.

5. **Heavy duplicated polling.**
   - What failed: in <2 minutes the same six routes (`whatsapp/threads ×2`, `calendar/today`, `briefing/today`, `email/triage`, `bucket`, `secretary/asks`) each fired 10–15 times.
   - Where: cockpit mount + interval refresh.
   - Evidence: 126 `/api/*` hits in the first capture window, 341 total network requests across page transitions.
   - Hypothesis: multiple components own their own polling intervals instead of sharing a query cache; combined with React-strict-mode double mount and several mid-audit redeploys, this fans out.
   - Fix layer: frontend — consolidate via SWR/React Query with `dedupingInterval`, or move to server-sent events for live data.

6. **Rapid mid-audit redeploys.**
   - What failed: six different `dpl_*` IDs served in under two minutes.
   - Where: Vercel deployment pipeline.
   - Evidence: `dpl_` strings on `_next/static/*` rotated through `4Qvngk… → 6Ed2n9… → BeGwKZ… → G8rDX8… → 9eW78S… → BoXyUZ…`.
   - Hypothesis: an automated agent (this session's parallel git activity) is pushing rapid deploys. Not a runtime defect per se, but it makes audit reproducibility hard and may evict caches mid-request.
   - Fix layer: ops — pause/serialize automated deploys during audit windows.

## All-clear items

- `/login` redirect did not fire — session is live for g@reprime.com.
- Zero console errors/warnings captured post-mount.
- Zero network failures across 341 requests; every `/api/*` returned 200.
- No React hydration / #418 messages.
- No broken images (`brokenImgs: []`).
- All eight expected panels render: top chrome, Comms 305/718, Email, Calendar (with Zoom join links), Brief, Notes, Nora's Desk, Religious Calendar.
- WhatsApp scale looks healthy: **642** threads on 305, **219** on 718.
- Email triage delivers 20 scored items with a populated payload shape.
- Calendar shows 7 events for today with `Join Zoom` buttons.
- Briefing payload carries the full nine-key envelope including `suggested_focus` and `active_deals`.
- Religious calendar (`Postville, IA / 52162`) returns candle-lighting and havdalah times correctly.
- 980 interactive `<button>` elements present — UI is fully hydrated, not a skeleton.

Token-light follow-ups (not blocking): finding 1 (build SHA exposure) and finding 5 (polling dedupe) are low-risk wins; finding 2 (contact-name resolution) is the only finding with direct user-facing impact.
