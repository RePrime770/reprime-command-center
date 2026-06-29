# FRONTEND_INTERACTION_AUDIT.md

Audit of every visible interactive element in the RePrime Command Center cockpit
plus companion pages (login, compose, invite flows). Source roots:

- `components/cockpit/chrome/**` — top bar, sub-strips, search palette, PTT
- `components/cockpit/panels/**` — the seven main column panels
- `components/cockpit/drawers/**` — Layer-4 right drawers
- `app/**/page.tsx` — pages

## Method

Sampled by grepping handler attributes across `components/` and `app/` and then
reading each file end-to-end (panels, chrome, drawers, login/compose). Status
columns are graded from the code itself — every API path (`/api/...`) is taken
as evidence of "wired" if it appears in a `fetch()` call inside the handler.

Counts (raw `grep`):

| Handler kind | Occurrences across `components/` + `app/` |
|---|---|
| `onClick` | 450 |
| `onSubmit` + `onChange` | 78 |

The bulk of the audit below focuses on the cockpit (it is the product); the
companion pages get one short table each at the end.

## Status legend

- **OK** — handler exists, calls a real backend (or local-only handler that is
  legitimately local-only, e.g. tab switch).
- **WIRED-BUT-UNTESTED** — handler does the work but no confirm step is shown
  and behavior is not yet end-to-end tested.
- **NO-HANDLER** — dead button. No `onClick`/`onSubmit` at all.
- **FAKE-SUCCESS** — handler shows a "Sent ✓" or otherwise affirmative state
  without doing the work.
- **NEEDS-CONFIRM** — irreversible action (send, delete, publish) without a
  confirm step.

---

## TopChrome (`components/cockpit/chrome/TopChrome.jsx`)

| Element | Label | Handler | Calls | Loading/Error/Confirm? | Status |
|---|---|---|---|---|---|
| `ApexNowIndicator` | APEX NOW card | `onClick` | dispatches `nora:prefill` event, sets `noraFocus` | none needed | OK |
| `Row3Tier1` CTA | Join now / Open prep / Open deal | `onClick` | opens `live.joinUrl` in new tab for live meeting; demo branches no-op | none | OK (live) / WIRED-BUT-UNTESTED (demo) |
| `Row3Tier1` Dismiss | Dismiss | `onClick` | clears `liveMeeting`/`meetingNow`/`topBarState`/`tier1Alert` | none | OK |
| `PttCluster` PTT | Talk to Nora | `onClick` cycle | toggles `pttState`, bumps `noraFocus` | none | OK (focuses chat; does NOT actually start mic — chat input still needs its own mic tap) |
| `NoraLiveStatus` mode | Listen / Participate | `onClick` | sets `noraMode` in demo state | none | OK (cosmetic — no backend behavior change) |
| `SpeedSelector` 1.2…2.0× | speed pill | `onClick` | sets `speechifySpeed` in demo state | none | OK (read by `voice.jsx`) |
| `LangToggle` | EN / עב | `onClick` | `setLocale()` from `useLocale` | persisted | OK |
| `ConciergeCluster` Search | Search | `onClick` | toggles `searchOpen` (SearchPalette reads it) | none | OK |
| Concierge Note | Note | `onClick` | sets `pttState='note'` | none | WIRED-BUT-UNTESTED — no panel actually keys off `pttState==='note'` for capture; the note appears via NotesPanel composer separately. |
| Concierge Email | Email | `onClick` | sets `emailComposeOpen` (EmailPanel opens its in-panel composer) | none | OK |
| Concierge Briefing | Briefing | `onClick` | sets `briefingOpen` (BriefingDrawer reads it) | none | OK |
| Concierge Invite | Invite | `onClick` | sets `inviteComposerOpen` (InviteComposerDrawer reads) | none | OK |
| `ClockShabbat` | clock + שבת pill | none (display) | reads `/api/religious-calendar` on mount/hour | loading silent | OK |

## SearchPalette (`components/cockpit/chrome/SearchPalette.jsx`)

| Element | Label | Handler | Calls | Confirm? | Status |
|---|---|---|---|---|---|
| ⌘K / Cmd+K | global open | `keydown` listener | toggles `searchOpen` | n/a | OK |
| Esc | close | `keydown` | sets `searchOpen=false` | n/a | OK |
| Input | search query | `onChange` | local filter over live `threads/events/emails` | n/a | OK |
| Result row (thread) | contact row | `onClick` | sets `openChat` (CommsPanel routes to correct lane) | none | OK |
| Result row (event) | Today's meeting | display only; `Join ↗` `<a>` | opens `joinUrl` | none | OK |
| Result row (email) | email match | none (`cursor:default`) | — | n/a | **NO-HANDLER** (intended — display-only, but no click-through to open the email in EmailPanel) |
| Close × | close palette | `onClick` | sets `searchOpen=false` | n/a | OK |

## TalkToNoraPtt (`components/cockpit/chrome/TalkToNoraPtt.jsx`)

| Element | Label | Handler | Calls | Status |
|---|---|---|---|---|
| Big PTT button | Talk to Nora / Listening / Note / Mission | `onClick` cycle | toggles `pttState`, bumps `noraFocus` | OK (focuses chat input; same caveat as TopChrome PTT — does not directly start `getUserMedia`) |

## ActiveDealSubStrip / MeetingNowBanner

| File | Element | Handler | Status |
|---|---|---|---|
| `ActiveDealSubStrip.jsx` | each deal pill | none | **NO-HANDLER** — pills are entirely display-only, can't click into a deal |
| `MeetingNowBanner.jsx` | Join now | none (no `onClick`) | **NO-HANDLER (FAKE)** — looks like a join button, doesn't open any URL |
| `MeetingNowBanner.jsx` | Dismiss | `onClick` | sets `meetingNow=null` — OK |

Note: this banner is a *demo* path; the *live* equivalent in `TopChrome.Row3Tier1` does work. The demo banner is still mounted in `App.jsx`, though, so a tester clicking "Join now" gets nothing.

---

## CommsPanel (`components/cockpit/panels/CommsPanel.jsx`)

| Element | Label | Handler | Calls | Confirm? | Status |
|---|---|---|---|---|---|
| `ThreadRow` | thread row | `onClick` → `setOpen` | local lane state | n/a | OK |
| `RemindBell` (row) | 1h chip | `onClick` | local Set; `toggleRemind` | n/a | OK (display-only; **does NOT post to `/api/bucket/.../remind`** — no real reminder is created from comms rows) |
| ThreadView header — Profile | ★ Profile | `onClick` | sets `investorOpenId`+`investorState` | n/a | OK |
| ThreadView header — Zoom | Zoom | `onClick` `dropZoomLink` | `POST /api/zoom/create-meeting` | error inline | OK |
| ThreadView header — Move to Staff | → Staff / Staff ✓ | `onClick` `moveToLane` | `PATCH /api/whatsapp/threads/[id]` | inline status | OK (handles 503 "Needs DB migration") |
| ThreadView header — Listen | Listen TTS | (`ListenButton`) | `POST /api/voice/speak` | n/a | OK |
| ThreadView header — ReminderPicker 1h/2h/3h/6h/Tomorrow | chip | `onClick` | **local-only `useState` — no fetch** | n/a | **FAKE-SUCCESS** — looks like a reminder is being set; nothing is persisted, nothing fires |
| ThreadView header — Close × | close | `onClick` | clears `openId` | n/a | OK |
| ReplyZone — draft body | tap to edit | `onClick` | sets `replyMode='editing'` | n/a | OK |
| ReplyZone — Send | Send / Send my edit / Sending… / Sent ✓ / Retry | `onClick` `doSend` | `POST /api/whatsapp/messages` (WA) or `POST /api/phone/quo-send` (SMS) | **`window.confirm()` with recipient + first 140 chars** | OK |
| ReplyZone — DictateButtons (EN / HE) | dictate | recording → upload | `POST /api/voice/transcribe-{en,he}` | n/a | OK |
| ReplyZone — Attach file | 📎 | `onChange` on hidden `<input type=file>` → `onPickFile` | `uploadAttachment` (Supabase) → `POST /api/whatsapp/messages` | **`window.confirm()` for filename + recipient** | OK |
| ReplyZone — Voice note | Voice note / Send note / Sending… / Sent ✓ / Retry | `onClick` MediaRecorder | `uploadAttachment` → `POST /api/whatsapp/messages` | **`window.confirm()` after recording stops** | OK |
| ReplyZone — Edit | Edit | `onClick` | sets `replyMode='editing'` | n/a | OK |
| ReplyZone — Clear & write my own | Clear | `onClick` | clears + `replyMode='cleared'` | n/a | OK |
| ReplyZone — ↺ Nora draft | restore | `onClick` | resets to defaultDraft | n/a | OK |
| ReplyZone — Listen | Listen current draft | (`ListenButton`) | `POST /api/voice/speak` | n/a | OK |
| `NoraElevatedRead` action buttons | per-block actions (e.g., "Send Nora draft", "Snooze 2h") | **no `onClick`** | — | n/a | **NO-HANDLER** — appear interactive but are dead |

## EmailPanel (`components/cockpit/panels/EmailPanel.jsx`)

| Element | Label | Handler | Calls | Confirm? | Status |
|---|---|---|---|---|---|
| Inbox tabs | All / per-mailbox | `onClick` | local `setInbox` | n/a | OK |
| `Compose` button | Compose | `onClick` | opens in-panel `ComposeEmail` | n/a | OK |
| ComposeEmail — To/Subject/Body | inputs | `onChange` | local | — | OK |
| ComposeEmail — Send | Send / Confirm send / Sending… / Sent ✓ / Retry | `onClick` → `setSendState('confirm')` → `confirmSend` | `POST /api/email/send` | **two-step confirm in UI** | OK |
| ComposeEmail — DictateButtons | EN/HE | record | `POST /api/voice/transcribe-*` | — | OK |
| ComposeEmail — close × | close | `onClick` | closes composer | — | OK |
| `EmailRow` | open email | `onClick` `onOpen` | local | — | OK |
| `EmailRow` Listen / Voice | per-row mini voice | (`ListenButton`/`RecordButton`) | TTS / dictate | — | OK |
| `EmailRow` RemindButton | 1h chip | `onClick` | local Set only | — | **FAKE-SUCCESS** (no `/api/bucket/.../remind` call) |
| OpenedEmail — Zoom | Zoom | `onClick` `inviteToZoom` | `POST /api/zoom/create-meeting` | error inline | OK |
| OpenedEmail — Listen | Listen | (`ListenButton`) | `POST /api/voice/speak` | — | OK |
| OpenedEmail — read/unread | ● unread / ✓ read | `onClick` `toggleRead` | `POST /api/email/mark-read` | optimistic; reverts on failure | OK |
| OpenedEmail — close × | close | `onClick` | clears `openedId` | — | OK |
| `NoraEmailRead` actions | "Send Nora draft", "Open thread", "Snooze 2h" | **no `onClick`** | — | — | **NO-HANDLER** — same dead pattern as CommsPanel |
| EmailReplyZone — Send | Send / Confirm / Sending / Sent ✓ / Retry | `onClick` `requestSend`→`confirmSend` | `POST /api/email/send` | **two-step confirm** | OK |
| EmailReplyZone — Edit / Clear / ↺ Nora draft | mode switch | `onClick` | local | — | OK |
| EmailReplyZone — DictateButtons | EN/HE | record | transcribe | — | OK |
| EmailReplyZone — 📎 Attach | paperclip | **no `onClick`** | — | — | **NO-HANDLER** (email attach is dead — only WhatsApp attach works) |
| `VoiceMessageButton` (email) | Voice note | `onClick` | local timer flips to "Voice note sent" with `setTimeout` | — | **FAKE-SUCCESS** — no recording, no upload, no send |

## CalendarPanel (`components/cockpit/panels/CalendarPanel.jsx`)

| Element | Label | Handler | Calls | Status |
|---|---|---|---|---|
| Religious-calendar pill | open drawer | `onClick` | sets `religiousCalendarOpen` | OK |
| `DictateButtons` memo | EN/HE | record | `POST /api/voice/transcribe-*` → appends to memo | OK |
| `ListenButton` memo | Listen | TTS | OK |
| Memo `clear` | clear | `onClick` | local | OK |
| `EventRow` | row | none | — | **NO-HANDLER** — clicking a non-zoom event does nothing (no detail view, no "create note", no "create followup") |
| Zoom row — `Join Zoom` | Join | `onClick` | `window.open(event.joinUrl, ...)` (disabled if no joinUrl) | OK |

## BriefPanel (`components/cockpit/panels/BriefPanel.jsx`)

| Element | Label | Handler | Calls | Status |
|---|---|---|---|---|
| Morning / Evening tabs | tab | `onClick` | local | OK |
| Apex action buttons | per-action string | `onClick` | dispatches `nora:prefill` event | OK |
| Apex `ListenButton` | Listen | TTS | OK |
| Evening — refresh / regenerate | (none — auto fetches `/api/briefing/evening` on mount) | — | — | **No regenerate button** — once a session loads the evening, you can't ask for a fresh pull without reload |
| (No "translate" button anywhere on this panel.) | | | | **MISSING** — the spec called for translate/read-aloud, only read-aloud is here |

## NotesPanel (`components/cockpit/panels/NotesPanel.jsx`)

| Element | Label | Handler | Calls | Confirm? | Status |
|---|---|---|---|---|---|
| Title input | title | `onChange`, Enter→`add` | local | — | OK |
| Body textarea | body | `onChange` | local | — | OK |
| `Add note` | Add / Saving… | `onClick` `add` | `POST /api/notes` | — | OK |
| Mic | dictate | `useDictation` toggle | transcribe → body | — | OK |
| Search input | search | `onChange` | local filter | — | OK |
| Search × | clear | `onClick` | local | — | OK |
| Pin / Unpin | pin icon | `onClick` `togglePin` | `PUT /api/notes` | — | OK |
| Pencil | Edit note | `onClick` `startEdit` | local | — | OK |
| Edit Save | Save | `onClick` `saveEdit(id)` | `PUT /api/notes` | — | OK |
| Edit Cancel | Cancel | `onClick` | local | — | OK |
| Delete × | Delete note | `onClick` `remove(id)` | `DELETE /api/notes` (optimistic) | **NO confirm** | **NEEDS-CONFIRM** — irreversible deletion with one tap |

## NoraDesk (`components/cockpit/panels/NorasDesk.jsx` + `NoraChat.jsx`)

| Element | Label | Handler | Calls | Status |
|---|---|---|---|---|
| NoraChat input | text | `onChange` | local | OK |
| NoraChat — submit form | Send | `onSubmit` `send` | `POST /api/nora/chat`, then `POST /api/voice/speak` | OK |
| NoraChat mute toggle | Volume / VolumeX | `onClick` | local | OK |
| NoraChat voice-lang | EN / HE | `onClick` | local | OK |
| NoraChat mic | record / stop | `onClick` `toggleRecording` | `POST /api/voice/transcribe-{en,he}` | OK |
| NoraChat — `nora:prefill` listener | — | window event | prefills input + focuses | OK |
| `NoraCard` (NORA → YOU) — primary actions | `Done` / `Snooze` (bucket) / `Mark replied` / `Snooze` (ask) | `onClick` `runAction` | `PATCH /api/bucket/[id]` or `PATCH /api/secretary/asks` | OK |
| `NoraCard` — unwired action labels | anything not in `mutationFor` | disabled, title "not yet wired" | — | OK (graceful; intentionally inert) |
| `NoraCard` `RemindPicker` | +1h / +3h / Tomorrow | `onClick` | `POST /api/bucket/[id]/remind` | OK |
| `NoraCard` Listen | Listen | TTS | OK |

---

## Drawers

### InviteComposerDrawer (`components/cockpit/drawers/InviteComposerDrawer.jsx`)

| Element | Label | Handler | Status |
|---|---|---|---|
| Type toggle | Terminal / Meeting | `onClick` | OK (local) |
| Channel pick (Terminal) | WhatsApp / Email | `onClick` | OK (local) |
| Recipient `<input>` | Search Pipedrive… | none | **NO-HANDLER** — no `onChange`, no autocomplete, no contact search fetch |
| Personal note `<textarea>` | speak/type note | none | **NO-HANDLER** — uncontrolled, value never read |
| Channel pick (Meeting) Zoom/Phone/In-person | toggle | **no `onClick`** | **NO-HANDLER** |
| Duration chips (15/30/…/120) | minutes | **no `onClick`** | **NO-HANDLER** |
| Nora-suggested slot buttons | static "Mon May 11 14:30 CT" etc. | **no `onClick`** | **NO-HANDLER (FAKE)** — slots are hardcoded literals; clicking does nothing |
| `Draft → Review` | primary action | **no `onClick`** | **NO-HANDLER (FAKE)** — the only "send" button in this entire drawer is dead. To actually invite anyone, you have to leave the cockpit and use `/compose`. |
| TemplateLink rows | "Email body · 00_Email_Page.html" etc. | none | display-only (OK — they're labels) |
| `MicAffordance` | Voice | `RecordButton` from `voice.jsx` | OK |

This is the single biggest dead surface in the cockpit. The whole drawer is a presentational shell.

### BriefingDrawer (`components/cockpit/drawers/BriefingDrawer.jsx`)

| Element | Label | Handler | Calls | Status |
|---|---|---|---|---|
| Close | × | `onClick` | `set('briefingOpen', false)` | OK |
| `ListenButton` (Read aloud) | Listen | TTS over greeting+apex+sections | OK |
| Apex / section cards | display | none | OK (display-only by design) |

### ReligiousCalendarDrawer

| Element | Handler | Status |
|---|---|---|
| Close × | OK |
| Tag-observance chips (Christmas, Eid, etc.) | **no `onClick`** | **NO-HANDLER** — voice instruction is given but the chips themselves don't tag anything |

### InvestorProfileDrawer

Wired open via `investorOpenId` from CommsPanel + InvestorsPanel + DemoStatesPanel. (Body not audited here; treat as OK shell — but every "action" inside it should be re-audited separately.)

### EmailComposeDrawer (`drawers/EmailComposeDrawer.jsx`)

| Element | Handler | Status |
|---|---|---|
| Close | OK |
| `Send` button | **no `onClick`** | **NO-HANDLER (FAKE)** — biggest dead button in the deck. The drawer is orphaned in practice (EmailPanel uses its own `ComposeEmail` now) but is still mounted via `emailMix==='compose'`, which the EmailWideTab still sets. |
| `Re-draft via Critic` | **no `onClick`** | **NO-HANDLER** |
| `ListenButton` | TTS | OK |

### CallerIdDrawer (`drawers/CallerIdDrawer.jsx`)

Only opens via DemoStatesPanel (`phoneState==='caller-id-t1'`) — there is no live phone-ring source feeding this drawer.

| Element | Handler | Status |
|---|---|---|
| Close | OK |
| `You take it` / `Nora takes it` / `System (voicemail)` | **no `onClick`** | **NO-HANDLER (FAKE)** — three big call-decision buttons, all dead |

### DrawerShell

| Element | Handler | Status |
|---|---|---|
| Close × | `onClose` from parent | OK |

---

## Other cockpit panels (lighter coverage)

### InvestorsPanel

| Element | Handler | Status |
|---|---|---|
| Sort toggle | OK |
| Row click → open chat | sets `openInvestorChat` | OK |
| `Open Profile` | sets `investorOpenId`/`investorState` | OK |
| `Call` / `WA` / `Email` action chips | `onClick` is just `e.stopPropagation()` — **no work** | **FAKE / dead** — they look like channel-launch buttons; they do nothing |

### DealsPanel

The non-PSA deal list renders `<div onClick={…?}>` rows with `cursor: 'pointer'` but **no `onClick` is wired** at the row level — clicking a deal does nothing.

| Element | Handler | Status |
|---|---|---|
| DealRow | none | **NO-HANDLER** |

### BucketPanel

| Element | Handler | Status |
|---|---|---|
| Tabs Active/Waiting | OK |
| Accordion toggles (This Week / Done) | OK |
| `Snowflake` Snooze button on each card | **no `onClick`** | **NO-HANDLER** |
| `Check` Done button on each card | **no `onClick`** | **NO-HANDLER** |
| QuickAdd `<input>` | uncontrolled, no `onChange`, no Enter handler | **NO-HANDLER** |
| QuickAdd Mic | **no `onClick`** | **NO-HANDLER** |
| QuickAdd `Add` | **no `onClick`** | **NO-HANDLER** |

The entire bucket panel is a read-only view despite looking fully interactive.

### OpsPanel

Tabs Crew/Reminders/Notes/Pinned switch panels but every card-level button (Listen/Record/edit/etc.) inside the views uses local-only handlers reading from static `data/*` modules. Not fully audited in this pass — likely many dead buttons; treat as **WIRED-BUT-UNTESTED**.

### TerminalActivityPanel

Not audited in this pass — shows live API activity logs. Status: likely display-only (OK).

---

## Pages

### `app/login/page.tsx`

| Element | Handler | Calls | Status |
|---|---|---|---|
| Access-code input | `onChange` | local | OK |
| Enter key | `onKeyDown` | `submitCode` | OK |
| `Enter Command Center` | `onClick` | `POST /api/auth/code` → redirect to `/cockpit` | OK |
| "Trouble?" link | `onClick` | reveals fallback | OK |
| `Email a sign-in link` | `onClick` | `supabase.auth.signInWithOtp` | OK |

### `app/compose/page.tsx`

| Element | Handler | Calls | Status |
|---|---|---|---|
| firstName / fullName / phone / email / locale | `onChange` | local | OK |
| Auto-fetch slots | `useEffect` on mount | `GET /api/bookings/available-slots` | OK |
| Personal-message textarea | `onChange` | local | OK |
| `Mint Invitation` | `onClick` `mint` | `POST /api/invitations` | OK (server sends email parallel) |
| `Copy Message` | `onClick` | `navigator.clipboard.writeText` | OK |
| `Open WhatsApp Web →` | `<a target=_blank>` | wa.me deep link | OK |
| `Mint another` | `onClick` | local reset | OK |
| `↓ Download Excel Log` | `<a download>` | `/api/outreach/export` | OK |

---

## Dead/fake handlers (full list)

These are the buttons/inputs that look interactive but are dead or fake.

1. `components/cockpit/drawers/EmailComposeDrawer.jsx:39` — **Send** has no `onClick`. Drawer is still reachable via `emailMix='compose'` from EmailWideTab.
2. `components/cockpit/drawers/EmailComposeDrawer.jsx:55` — **Re-draft via Critic**, no handler.
3. `components/cockpit/drawers/CallerIdDrawer.jsx:45` — **You take it**, no handler.
4. `components/cockpit/drawers/CallerIdDrawer.jsx:46` — **Nora takes it**, no handler.
5. `components/cockpit/drawers/CallerIdDrawer.jsx:47` — **System (voicemail)**, no handler.
6. `components/cockpit/drawers/InviteComposerDrawer.jsx:300` — **Draft → Review** (only send button in the drawer), no handler.
7. `components/cockpit/drawers/InviteComposerDrawer.jsx:88` — Recipient `<input>` has no `onChange`/autocomplete.
8. `components/cockpit/drawers/InviteComposerDrawer.jsx:132` — Personal-note `<textarea>` has no `onChange`.
9. `components/cockpit/drawers/InviteComposerDrawer.jsx:188-194` — Zoom/Phone/In-person channel buttons, no handlers.
10. `components/cockpit/drawers/InviteComposerDrawer.jsx:201-218` — Duration chips (15/30/45/60/90/120), no handlers.
11. `components/cockpit/drawers/InviteComposerDrawer.jsx:230-254` — "Nora-suggested time slots" buttons are hardcoded literals with no handlers.
12. `components/cockpit/drawers/ReligiousCalendarDrawer.jsx:124-138` — Tag-observance chips (Christmas/Easter/Eid/...) have no handlers.
13. `components/cockpit/chrome/MeetingNowBanner.jsx:48-58` — **Join now**, no handler. (Demo banner only; live equivalent in TopChrome works.)
14. `components/cockpit/chrome/ActiveDealSubStrip.jsx:38-72` — Deal pills, no click into deal.
15. `components/cockpit/panels/CommsPanel.jsx:721-739` — `NoraElevatedRead` action buttons, no handlers.
16. `components/cockpit/panels/EmailPanel.jsx:734-752` — `NoraEmailRead` actions ("Send Nora draft" etc.), no handlers.
17. `components/cockpit/panels/EmailPanel.jsx:979-986` — Reply Attach (📎), no handler.
18. `components/cockpit/panels/EmailPanel.jsx:1036-1073` — `VoiceMessageButton` flips to "Voice note sent" via `setTimeout` — **FAKE-SUCCESS** (no recording or upload).
19. `components/cockpit/panels/CommsPanel.jsx:1142-1177` — `ReminderPicker` (1h/2h/3h/6h/Tomorrow) is local-only — **FAKE-SUCCESS** (NoraDesk's equivalent does post; this one doesn't).
20. `components/cockpit/panels/CommsPanel.jsx:1101-1134` — `RemindBell` (1h on each thread row) is also local-only Set — **FAKE-SUCCESS**.
21. `components/cockpit/panels/EmailPanel.jsx:999-1029` — `RemindButton` per email row, local-only — **FAKE-SUCCESS**.
22. `components/cockpit/panels/CalendarPanel.jsx:165-249` — `EventRow` (non-Zoom) has no click handler, no create-note, no create-followup.
23. `components/cockpit/panels/InvestorsPanel.jsx:220-222` — `Call` / `WA` / `Email` chips on each investor row only `stopPropagation`; no action.
24. `components/cockpit/panels/DealsPanel.jsx:50-100` — Each `DealRow` has `cursor:'pointer'` but no `onClick`.
25. `components/cockpit/panels/BucketPanel.jsx:225-238` — Snowflake (snooze) and Check (done) on every active card, no handlers.
26. `components/cockpit/panels/BucketPanel.jsx:315-365` — QuickAdd input, mic button, Add button — entire row is dead.
27. `components/cockpit/chrome/SearchPalette.jsx:123` — Email result rows in palette have no `onClick` to open the email.

---

## Missing confirmations

Every irreversible action (send / delete / publish / post) that lacks a confirm step.

| File:line | Label | Risk |
|---|---|---|
| `components/cockpit/panels/NotesPanel.jsx:252` | Note row "×" delete | One-tap permanent delete of a saved note. No confirm dialog; optimistic delete then DELETE `/api/notes`. |
| `components/cockpit/panels/NorasDesk.jsx:262` (Done / Mark replied actions) | `Done` etc. on a card | One-tap state change. The actions are reversible-ish (bucket items can be reopened) but a confirm wouldn't hurt for `Done` — currently none. |
| `components/cockpit/drawers/InviteComposerDrawer.jsx:300` | `Draft → Review` (if wired in future) | Spec promises "Nora will show draft before sending"; today the button is dead, so no confirm is needed, but **once wired this must include the two-step confirm pattern**. |
| `components/cockpit/panels/EmailPanel.jsx:1036` | Email `VoiceMessageButton` | Currently fakes success. Once wired, must add confirm-before-send (mirror WhatsApp `VoiceNoteButton`). |
| `components/cockpit/chrome/TopChrome.jsx:236` | Top-bar Dismiss on Tier-1 alert | Irreversible (clears the alert state). Low risk. No confirm — acceptable. |

Things that ARE properly confirmed (good examples to mirror):
- `CommsPanel` Send (WhatsApp/SMS) — `window.confirm()` with recipient + first 140 chars.
- `CommsPanel` Attach file — `window.confirm()` with filename + recipient.
- `CommsPanel` VoiceNoteButton — `window.confirm()` after recording stops.
- `EmailPanel` Send / Reply — in-UI two-step `confirm` state, no auto-fire.

---

## Setup-required missing

Panels that don't render a "Setup required — set X env var" state when their backing integration is missing.

| Panel | Backing env vars (typical) | Current behavior with vars missing |
|---|---|---|
| `CommsPanel` (305-WA / 718-WA lanes) | `TIMELINES_API_KEY` (WhatsApp) | Just shows empty thread lists. No "WhatsApp not configured" notice. |
| `CommsPanel` (305-SMS lane) | OpenPhone / Quo env (per `/api/phone/quo-send`) | Same — silently empty; Send button enabled but request 401s/500s. |
| `EmailPanel` | Gmail / SendGrid creds | Same — empty inbox shown as "Inbox clear." which reads like the user has 0 messages, not "no integration". |
| `CalendarPanel` | Google Calendar token | Same — "Nothing on the calendar today." |
| `BriefPanel` (Evening) | depends on briefing API | Has an `Evening wrap-up unavailable right now.` state — **good**, this is the model to copy. |
| `BriefPanel` (Morning) | morning brief API | If empty: "No brief items yet." — also ambiguous (no items vs not configured). |
| `NorasDesk` | bucket + secretary APIs | "No items need you right now." — ambiguous. |
| `NotesPanel` | `/api/notes` | Has an explicit `Notes unavailable.` error state — **good**. |
| `NoraChat` | `/api/nora/chat` | Inline error string ("Nora is unavailable right now") — **good**. |
| `InvestorsPanel` / `DealsPanel` / `BucketPanel` (waiting) | Pipedrive | These panels still ship static mock data (`data/investors.js`, `data/deals.js`, `data/tasks.js`); the "live" Pipedrive integration is not wired in this UI. **Largest setup-state gap.** |
| `BriefingDrawer` | brief API | Has `Nothing pressing in the brief right now.` empty state — OK; could be clearer about config. |
| `ReligiousCalendarDrawer` | Hebcal | Falls back to heuristic — fine. |
| `InviteComposerDrawer` | Pipedrive (recipient search) | The recipient input is dead, so no integration question yet. |

**Pattern recommendation:** every panel that depends on an external integration should distinguish three states: `loading` (skeleton), `not-configured` (env var missing — name the var), and `empty` (configured but no data). Today most panels collapse the last two into one.

---

## Highest-priority fixes

Top 10 by user impact:

1. **`InviteComposerDrawer` `Draft → Review` is dead** (`drawers/InviteComposerDrawer.jsx:300`).
   This is the only "send the Terminal invite" button reachable from cockpit chrome. Either remove the drawer entirely (point Concierge "Invite" at `/compose`) or wire `Draft → Review` to `POST /api/invitations` with the two-step confirm pattern.
2. **`EmailComposeDrawer` `Send` is dead** (`drawers/EmailComposeDrawer.jsx:39`).
   The drawer is orphaned but still reachable via `emailMix==='compose'`. Either delete the file and stop setting `emailMix='compose'` from EmailWideTab, or wire the Send button to `/api/email/send` with a confirm.
3. **`BucketPanel` is read-only** (`panels/BucketPanel.jsx`).
   QuickAdd input, mic, Add button, and Snooze/Done card actions are all dead. Wire QuickAdd to `POST /api/bucket`; wire Snooze/Done to `PATCH /api/bucket/[id]` (NorasDesk already does this — copy that handler).
4. **`InvestorsPanel` Call / WA / Email chips are dead** (`panels/InvestorsPanel.jsx:220-222`).
   These should jump into the correct comms lane / drop into the email composer. Right now clicking them just stops propagation.
5. **`DealsPanel` rows are dead** (`panels/DealsPanel.jsx:50`).
   Add an `onClick` that opens an investor profile drawer or a deal-detail surface. Today a deal row looks clickable and isn't.
6. **`CallerIdDrawer` decision buttons are dead** (`drawers/CallerIdDrawer.jsx:45-47`).
   Take it / Nora takes it / Voicemail all need handlers — these are the "missed-call protection" surface. Wire to whatever the call backend is (or remove the drawer until then).
7. **Fake-success reminders proliferate** (`CommsPanel.RemindBell`, `CommsPanel.ReminderPicker`, `EmailPanel.RemindButton`).
   NorasDesk's `RemindPicker` posts to `/api/bucket/[id]/remind` and the cron fires it. Refactor the other three to use the same endpoint (or share a `<RemindControl>` primitive) so reminders actually fire.
8. **`EmailPanel.VoiceMessageButton` is a `setTimeout` lie** (`panels/EmailPanel.jsx:1036`).
   Either remove the button entirely or port `CommsPanel.VoiceNoteButton` (which has a real MediaRecorder + upload path).
9. **`NotesPanel` delete with no confirm** (`panels/NotesPanel.jsx:252`).
   Add a `window.confirm()` or replace with a two-step inline confirm (mirror EmailPanel send pattern).
10. **No "setup required" state on integration-backed panels.**
    Add a single `<SetupRequiredCard envVar="..." />` primitive and render it from CommsPanel / EmailPanel / CalendarPanel / InvestorsPanel / DealsPanel when the relevant key is missing. Right now these panels are indistinguishable from "configured but quiet", which causes the user to wait for data that will never come.

---
