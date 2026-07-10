# Feature Matrix — 516-Feature Zero-Trust Registry

**Generated:** 2026-07-03  
**Source spec:** `public-nu-six-60.vercel.app` (516-feature manifest, the binding spec)  
**Method:** Zero-trust code verification — 9 parallel surface-cluster agents read the CURRENT cockpit codebase (not the stale 2026-06-18 triage doc) and assigned one of 13 statuses per feature. Machine data: `docs/registry/feature-registry.json`.

## Headline

| Status | Count | % |
|---|---:|---:|
| 🔴 BROKEN | 5 | 0% |
| ⬛ NOT_IMPLEMENTED | 309 | 59% |
| 🟣 MOCK_ONLY | 11 | 2% |
| 🟪 UI_ONLY | 3 | 0% |
| ⬜ UNVERIFIED | 1 | 0% |
| 🔒 BLOCKED_BY_CREDENTIAL | 1 | 0% |
| 🔒 BLOCKED_BY_INFRASTRUCTURE | 2 | 0% |
| 🔒 BLOCKED_BY_PROVIDER_LIMITATION | 1 | 0% |
| 🟡 PARTIAL | 98 | 18% |
| 🔵 IMPLEMENTED_UNTESTED | 79 | 15% |
| 🟢 TESTED_WITH_MOCK | 2 | 0% |
| ✅ TESTED_WITH_REAL_PROVIDER | 4 | 0% |
| **Total** | **516** | 100% |

- **Verified working against a real provider:** 4 (0%)
- **Wired but unverified live (code looks real, no test/evidence):** 81 (15%)
- **Partial (some of the described behavior missing):** 98 (18%)
- **Broken, not implemented, mock-only, or UI-only:** 328 (63%)
- **Blocked on credential/infra/provider limits:** 4 (0%)

> Note: `IMPLEMENTED_UNTESTED` is not a green light — per the zero-trust rule, code existing is a hypothesis, not proof. Treat it as `NEEDS_VERIFICATION` until a real provider round-trip or test confirms it.

---

## Comms lanes (305 / 718) — thread + composer (56 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 7 | Mixed Hebrew-English bubbles | 🔴 BROKEN | none | components/cockpit/live/adapters.js only computes one language value per thread (from the latest preview), never per message body | A thread that switches languages message-to-message gets ONE direction for the whole thread, not per |
| 15 | Reply window peek (top 3) | ⬛ NOT_IMPLEMENTED | none | no supporting code found | Opposite of described: the thread list disappears entirely while a conversation is open, it doesn't  |
| 17 | Failed-delivery banner | ⬛ NOT_IMPLEMENTED | none | no aggregate query anywhere for messages with status Failed/QuotaExceeded across threads in the last 30 minutes | whatsapp_messages.status can be 'Failed'/'QuotaExceeded' but nothing surfaces a cross-thread banner  |
| 23 | Confidence handoff threshold | ⬛ NOT_IMPLEMENTED | none | no confidence scoring in app/api/ai/draft or app/api/ai/summarize; grep for handoff/uncertain/low-confidence across app+lib+components retur | No trace of any confidence threshold or hand-back-to-Gideon logic. |
| 24 | Halachic lockout | ⬛ NOT_IMPLEMENTED | none | repo-wide case-insensitive grep for halach/rabbi/'rav ' finds only a decorative 'rabbi' color token in components/cockpit/lib/colors.js — no | No code implements this safety rail at all. |
| 25 | Per-thread tone memory | ⬛ NOT_IMPLEMENTED | none | no per-contact tone profile storage found in lib/ or supabase schema references | Since drafting itself isn't AI-driven in the cockpit, there is nothing to vary tone by relationship. |
| 26 | Learning loop from his edits | ⬛ NOT_IMPLEMENTED | none | no code persists edited-vs-draft diffs anywhere for later bias/fine-tuning | No learning loop exists; edits are discarded once the box is cleared or the thread closes. |
| 27 | Smart reply suggestions (quick chips) | ⬛ NOT_IMPLEMENTED | none | no chip-generation code found | Not present under this or related terminology anywhere in the cockpit. |
| 28 | Running-late / reschedule one-tap | ⬛ NOT_IMPLEMENTED | none | grep for 'running late'/reschedule across app+components returns nothing | No canned bilingual quick-send templates exist. |
| 29 | Mark unread / follow-up flag | ⬛ NOT_IMPLEMENTED | none | no is_flagged/mark_unread column or endpoint found | RemindBell is a scheduled reminder, not a simple persistent unread/flag toggle. |
| 30 | Scheduled send | ⬛ NOT_IMPLEMENTED | none | app/api/whatsapp/messages/route.ts POST has no scheduled_at/send_at field or delayed-dispatch path; no cron in lib/cron/manifest.ts sends qu | No scheduled-send capability exists for WhatsApp anywhere in the codebase, let alone Shabbat-aware s |
| 32 | Duplicate-person merge | ⬛ NOT_IMPLEMENTED | none | components/cockpit/live/adapters.js adaptThreadRow keys thread.id by `row.phone` per panel independently; no merge/join logic anywhere match | By design the two numbers are never merged — a person texting both lines appears as two separate, un |
| 35 | Mistake-detection prompt | ⬛ NOT_IMPLEMENTED | none | no content/deal-mismatch heuristic in code | A blanket confirm-every-time dialog exists, but nothing detects a likely wrong-person/wrong-deal mix |
| 37 | Edit and delete a sent message | ⬛ NOT_IMPLEMENTED | timelines-ai | lib/timelines/client.ts has no message-edit or message-delete call; app/api/whatsapp/messages/route.ts only supports create (POST) and read  | Timelines.ai API has no edit/recall endpoint used in this codebase |
| 38 | Multi-device session health | ⬛ NOT_IMPLEMENTED | none | lib/timelines/client.ts / types.ts expose no account-connection-status field; no cron checks WhatsApp link health | No code monitors or surfaces a dropped WhatsApp Web/multi-device link. |
| 39 | Per-message language auto-detect | ⬛ NOT_IMPLEMENTED | none | components/cockpit/live/adapters.js detectLanguage() runs once per thread (on preview/contactName), never per incoming message body | Same underlying gap as id7 — detection is per-thread, not per-message. |
| 40 | Voice-note speed and skip controls | ⬛ NOT_IMPLEMENTED | none | components/cockpit/lib/voiceClient.js has no playbackRate or seek/skip logic anywhere; components/cockpit/lib/voiceCommands.js lists 'Nora,  | Incoming voice notes open in the browser's native player (no in-app controls at all), and the 'speed |
| 42 | Answered-from-other-channel detection | ⬛ NOT_IMPLEMENTED | supabase | lib/secretary/outbound-asks.ts markAskReplied() explicitly filters `.eq('channel', input.channel)` — an ask opened as 'whatsapp' can only be | Code directly contradicts the described behavior: the ask-clearing logic is channel-scoped by design |
| 44 | Duplicate-number and same-person merge | ⬛ NOT_IMPLEMENTED | none | no unified-person/identity-graph model found across pipedrive/contact-directory/whatsapp_threads tables; each channel+number is keyed indepe | No cross-channel (WhatsApp/email/two-phone-numbers) person-merge exists; only Pipedrive contact_id / |
| 45 | Internal note on a thread | ⬛ NOT_IMPLEMENTED | none | no app/api/whatsapp/notes route exists in the current tree (an older audit doc references one but it is gone / never called) | Confirmed removed/absent — no internal-note capability anywhere in the live cockpit. |
| 46 | Approve-and-send by voice | ⬛ NOT_IMPLEMENTED | none | components/cockpit/lib/voiceCommands.js lists 'Nora, send' only as a documentation string; grep confirms this file is never imported by any  | The entire voice-command grammar file is dead/unused documentation, not functioning code. |
| 47 | Batch morning triage | ⬛ NOT_IMPLEMENTED | none | app/api/briefing/today/route.ts has 'recent_investors'/'pending_followups' sections but no such tri-state comms triage; grep for must-answer | No overnight-triage categorization of WhatsApp threads exists. |
| 48 | Calendar booking from a thread | ⬛ NOT_IMPLEMENTED | none | app/api/bookings/* routes exist for the separate Terminal-invitation onboarding flow, not triggered from a WhatsApp thread | No thread-triggered calendar-hold flow exists; Zoom-from-thread (id33) creates an ad hoc meeting, no |
| 49 | Pre-Shabbat wrap and queue | ⬛ NOT_IMPLEMENTED | none | lib/center/soft-schedule.ts has a hardcoded Friday/Saturday Shabbat block, but only for calendar focus-time suggestions — not for WhatsApp s | Shabbat-awareness exists only in a different subsystem (task focus scheduling), not for comms triage |
| 50 | Undo send window | ⬛ NOT_IMPLEMENTED | none | app/api/whatsapp/messages/route.ts POST dispatches to Timelines synchronously with no grace-period queue | No undo-send capability exists. |
| 52 | Star and color-flag for follow-up | ⬛ NOT_IMPLEMENTED | none | no star/color-flag field or endpoint exists distinct from the time-based RemindBell | No simple persistent star/flag mechanism exists; the only 'peripheral' visibility is the dead family |
| 53 | Semantic search across everything | ⬛ NOT_IMPLEMENTED | none | the only embeddings code in the repo (lib/center/v2/embeds.ts) belongs to an unrelated legacy embedded-browser-tab registry, not a message-c | No semantic/vector search of comms content exists anywhere in the codebase. |
| 54 | Daily inbound-load briefing | ⬛ NOT_IMPLEMENTED | none | app/api/briefing/today/route.ts builds a morning brief (deals/investors/meetings/followups) but has no 'volume + who's-waiting-longest + top | The general morning brief exists but does not match this specific inbound-load/waiting-time framing, |
| 55 | Ask-and-answer ledger per investor | ⬛ NOT_IMPLEMENTED | supabase | lib/secretary/outbound-asks.ts / app/api/secretary/asks/route.ts track OUTBOUND asks Gideon sent that are awaiting a reply — the opposite di | A real ledger exists but tracks the reverse direction (his unanswered sends, not their unanswered qu |
| 56 | Voice-seed router with confirmation | ⬛ NOT_IMPLEMENTED | none | no code resolves a freestanding voice seed to a target thread/draft with a confirmation step | Dictation is scoped to the currently open thread; no standalone voice-seed-then-route-then-confirm f |
| 19 | Nora drafts every reply in his voice | 🟣 MOCK_ONLY | none | components/cockpit/live/adapters.js never sets noraDraft on a thread (only noraBlock:null); a real AI drafting endpoint exists at app/api/ai | Cockpit's 'Nora draft' is a single hardcoded generic English sentence for every thread — the real AI |
| 36 | Voice call inside WhatsApp | 🔒 BLOCKED_BY_PROVIDER_LIMITATION | timelines-ai | lib/timelines/client.ts exposes only chat/message/file/voice_message endpoints — no call-initiation API | Timelines.ai reseller API has no WhatsApp voice/video call endpoint |
| 3 | Thread list with unread counts | 🟡 PARTIAL | timelines-ai | app/api/whatsapp/threads/route.ts:59 unread_count: chat.read === false ? 1 : 0 — capped at 1, not a true count | Timelines only exposes a read/unread boolean, so the badge can never show 2+ even when many messages |
| 9 | Relationship routing into lanes | 🟡 PARTIAL | supabase | components/cockpit/live/adapters.js sets isInvestor + staffTag (via lib/cockpit/staff-roster.ts / lane_override); familyTag is never set any | Investor and Staff routing are real; 'family' and 'vendor' as distinct routed lanes do not exist in  |
| 13 | Listen to any message aloud | 🟡 PARTIAL | elevenlabs | components/cockpit/lib/voiceClient.js speak() POSTs /api/voice/speak (ElevenLabs) and plays via a shared <audio> element — no playbackRate c | TTS itself is real; the claimed 2x playback speed does not exist in code — always plays at normal sp |
| 18 | Search across all chats | 🟡 PARTIAL | none | SearchPalette.jsx:57-59 matches only `t.contactName + t.preview + t.id` (the thread's last-message preview), never full historical message b | Real Ctrl+K across both numbers, but it can't find 'any past WhatsApp message' — only the current pr |
| 20 | Nora's elevated thread read | 🟡 PARTIAL | anthropic | app/api/ai/summarize/route.ts is a real Claude call producing a short plain-English read; BUT CommsPanel.jsx:804 builds context as `sortedMe | Real AI call, but for any thread with more than 8 messages the summary is built from stale ancient c |
| 21 | Hebrew dugri register | 🟡 PARTIAL | anthropic | app/api/ai/summarize/route.ts SYSTEM prompt explicitly says 'If the message is in Hebrew, write the read in Hebrew (dugri register)' — real. | Dugri register exists only for the AI 'read', not for anything Gideon actually sends. |
| 22 | 30-second voice seed to message | 🟡 PARTIAL | openai | components/cockpit/lib/voiceClient.js useDictation() returns the raw Whisper/Groq transcript verbatim; no LLM pass restructures it into a po | Voice-to-text works, but there is no 'Nora turns it into a structured, sendable reply' step — the ra |
| 31 | Ghosted / overdue nudge queue | 🟡 PARTIAL | supabase | app/api/secretary/asks/route.ts GET returns an 'overdue' bucket (status=open, expected_reply_by passed) built from lib/secretary/outbound-as | The real overdue/ghosted-nudge mechanism lives in the NorasDesk panel, not inside the Comms 305/718/ |
| 33 | Quick-call / Zoom from a thread | 🟡 PARTIAL | zoom | POST /api/zoom/create-meeting returns a real join_url which is dropped into the reply box for review before send; no phone-call-placement bu | Zoom-from-thread is real; 'quick-call' (placing a phone/voice call) has no equivalent control. |
| 34 | Thread-to-task / reminder | 🟡 PARTIAL | supabase | app/api/bucket route + app/api/bucket/[id]/remind — real due-dated task creation | Creates a generic 'reply to this person' task, not an extracted action item ('send the rent roll Tue |
| 41 | Draft side-by-side with edit-in-place | 🟡 PARTIAL | none | see id19/id26 — the content being edited is a static template, and edits are never persisted to bias future drafts | The inline-edit UX mechanic is real; the 'his fixes teach her' half of the claim is not (no learning |
| 43 | Whole-conversation recap on open | 🟡 PARTIAL | anthropic | CommsPanel.jsx:804 `sortedMessages.slice(0, 8).reverse()` pulls the OLDEST 8 messages (see id20) instead of the most recent 8 | For a genuinely 'cold' thread with real history, this bug means the recap is built from the earliest |
| 51 | Wrong-recipient guard | 🟡 PARTIAL | none | no automated content/deal-context mismatch detection anywhere | A blanket manual confirm naming recipient+channel is real; there is no smart detection of a wrong-in |
| 1 | Unified WhatsApp inbox | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | app/api/whatsapp/threads/route.ts pulls getAllChats(panel) from lib/timelines/client.ts and upserts into whatsapp_threads; app/api/whatsapp/ | Real live pull from Timelines.ai into one screen per number; no automated tests but code path is rea |
| 2 | Multi-number support (305 + 718) | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | app/api/whatsapp/threads/route.ts requires panel=305\|718 and PANEL_ACCOUNT_MAP in lib/timelines/client.ts maps each to its own Timelines Wh | 305 and 718 are two genuinely separate live-fed columns; they are never merged (see id32/44 for the  |
| 4 | Open conversation in place | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | app/api/whatsapp/messages/route.ts GET serves that thread's messages by phone+panel | Confirmed each lane opens independently without collapsing siblings. |
| 6 | Hebrew RTL native rendering | 🔵 IMPLEMENTED_UNTESTED | anthropic | components/cockpit/live/adapters.js detectLanguage() via HEBREW_RE tests preview/contactName and sets thread.language | Real per-thread Hebrew detection drives genuine RTL layout, not a translated placeholder. |
| 8 | Contact name resolution | 🔵 IMPLEMENTED_UNTESTED | pipedrive | app/api/whatsapp/threads/route.ts findPersonByPhone() (Pipedrive) then lib/contact-directory/client.ts lookupByPhone() phonebook fallback pa | Real two-tier name resolution (Pipedrive then phonebook) with Redis caching. |
| 10 | Channel color coding | 🔵 IMPLEMENTED_UNTESTED | none | components/cockpit/lib/colors.js channel color map keyed by 305/718 × WA/SMS/iM/investor/staff | Real, consistent per-channel color system. |
| 11 | Attach a file | 🔵 IMPLEMENTED_UNTESTED | supabase | components/cockpit/lib/uploads.js uploads to Supabase Storage bucket 'attachments'; app/api/whatsapp/messages/route.ts POST accepts attachme | Real upload + real WhatsApp media send, with an explicit confirm dialog. |
| 12 | Record and send a voice note | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | components/cockpit/lib/uploads.js + app/api/whatsapp/messages/route.ts (same attachment path as file send) | Real recording/upload/send; code comment elsewhere mislabels a related button 'mock-only' but this o |
| 14 | Dictate a reply (Hebrew or English) | 🔵 IMPLEMENTED_UNTESTED | openai | components/cockpit/lib/voiceClient.js useDictation() POSTs to /api/voice/transcribe-he or -en; app/api/voice/transcribe-en/route.ts uses Gro | Real Whisper-class transcription, language chosen explicitly by the tapped button. |
| 16 | Per-thread reminder bell | 🔵 IMPLEMENTED_UNTESTED | supabase | app/api/bucket/fire-reminders/route.ts is a registered cron (lib/cron/manifest.ts) that fires due reminders; components/center/ReminderToast | Real end-to-end: bucket carrier row + cron + live toast, not a UI-only toggle. |
| 5 | Send and receive text | ✅ TESTED_WITH_REAL_PROVIDER | timelines-ai | app/api/whatsapp/messages/route.ts POST calls lib/timelines/client.ts sendMessage(); app/api/whatsapp/webhook/route.ts ingests inbound Timel | Genuinely real two-way send/receive, not a stub. |

## Comms lanes — calls / SMS / voicemail + thread (73 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 61 | Click-to-call | ⬛ NOT_IMPLEMENTED | none | grep for tel: in components/cockpit and app/cockpit returns zero matches | Real click-to-call (tel: + Pipedrive caller-ID preview) exists only in components/phone/QuickCallMod |
| 63 | Pick the outbound line | ⬛ NOT_IMPLEMENTED | none | app/api/phone/quo-send/route.ts:21,44 (from line is fixed to QUO_SEND_FROM/305, not user-selectable per send) | Outbound line is implied by which thread/lane is open, not an explicit picker before sending. |
| 64 | Visual voicemail inbox | ⬛ NOT_IMPLEMENTED | none | phone_calls table (supabase/phone_calls_migration.sql) has no voicemail-specific columns; no GET route lists it | phone_calls is write-only per _ops-context/HANDOFF-BRIEF.md:290 |
| 65 | Voicemail-to-text | ⬛ NOT_IMPLEMENTED | none | No route transcribes phone_calls.recording_url; Whisper pipeline (lib/center/voice-note.ts) only covers WhatsApp voice notes, not call/voice | HANDOFF-BRIEF.md:290 confirms 'No call transcription.' |
| 66 | Missed-call list | ⬛ NOT_IMPLEMENTED | none | phone_calls rows include direction/status but nothing reads them for a missed-call view |  |
| 71 | Do-not-disturb for Shabbat | ⬛ NOT_IMPLEMENTED | hebcal | lib/zmanim/postville.ts, lib/center/soft-schedule.ts:124 isInShabbatWindow (used only for briefing scheduling, not call/notification silenci | Shabbat is a visual countdown pill and a briefing-scheduling heuristic; no code silences ringing/fol |
| 75 | Tap-to-text-back a missed caller | ⬛ NOT_IMPLEMENTED | none | — | No missed-call list exists to tap from. |
| 76 | Live call peripheral banner | ⬛ NOT_IMPLEMENTED | none | components/cockpit/chrome/MeetingNowBanner.jsx exists only for Zoom meetings, not phone calls |  |
| 77 | AI call summary | ⬛ NOT_IMPLEMENTED | none | /api/ai/summarize (app/api/ai/summarize/route.ts) only summarizes text/WhatsApp thread bodies, never call audio/recordings |  |
| 78 | Hebrew call transcription | ⬛ NOT_IMPLEMENTED | none | No pipeline transcribes phone_calls.recording_url in any language |  |
| 79 | Accent-tuned transcription | ⬛ NOT_IMPLEMENTED | none | No custom-vocabulary/accent-tuning config found for Whisper/Groq calls (app/api/voice/transcribe-*) |  |
| 81 | AI receptionist for unknown callers | ⬛ NOT_IMPLEMENTED | none | No IVR/AI-answering integration found for Quo/OpenPhone calls |  |
| 82 | Tiered call answering | ⬛ NOT_IMPLEMENTED | none | — |  |
| 84 | Missed-call follow-up nudges | ⬛ NOT_IMPLEMENTED | none | — | No missed-call concept exists to nudge about. |
| 85 | Voicemail urgency triage | ⬛ NOT_IMPLEMENTED | none | — |  |
| 86 | Relationship-sorted call log | ⬛ NOT_IMPLEMENTED | none | — | No call log exists to group. |
| 87 | Daily phone briefing | ⬛ NOT_IMPLEMENTED | none | /api/briefing/today exists for a morning brief (deals/investors/calendar) but does not include calls/voicemails per lib/domains/schema-manif | A morning brief exists but has no phone-specific section. |
| 88 | Callback queue with priority | ⬛ NOT_IMPLEMENTED | none | — |  |
| 89 | Israel time-zone awareness | ⬛ NOT_IMPLEMENTED | none | No timezone-aware dial warning found |  |
| 91 | On-call talking points | ⬛ NOT_IMPLEMENTED | none | No live-call UI exists to attach talking points to |  |
| 92 | Auto-translate Hebrew voicemails | ⬛ NOT_IMPLEMENTED | none | No voicemail ingestion/translation pipeline exists |  |
| 93 | VIP ring-through during quiet hours | ⬛ NOT_IMPLEMENTED | none | No quiet-hours/VIP-allowlist logic found anywhere in phone routes |  |
| 94 | Warm-transfer to team | ⬛ NOT_IMPLEMENTED | none | No call-transfer integration with Quo/OpenPhone found | The 'Move to Staff lane' action (CommsPanel.jsx:685-717) reassigns a thread's lane in the DB; it is  |
| 95 | Scheduled text and call send | ⬛ NOT_IMPLEMENTED | none | CommsPanel's ReminderPicker (CommsPanel.jsx:210-259) schedules a bucket reminder to ping Gideon later, not a delayed/held outbound text or c | Reminders schedule a nudge-to-self, not the send itself; not the same feature. |
| 97 | New-number alert for known person | ⬛ NOT_IMPLEMENTED | none | whatsapp_threads is keyed on phone; a new number creates a new thread with no cross-reference/alert to the old one |  |
| 98 | After-call auto-text | ⬛ NOT_IMPLEMENTED | none | No post-call hook exists (calls aren't surfaced at all) |  |
| 99 | Spoken caller announcement | ⬛ NOT_IMPLEMENTED | none | No incoming-call event triggers TTS; CallerIdDrawer is demo-toggle only (see id 80) |  |
| 100 | Auto-reply when unavailable | ⬛ NOT_IMPLEMENTED | none | No auto-responder logic found in quo-webhook/bb-webhook/quo-send |  |
| 101 | Repeat-caller pattern alert | ⬛ NOT_IMPLEMENTED | none | No call-frequency pattern detection exists (calls aren't tracked in UI at all) |  |
| 102 | One-tap meeting from a call | ⬛ NOT_IMPLEMENTED | none | app/api/zoom/create-meeting | The closest real analog (one-tap Zoom invite) is on text threads, not triggered from a call, since n |
| 103 | Cross-channel handoff | ⬛ NOT_IMPLEMENTED | none | — |  |
| 104 | Pin a thread to top | ⬛ NOT_IMPLEMENTED | none | No pin control found in CommsPanel.jsx thread rows |  |
| 105 | Pause a conversation | ⬛ NOT_IMPLEMENTED | none | — | Only a personal reminder ping exists (id 95); no snooze-and-hide-the-thread mechanic. |
| 106 | Mark unread to handle later | ⬛ NOT_IMPLEMENTED | none | No mark-unread toggle in CommsPanel.jsx |  |
| 107 | Star or flag for follow-up | ⬛ NOT_IMPLEMENTED | none | No star/flag control on ThreadRow in CommsPanel.jsx |  |
| 108 | Per-person mute | ⬛ NOT_IMPLEMENTED | none | — | blocked_contacts table/route (id 70) is all-or-nothing block, not a silent per-person mute. |
| 109 | Number porting and second-device ring | ⬛ NOT_IMPLEMENTED | none | — | No simultaneous-ring/device-forwarding config found in the app. |
| 110 | International dialing made simple | ⬛ NOT_IMPLEMENTED | none | components/phone/QuickCallModal.tsx:24-36 has real E.164/country-code normalization | Normalization logic exists but only in the legacy QuickCallModal, not the cockpit; no click-to-call  |
| 111 | WhatsApp-vs-SMS smart routing | ⬛ NOT_IMPLEMENTED | none | components/cockpit/panels/CommsPanel.jsx:26-56 shows WA/SMS/iM as separate manual bands per lane | Channel choice is manual (user opens the WA vs SMS lane); there's no automatic routing decision engi |
| 112 | Promise and deadline tracker | ⬛ NOT_IMPLEMENTED | none | No commitment/deadline extraction from calls or texts found (bucket_items are manually created, not auto-extracted from message content) |  |
| 113 | Quiet ramp before Shabbat | ⬛ NOT_IMPLEMENTED | none | components/cockpit/chrome/TopChrome.jsx:866-1005 shows a countdown only | No pre-Shabbat warning/auto-draft-sign-off flow exists. |
| 114 | Hebrew-or-English reply matching | ⬛ NOT_IMPLEMENTED | none | Reply drafts are a static English template (see id 83); the Hebrew-aware behavior only exists in the read-summary prompt (app/api/ai/summari |  |
| 116 | Whisper a fact during a live call | ⬛ NOT_IMPLEMENTED | none | No live-call UI/state exists to surface a whisper card against |  |
| 117 | After a call, one-tap next action | ⬛ NOT_IMPLEMENTED | none | — |  |
| 118 | Deal-aware caller dossier | ⬛ NOT_IMPLEMENTED | none | components/cockpit/drawers/CallerIdDrawer.jsx (demo-only, see id 80) | Duplicate of id 80 — same demo-only, hardcoded drawer. |
| 119 | Soften my draft slider | ⬛ NOT_IMPLEMENTED | none | No tone-slider control found in ReplyZone (CommsPanel.jsx:1007-1310) |  |
| 120 | Tone and pressure read on a thread | ⬛ NOT_IMPLEMENTED | none | app/api/ai/summarize prompt (route.ts:20-27) asks for a plain read + next move, not a structured tone/pressure signal |  |
| 121 | Best time to reach this person | ⬛ NOT_IMPLEMENTED | none | — |  |
| 123 | Spoken inbox briefing | ⬛ NOT_IMPLEMENTED | none | No 'read my inbox aloud' aggregate button found; ListenButton only reads one piece of text at a time (a draft or a single Nora read) |  |
| 125 | Number-spoofing and fraud alert | ⬛ NOT_IMPLEMENTED | none | No caller-ID-spoofing detection or new-number-for-known-contact alert logic found anywhere in phone or whatsapp routes |  |
| 126 | Daily phone close-out | ⬛ NOT_IMPLEMENTED | none | No end-of-day phone recap route/section found (briefing/today is morning-only per app/api/briefing/today/route.ts) |  |
| 127 | Group text to a deal team | ⬛ NOT_IMPLEMENTED | none | components/cockpit/panels/CommsPanel.jsx ReplyZone sends to a single `phone`/thread only | No multi-recipient/group-send capability found. |
| 128 | Long-press to escalate to a call | ⬛ NOT_IMPLEMENTED | none | No long-press handler found on ThreadRow (CommsPanel.jsx:489-558); no tel: link exists in the cockpit at all (see id 61) |  |
| 129 | Repeat-caller and urgency pattern | ⬛ NOT_IMPLEMENTED | none | — | Duplicate of id 101 — no call data is tracked anywhere to detect a repeat-call pattern. |
| 80 | Live caller dossier on ring | 🟣 MOCK_ONLY | none | components/cockpit/drawers/CallerIdDrawer.jsx:12-54 (hardcoded 'Doron Sagiv' content, buttons have no onClick handlers) | Drawer only opens via demo toggle state.phoneState==='caller-id-t1' (components/cockpit/demo/DemoSta |
| 83 | AI text reply drafts in his voice | 🟣 MOCK_ONLY | none | live/adapters.js never sets thread.noraDraft (only static components/cockpit/data/threads.js mock threads have it); app/api/ai/draft is only | Live threads always fall back to a fixed generic sentence, not an LLM draft in Gideon's voice; the r |
| 115 | Family lane, low friction | 🟣 MOCK_ONLY | none | components/cockpit/chrome/RecentlyActiveStrip.jsx:22 'familyTag has no live source yet' | familyTag is only ever true on static demo mock threads (components/cockpit/data/threads.js); no liv |
| 58 | iMessage thread sync | 🔒 BLOCKED_BY_INFRASTRUCTURE | bluebubbles | app/api/phone/bb-webhook/route.ts:47-134 (real ingest into whatsapp_threads/whatsapp_messages, channel_type imessage) | BlueBubbles Mac host at 8.30.153.45 is offline |
| 57 | Two-line unified inbox | 🟡 PARTIAL | quo-openphone | app/api/phone/quo-webhook/route.ts:127-218 (writes calls to phone_calls, SMS to whatsapp_threads/messages panel='305'); app/api/phone/bb-web | phone_calls is write-only, no read route/UI |
| 59 | Line badge on every item | 🟡 PARTIAL | quo-openphone | live/adapters.js:34-48 channelKey(panel, channel_type) | Every text row shows its line/channel via the sub-pillar lane + badge; calls have no equivalent sinc |
| 60 | Caller ID from his contacts | 🟡 PARTIAL | pipedrive | app/api/whatsapp/threads/route.ts:280-329 (Pipedrive lookup then lib/contact-directory/client.ts lookupByPhone fallback, real DB-backed) | Real caller-ID naming for text threads (Pipedrive + phonebook fallback); calls have no caller-ID sur |
| 67 | Full call and text history per person | 🟡 PARTIAL | quo-openphone | whatsapp_messages aggregates sms+whatsapp+imessage per phone | Text/WhatsApp/iMessage messages merge into one per-contact timeline; calls and voicemail are entirel |
| 68 | Speak-aloud button on transcripts | 🟡 PARTIAL | elevenlabs | app/api/voice/speak (per docs/API_ROUTE_AUDIT.md:81, ElevenLabs) | TTS playback mechanism is real and used on Nora's read + reply drafts, but there are no call/voicema |
| 70 | Block a number | 🟡 PARTIAL | supabase | app/api/contacts/block/route.ts:1-80 (real cross-channel block by pipedrive_contact_id/phone across whatsapp_threads) | no cockpit UI entry point |
| 72 | Unread call and text count | 🟡 PARTIAL | quo-openphone | whatsapp_threads.unread_count | Unread text count is real and live; there is no call count since calls aren't surfaced. |
| 73 | Search across all calls and texts | 🟡 PARTIAL | supabase | components/cockpit/chrome/SearchPalette.jsx:53-58 matchThreads filters on contactName/preview/id | Cmd/Ctrl+K palette searches live thread name + last-message preview + phone id, not full message-bod |
| 74 | Send and receive photos and files | 🟡 PARTIAL | supabase | lib/uploads.js uploadAttachment -> Supabase Storage, POST /api/whatsapp/messages with attachment_url | Real send/receive of photos & files, but only on WhatsApp-panel threads — the attach button lacks a  |
| 90 | Voice-note send and receive | 🟡 PARTIAL | none | lib/uploads.js, POST /api/whatsapp/messages with attachment; inbound voice notes transcribed via lib/center/voice-note.ts storeAndTranscribe | Real record/send/receive+transcribe, but only on WhatsApp-panel threads (requires `panel`, so SMS/iM |
| 122 | Hand a thread to a teammate | 🟡 PARTIAL | supabase | PATCH /api/whatsapp/threads/[id] sets lane_override='staff'\|'general' | lane_override migration status uncertain (docs/DATABASE_AUDIT.md:188 lists it as pending in one plac |
| 62 | In-app SMS reply | 🔵 IMPLEMENTED_UNTESTED | quo-openphone | app/api/phone/quo-send/route.ts:31-79 (real OpenPhone API call for 305-SMS); app/api/whatsapp/messages route for WA lanes | Real send path with confirm dialog and optimistic echo; no automated tests found. |
| 69 | Dictated text replies | 🔵 IMPLEMENTED_UNTESTED | openai | app/api/voice/transcribe-he, transcribe-en routes (Groq whisper-large-v3, OpenAI whisper-1 fallback) | Real dictation in both languages feeds the reply box; it inserts the raw Whisper transcript verbatim |
| 96 | Conversation thread summary | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/ai/summarize/route.ts:1-50 (real Anthropic call, 2-3 sentence read) | Summarizes only the last 8 messages of the open thread (CommsPanel.jsx:804), which covers 'a long ba |
| 124 | Reply by voice, sent as text | 🔵 IMPLEMENTED_UNTESTED | openai | app/api/voice/transcribe-en, transcribe-he + app/api/phone/quo-send / /api/whatsapp/messages | Real end-to-end voice-to-text-to-send path exists; transcript is inserted raw (no LLM voice-styling  |

## Email column (left flank) (31 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 140 | Relationship labeling | ⬛ NOT_IMPLEMENTED | none | grep for posek/capital partner/relationship tagging in email scoring/pipedrive client returned nothing beyond a boolean isInvestor flag | Only a binary investor/not-investor signal exists (lib/pipedrive/client.ts parseInvestorTag); no fam |
| 142 | Calendar invite catch | ⬛ NOT_IMPLEMENTED | none | sync/route.ts stores has_ics (msg.hasICS) into reasons, and it feeds scoring only (lib/scoring/email.ts); triage/route.ts returns has_ics bu | Signal is captured server-side for scoring but never surfaced as a UI offer to create a calendar eve |
| 147 | Sender context card | ⬛ NOT_IMPLEMENTED | none | No sender-context endpoint consumed by EmailPanel; Pipedrive resolution in triage/route.ts only attaches pipedrive_id/name to the row, never |  |
| 152 | Read-it-to-me inbox triage | ⬛ NOT_IMPLEMENTED | none | Voice exists per-email (ListenButton, DictateButtons) but there is no sequential auto-advance triage mode driven by voice commands |  |
| 153 | Shabbat send-hold | ⬛ NOT_IMPLEMENTED | none | app/api/email/send/route.ts sends immediately on POST with no time-of-day/Shabbat gate; religious-calendar/zmanim code exists only for booki | Shabbat/zmanim data exists in the app but is not connected to the email send path at all. |
| 154 | New-name alert | ⬛ NOT_IMPLEMENTED | none | triage/route.ts resolves Pipedrive id but never flags unknown senders back to the client as a distinct alert; no add-contact affordance foun |  |
| 155 | Voicemail and call into the thread | ⬛ NOT_IMPLEMENTED | none | grep for 'aircall'/'Aircall' across the whole repo returned zero matches; email.thread rendering (EmailPanel.jsx:908-939) is a static passth | No Aircall integration exists at all — this is a different provider than the phone_calls table (Blue |
| 160 | Calendar-from-email | ⬛ NOT_IMPLEMENTED | none | Same as id 142 — has_ics is captured for scoring only, never turned into a one-word calendar-create action | Duplicate finding of id 142. |
| 143 | Reply-needed flag | 🟣 MOCK_ONLY | none | No field for 'awaiting decision' in email_scores/reasons; scoring only produces a numeric score and reason list, not a binary reply-needed f |  |
| 151 | Split inbox by relationship | 🔒 BLOCKED_BY_CREDENTIAL | gmail-api | lib/google/gmail.ts:76-90 secondaryAccountStatus() checks GOOGLE_REFRESH_TOKEN_2; sync/route.ts and triage/route.ts fully support multi-acco | GOOGLE_REFRESH_TOKEN_2 not set |
| 144 | Search his mail | 🟡 PARTIAL | none | Client-side substring filter over from/subject/preview (EmailPanel.jsx:190-196) — no server endpoint, no semantic/plain-language search | Works for literal substrings only; cannot answer 'the IGA guarantee email from Houchens' style natur |
| 149 | Cross-channel context | 🟡 PARTIAL | none | components/cockpit/lib/noraContext.js:30-100 — no email data included; cross-channel linking for WhatsApp+call exists via lib/contact-direct | WhatsApp+call cross-linking exists via Pipedrive/contact_directory; email is not wired into the same |
| 157 | Tone match to the person | 🟡 PARTIAL | anthropic | app/api/email/draft/route.ts SYSTEM prompt (lines 17-24) is a single fixed 'institutional real-estate voice' with a Hebrew branch only — no  | Hebrew vs English branching is real; per-relationship tone (warm to family vs dugri to investors) is |
| 158 | Where-did-it-go search | 🟡 PARTIAL | none | No NLP/semantic query endpoint; client-side .includes() only (EmailPanel.jsx:190-196) | Cannot resolve a natural-language description like 'the IGA guarantee email from Houchens' unless th |
| 130 | Unified Gmail inbox | 🔵 IMPLEMENTED_UNTESTED | gmail-api | app/api/email/triage/route.ts:103-192 reads email_scores (populated by app/api/email/sync/route.ts:156-274 via lib/google/gmail.ts listRecen | Primary mailbox (g@reprime.com) is live; secondary (floridastatetrust) is BLOCKED_BY_CREDENTIAL, see |
| 131 | Smart triage feed | 🔵 IMPLEMENTED_UNTESTED | none | lib/scoring/email.ts:69+ scoreEmail() is a real deterministic scorer (Pipedrive match, investor tag, deal-name match, ICS, bulk/auto-reply d | TESTED_WITH_MOCK on the scoring function itself; end-to-end live behavior untested. |
| 133 | One-line AI summary per email | 🔵 IMPLEMENTED_UNTESTED | anthropic | Row preview is the raw Gmail snippet (adapters.js adaptEmails: preview = snippet), not AI-generated; real AI summary is only fetched per-ope | As described ('under each subject' in the list) this is PARTIAL — the list row shows a raw snippet,  |
| 134 | Thread summary | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/ai/summarize/route.ts POST — real Anthropic call scoped to kind:'email' | Summarizes the single opened message + snippet, not a full multi-message thread reconstruction (emai |
| 135 | Listen to any email | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | components/cockpit/lib/voice.jsx ListenButton calls voiceClient speak() -> /api/voice/speak (not read in this pass but referenced consistent | No 2x playback-speed control found anywhere in voice.jsx/voiceClient in the surface reviewed — 'Spee |
| 136 | Draft reply in his voice | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/email/draft/route.ts — real Anthropic call with a Gideon-voice system prompt, Hebrew-aware |  |
| 137 | Edit draft in place | 🔵 IMPLEMENTED_UNTESTED | none | purely client-side state (replyMode/replyText), no backend call to edit |  |
| 138 | Voice dictation reply | 🔵 IMPLEMENTED_UNTESTED | openai | components/cockpit/lib/voice.jsx DictateButtons posts to /api/voice/transcribe-en or transcribe-he (per NoraChat.jsx:253 pattern), fills rep |  |
| 139 | Send from cockpit | 🔵 IMPLEMENTED_UNTESTED | sendgrid | app/api/email/send/route.ts — real SendGrid send via lib/sendgrid/client, replyTo resolved to the mailbox, send-as locked server-side to g@r | Confirm-before-send gate present per user's guardrail requirement. |
| 141 | Bilingual handling | 🔵 IMPLEMENTED_UNTESTED | anthropic | adapters.js detectLanguage() (Hebrew regex) tags rows; /api/email/draft replies natively in Hebrew per system prompt (route.ts:22) | Detection is a simple Hebrew-char regex on subject/snippet, not a language classifier — adequate for |
| 145 | Mark read or unread | 🔵 IMPLEMENTED_UNTESTED | gmail-api | app/api/email/mark-read/route.ts — real gmail.users.messages.modify UNREAD label toggle, needs gmail.modify scope (403 -> needs_consent surf |  |
| 146 | Peripheral new-mail signal | 🔵 IMPLEMENTED_UNTESTED | none | unreadCountFor() derives from live emails array (real triage data) | Confirmed real inside the Email panel itself; whether it also surfaces peripherally while another pa |
| 148 | Daily inbox briefing | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/briefing/today/route.ts builds a real morning brief from calendar (lib/google/calendar.ts) + Pipedrive deals + bucket via lib/center | This is the general cockpit morning brief (not email-specific); still satisfies the described capabi |
| 150 | Hebrew investor mode | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/email/draft/route.ts:22 explicit instruction: 'reply in native business Hebrew (dugri register), never machine-translated' | Same endpoint as id 141/198; 'dugri register' is a prompt instruction, not independently verifiable  |
| 156 | Draft from a one-line voice seed | 🔵 IMPLEMENTED_UNTESTED | anthropic | Routes through /api/nora/chat (general Anthropic chat, not the email-specific draft endpoint) — produces a conversational reply, not a finis | The described one-line voice-seed -> finished email in EmailPanel's reply zone isn't wired; /draft o |
| 159 | Daily one-listen briefing | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/briefing/today/route.ts | Duplicate of id 148; no evidence of a fixed 90-second runtime constraint, but the mechanism (real da |
| 132 | Investor and partner surfacing | 🟢 TESTED_WITH_MOCK | none | lib/scoring/email.ts +10 fromIsTaggedInvestor; sync/route.ts:61-105 loadInvestorEmailIndex() from Pipedrive investor tags |  |

## Nora's Desk (right) (41 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 166 | Next-action call | ⬛ NOT_IMPLEMENTED | none | adapters.js:324-386 adaptNoraDesk() hardcodes ask text per source type ('Mark it done, or snooze?' etc.) — not an LLM call, so it's a fixed  | MOCK_ONLY relative to the claim: the 'ask' field is a hardcoded string keyed to card type, not a gen |
| 168 | Shabbat and Yom Tov guard | ⬛ NOT_IMPLEMENTED | none | Same finding as id 153 — zmanim/religious-calendar code exists but is not wired into any Nora-initiated outbound message or scheduling path |  |
| 169 | Relationship-tagged contacts | ⬛ NOT_IMPLEMENTED | none | Same as id 140 — no capital-partner/family/legal/vendor/posek taxonomy exists anywhere in the reviewed surfaces |  |
| 171 | Unread by category | ⬛ NOT_IMPLEMENTED | none | adaptNoraDesk() cards carry no category field beyond type (call/question/zoom/reminder) |  |
| 174 | Book and reschedule | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts — plain Anthropic messages.create with no `tools` param (grep for tool_use/function_call returned nothing); no ca | Nora can only talk about scheduling in prose; she cannot actually create/move/cancel a Google Calend |
| 177 | Who is this caller | ⬛ NOT_IMPLEMENTED | none | app/api/phone/call-event/route.ts logs completed/missed calls into phone_calls table (fed by an offline BlueBubbles Mac daemon per cluster c | BlueBubbles call-log daemon Mac is offline (infrastructure) — but also no consuming UI exists regard |
| 179 | Cross-channel dedupe | ⬛ NOT_IMPLEMENTED | none | Pipedrive person_id links exist independently per surface (email triage/route.ts:145-163, whatsapp/threads presumably similarly) but nothing | Each channel resolves its own Pipedrive/contact_directory match; there's no cross-channel merged thr |
| 181 | Multilingual investor memory | ⬛ NOT_IMPLEMENTED | none | No contact_directory or Pipedrive field for language preference; detectLanguage() (adapters.js:22-24) re-detects per-message from Hebrew-cha |  |
| 182 | Spam and time-waster filter | ⬛ NOT_IMPLEMENTED | none | Email scoring has a BULK_HINT_SUBJ_RE (newsletter/digest/sponsored) that only lowers score, it never removes/hides rows entirely; no equival | PARTIAL at best for email (score-down, not hide); duplicate of id 192 for Nora's Desk, where nothing |
| 183 | Voice-command actions | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts has no tool-calling / action-execution path — it only returns prose | Voice-to-text-to-chat exists; voice-to-executed-action does not. |
| 184 | Send-on-your-behalf with guardrails | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts never calls /api/email/send, /api/whatsapp send, or any SMS endpoint; app/api/email/send/route.ts is only ever in | The product deliberately keeps sends human-triggered (confirm-send gates); 'Nora actually sends on y |
| 185 | Quiet hours and Shabbat auto-hold | ⬛ NOT_IMPLEMENTED | none | Same as id 153/168 — zmanim data exists for bookings/calendar UI only, not wired to any message-send code path | Duplicate finding of id 153/168. |
| 188 | He-said-she-said thread memory | ⬛ NOT_IMPLEMENTED | none | nora_chat_messages table only stores the chat transcript (last 50, app/api/nora/history/route.ts), not per-contact-thread commitment trackin |  |
| 190 | Ghosted-by-you alert | ⬛ NOT_IMPLEMENTED | none | grep for 'ghost' across the repo found only an unrelated CSS helper name (ghostActionStyle in NorasDesk.jsx:440); overdue asks (id 175) are  |  |
| 191 | Who-is-this before he answers | ⬛ NOT_IMPLEMENTED | none | Same phone_calls/contact_directory backend as id 177 | BlueBubbles call-log daemon Mac offline |
| 192 | Spam and time-waster wall | ⬛ NOT_IMPLEMENTED | none | adaptNoraDesk() has no filtering/classification step at all — every open bucket item and ask becomes a card unconditionally | Duplicate of id 182. |
| 194 | Same-thread Hebrew-English bridge | ⬛ NOT_IMPLEMENTED | none | No code path reconciles a single thread that alternates Hebrew/English messages beyond tagging each message independently |  |
| 195 | Double-book and conflict catch | ⬛ NOT_IMPLEMENTED | none | lib/center/soft-schedule.ts computes 'suggested focus' for the brief but was not found to detect/warn about calendar conflicts against daven | Not fully exhaustively traced (CalendarPanel.jsx internals not opened), but no conflict-detection ca |
| 196 | VIP rules he sets once | ⬛ NOT_IMPLEMENTED | none | No vip_rules-style table or config found in any reviewed lib/api path |  |
| 197 | Voice commands that act | ⬛ NOT_IMPLEMENTED | none | No tool-calling in app/api/nora/chat/route.ts | Duplicate of id 183. |
| 199 | Undo-send safety window | ⬛ NOT_IMPLEMENTED | none | app/api/email/send/route.ts sends immediately via SendGrid with no delay/queue/cancel window |  |
| 200 | Team task intake | ⬛ NOT_IMPLEMENTED | none | adaptNoraDesk() only builds cards from outbound_asks and manually-created bucket items (via /api/bucket POST triggered by explicit user acti |  |
| 161 | Reads every channel | 🟡 PARTIAL | none | components/cockpit/lib/noraContext.js:30-100 pulls from /api/whatsapp/threads (both panels) which the adapter maps to WhatsApp/SMS/iMessage  | WhatsApp/SMS/iMessage/calendar are genuinely merged into one grounding context for chat; email is mi |
| 167 | Hebrew native handling | 🟡 PARTIAL | anthropic | app/api/nora/chat/route.ts language detection + system prompt 'Code-switch to Hebrew naturally' | Real for chat + email; no dedicated Hebrew handling for WhatsApp/SMS threads found in this pass. |
| 173 | Calendar awareness | 🟡 PARTIAL | google-calendar | Real calendar events (lib/google/calendar.ts via /api/briefing/today) are passed into every chat turn's context; Nora answers via generic LL | Grounded but generic — no explicit conflict-detection function, just LLM inference over a compact ev |
| 178 | Tone match per relationship | 🟡 PARTIAL | anthropic | app/api/email/draft/route.ts SYSTEM prompt | Duplicate finding of id 157. |
| 189 | Did-they-reply watch | 🟡 PARTIAL | none | outbound_asks status flips to 'replied' presumably via inbound webhook auto-close (referenced in secretary/asks/route.ts comment, WhatsApp w | Real for WhatsApp (per code comment) and manual email marking; no push notification/alert when someo |
| 193 | Tone matched to the person | 🟡 PARTIAL | anthropic | app/api/email/draft/route.ts, app/api/nora/chat/route.ts | Duplicate finding of id 157/178 — no Gulf-family-office vs Brooklyn-broker tone distinction exists. |
| 201 | Shirel requests = top priority | 🟡 PARTIAL | none | Shirel is only referenced as a STAFF_NAME_TOKEN for WhatsApp lane routing (lib/cockpit/staff-roster.ts:17) and in the 6-person send-as roste | Shirel is recognized as a named person in two unrelated systems (WhatsApp staff lane, identity roste |
| 162 | Drafts replies in his voice | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/nora/chat/route.ts — real Anthropic call, but produces a conversational answer, not a structured 'ready-to-send reply for thread X'  | Chat can be asked to draft text but there's no dedicated per-thread draft action from Nora's Desk it |
| 163 | Morning brief | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/briefing/today/route.ts | Duplicate of id 148/159 from Nora's Desk's perspective — same underlying feature, not Desk-specific. |
| 164 | Evening brief | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/briefing/evening/route.ts exists as a real endpoint (confirmed present, not opened in full) | Endpoint exists; did not verify its internal logic depth or exact UI consumer in this pass — treat a |
| 165 | Approve-before-send queue | 🔵 IMPLEMENTED_UNTESTED | none | Client-side gate only (no server-side queue of pending drafts); NoraChat.jsx has no equivalent approve-queue — sends from Nora chat don't ex | A one-tap send/edit/kill approval queue for Nora-drafted messages across channels does not exist as  |
| 170 | Thread summarizer | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/ai/summarize/route.ts (email); NoraChat parseSlashCommand /summarize routes to nora/chat asking 'Summarize what's on my desk' (a des | Real summarization capability exists but not specifically wired as a per-WhatsApp/SMS-thread 3-line  |
| 172 | Read-aloud everything | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | voiceClient speak() -> /api/voice/speak |  |
| 176 | Snooze and remind | 🔵 IMPLEMENTED_UNTESTED | upstash-redis | POST /api/bucket/[id]/remind (not opened directly but referenced consistently, e.g. EmailPanel.jsx:159); fire-reminders cron surfaces via Re |  |
| 180 | Smart silence | 🔵 IMPLEMENTED_UNTESTED | none | adaptNoraDesk() only emits cards when overdue/awaiting asks or open bucket items exist — no synthetic 'nothing to report' noise card | Trivially true by construction — an absence, not a designed 'silence' feature, but it does satisfy t |
| 186 | Voice-note to reply | 🔵 IMPLEMENTED_UNTESTED | openai | /api/voice/transcribe-en or -he depending on voiceLang toggle | Fills the Nora chat box, not a per-thread email/WhatsApp reply directly — user must still submit. |
| 187 | Hebrew voice-note transcription and reply | 🔵 IMPLEMENTED_UNTESTED | openai | Same mic pipeline as id 186, Hebrew-specific endpoint selected explicitly | Draft-back-in-Hebrew relies on the general chat's Hebrew code-switching (route.ts:21), not a dedicat |
| 198 | Translate-and-mirror for outbound Hebrew | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/email/draft/route.ts:22 | Duplicate finding of id 150 — real for email draft; not verified for WhatsApp outbound Hebrew. |
| 175 | Follow-up tracker | 🟢 TESTED_WITH_MOCK | none | app/api/secretary/asks/route.ts GET — real Supabase query over outbound_asks bucketed by expected_reply_by vs now; app/api/secretary/poll-ov | Genuinely tracks both directions (open asks = waiting-on-them via recordOutboundAsk on send); no equ |

## Composer + global (dictation / Listen) (58 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 211 | His-accent transcription profile | ⬛ NOT_IMPLEMENTED | none | No accent-tuning/custom prompt, fine-tune, or Whisper `prompt` parameter found anywhere in app/api/voice/transcribe-*/route.ts |  |
| 212 | Personal STT correction dictionary | ⬛ NOT_IMPLEMENTED | none | No post-processing/correction dictionary logic found anywhere in the transcribe routes or voiceClient.js — grep for 'correction\|dictionary' |  |
| 214 | Voice search across channels | ⬛ NOT_IMPLEMENTED | none | PTT only feeds free text into /api/nora/chat, a pure Anthropic chat completion with no tool-use/function-calling (confirmed by reading app/a | lib/voice/parser.ts has a working 'search' intent, but it is wired only into components/center/Voice |
| 215 | Voice-driven scheduling | ⬛ NOT_IMPLEMENTED | none | /api/nora/chat has no tool-use/function-calling capability (see id214); no other voice-triggered calendar-create pathway exists in component | The chat route's own system prompt (nora/chat/route.ts:21) says it will 'draft it but note it needs  |
| 216 | Voice call commands | ⬛ NOT_IMPLEMENTED | none | No voice-command wiring for mute/hold/call/take-over found anywhere in components/cockpit | Per ground rules, legacy-only evidence means the live cockpit lacks this feature. |
| 218 | Read-me-the-top-result | ⬛ NOT_IMPLEMENTED | none | components/cockpit/chrome/SearchPalette.jsx renders real search results (threads/events/emails) but has no ListenButton/speak call anywhere  |  |
| 219 | Hands-free draft editing | ⬛ NOT_IMPLEMENTED | none | No 'soften'/'shorten' handler anywhere in the repo (grep across components/cockpit and app/api returned nothing); Nora chat is a separate co |  |
| 220 | Live dictation preview | ⬛ NOT_IMPLEMENTED | none | Whisper call happens once, after MediaRecorder 'stop' fires with the full blob — no interim/partial transcript streaming exists | Batch (record-then-transcribe) architecture makes live word-by-word preview structurally impossible  |
| 221 | Clean-this-up as a separate step | ⬛ NOT_IMPLEMENTED | none | No 'clean up'/cleanup step found in any dictation flow — transcript text lands directly in the reply/memo box via onText callbacks with no i |  |
| 222 | Voice-note transcription with audio kept | ⬛ NOT_IMPLEMENTED | none | No transcription call on any inbound webhook path (checked app/api/whatsapp/webhook/route.ts) | Original audio is technically reachable via the link, but no text version is ever produced. |
| 223 | Inbound voice-note summaries | ⬛ NOT_IMPLEMENTED | none | Same CommsPanel.jsx audio rendering as id222 — no summary text is ever generated for any message |  |
| 227 | Confirm-before-send on voice sends | ⬛ NOT_IMPLEMENTED | none | No voice-triggered 'send it' command path exists anywhere in the cockpit — DictateButtons only ever fill a text box (onText callback), never | The specific risk described (a spoken send command misfiring) can't occur because no spoken command  |
| 228 | Dictate-translate Hebrew to English | ⬛ NOT_IMPLEMENTED | none | app/api/voice/transcribe-he/route.ts:38-45 hardcodes language:'he' with no translation step; the only translation route in the repo, app/api |  |
| 229 | Dictate-translate English to Hebrew | ⬛ NOT_IMPLEMENTED | none | Same as id228 — transcribe-en/route.ts has no translate-to-Hebrew step |  |
| 231 | Spoken contact disambiguation | ⬛ NOT_IMPLEMENTED | none | No contact-disambiguation dialog/flow found; contact resolution (threads/route.ts, pipedrive/resolve) is a silent backend enrichment step, n |  |
| 232 | Voice-tagged follow-ups | ⬛ NOT_IMPLEMENTED | none | lib/voice/parser.ts:90-100 has a working 'remind' intent, but its only caller is components/center/VoiceShell.tsx (grep confirmed) — the LEG | Per ground rules, legacy-only evidence means the live cockpit lacks this feature. |
| 233 | Sabbath-aware voice scheduling | ⬛ NOT_IMPLEMENTED | none | No voice scheduling exists at all (see id215); separately, lib/scheduling/pick-three-slots.ts and lib/cron/* have no Shabbat/zmanim awarenes |  |
| 234 | Voice draft from a voice note | ⬛ NOT_IMPLEMENTED | none | Inbound voice notes aren't even playable inline (see id222), so there is no 'listen then dictate a reply without leaving the thread' flow bu |  |
| 235 | Hands-free thread navigation | ⬛ NOT_IMPLEMENTED | none | No voice-command grammar wired in the cockpit (see id214) — nothing listens for 'next'/'previous'/'open the urgent one' |  |
| 236 | Per-contact language memory | ⬛ NOT_IMPLEMENTED | none | No per-contact language storage/lookup found anywhere |  |
| 238 | Word-level edit by voice | ⬛ NOT_IMPLEMENTED | none | No word-level/targeted-edit-by-voice logic found anywhere; DictateButtons only append full new transcript chunks to the text box |  |
| 239 | Spelling rescue for hard words | ⬛ NOT_IMPLEMENTED | none | No spelling/letter-by-letter mode found in transcribe routes or dictation hooks |  |
| 240 | Voice-note reply to a voice note | ⬛ NOT_IMPLEMENTED | none | app/api/voice/speak/route.ts always uses one fixed ELEVENLABS_VOICE_ID ('Matilda') — no per-user voice cloning capability exists anywhere in | Also blocked structurally on inbound voice-note playback/reply (see id222/234), which this feature d |
| 241 | Silent-failure alert | ⬛ NOT_IMPLEMENTED | none | Silently returns to idle with no alert (spoken or visual) on empty capture/dropped mic; genuine transcription failures do get a visual icon+ | Current behavior does the opposite of what's described — the empty-capture case is fully silent, whi |
| 242 | Speak-only-when-it-matters mode | ⬛ NOT_IMPLEMENTED | none | No auto-TTS-on-alert logic found in components/cockpit/toasts/ToastStack.jsx or components/center/ReminderToast.tsx — toasts are visual only |  |
| 243 | One-button repeat-that | ⬛ NOT_IMPLEMENTED | none | No 'last spoken text' cache or single global replay button found anywhere; each ListenButton instance only ever replays its own bound text p |  |
| 244 | Mishearing self-correction log | ⬛ NOT_IMPLEMENTED | none | No correction-learning/logging mechanism found anywhere in the voice pipeline |  |
| 245 | Audio confidence flag | ⬛ NOT_IMPLEMENTED | none | app/api/voice/transcribe-en/route.ts:43 and transcribe-he/route.ts:42 request response_format:'json' (text only) — never verbose_json/logpro |  |
| 246 | Live caption while he talks | ⬛ NOT_IMPLEMENTED | none | Same as id220 — batch (not streaming) transcription architecture | Duplicate concept of id220 (live dictation preview). |
| 247 | Seed parked when unsure | ⬛ NOT_IMPLEMENTED | none | No 'seed' concept exists anywhere in components/cockpit (grep found zero matches); the panel that might house deal-triage concepts, DealsPan |  |
| 248 | Hands-free 'next' through the queue | ⬛ NOT_IMPLEMENTED | none | Same as id235 — no voice command grammar wired in cockpit | Duplicate concept of id235. |
| 250 | Translate-as-I-talk to Hebrew | ⬛ NOT_IMPLEMENTED | none | Same as id228 — no dictation-time translation exists | Duplicate concept of id228. |
| 251 | Translate-as-I-talk to English | ⬛ NOT_IMPLEMENTED | none | Same as id229 — no dictation-time translation exists | Duplicate concept of id229. |
| 253 | Pause playback for Shabbat | ⬛ NOT_IMPLEMENTED | none | No Shabbat-gating logic found for any audio/TTS playback anywhere (checked voiceClient.js, TopChrome.jsx, toasts) — only a display countdown |  |
| 254 | Disambiguate by voice when two names match | ⬛ NOT_IMPLEMENTED | none | Same as id231 — no disambiguation dialog/flow found anywhere | Duplicate concept of id231. |
| 255 | Voice-tagged follow-up | ⬛ NOT_IMPLEMENTED | none | Same as id232 — the working 'remind' intent (lib/voice/parser.ts) is wired only to the legacy components/center/VoiceShell.tsx, not the cock | Duplicate concept of id232; per ground rules judged by the cockpit, which lacks it. |
| 256 | Numbers and money spoken right | ⬛ NOT_IMPLEMENTED | none | app/api/voice/speak/route.ts passes raw text straight to ElevenLabs with zero preprocessing/normalization of numbers, currency, or percentag | No engineered handling exists for this; any correct number reading would come purely from ElevenLabs |
| 257 | Auto-summary of long voice notes | ⬛ NOT_IMPLEMENTED | none | Same as id223 — no summary is ever generated for inbound audio messages | Duplicate concept of id223. |
| 210 | WhatsApp-style outbound voice notes | 🟣 MOCK_ONLY | timelines-ai | Uploads to Supabase then POSTs /api/whatsapp/messages as attachment_url (app/api/whatsapp/messages/route.ts) which sends a normal WA TEXT me | Recipient receives a clickable attachment link, not a native WhatsApp voice-note bubble, so the desc |
| 252 | Voice memo straight to calendar | 🟣 MOCK_ONLY | none | memo is a local useState only — no fetch/POST to any calendar-create API anywhere near it (checked the full memo block); nothing persists it | Dictation genuinely works and fills a visible memo, but it never becomes a real calendar entry — pur |
| 209 | Playback speed control | 🟪 UI_ONLY | none | components/cockpit/chrome/TopChrome.jsx SpeedSelector (~lines 663-690) renders 1.2x-2.0x step buttons and sets state.speechifySpeed | Confirmed via grep: speechifySpeed is read nowhere except inside TopChrome.jsx itself — voiceClient. |
| 207 | Listen button on every AI block | 🟡 PARTIAL | elevenlabs | app/api/voice/speak/route.ts:1-92 real ElevenLabs /stream call | Two call sites render a Listen button bound to no text — voiceClient.js:90-92 short-circuits on empt |
| 217 | Spoken morning brief | 🟡 PARTIAL | elevenlabs | Both feed the real /api/voice/speak ElevenLabs pipeline; brief content itself comes from useLiveData().morningBrief (real /api/briefing/toda | Full-brief read-aloud is real, but there is no skip/snooze/jump-by-voice interactivity anywhere — co |
| 224 | Speak-the-reply-back confirm | 🟡 PARTIAL | elevenlabs | Send itself is gated by a plain-text window.confirm at CommsPanel.jsx:1071, not audio | He can tap Listen before hitting Send, but nothing forces/auto-triggers the read-back — it's two ind |
| 230 | Voice activity peripheral indicator | 🟡 PARTIAL | none | components/cockpit/chrome/TopChrome.jsx PttCluster phaseCfg (~480-487) changes the PTT button's own background/label/pulse-ring while record | The indicator is the button itself changing state, not a separate small always-visible peripheral ma |
| 237 | Read-back before any send | 🟡 PARTIAL | elevenlabs | Same evidence as id224 — manual Listen button adjacent to Send in CommsPanel.jsx:1306/EmailPanel.jsx:1269 | Same gap as id224: not an automatic/forced read-back gate before every send. |
| 249 | Spoken morning brief, ranked | 🟡 PARTIAL | elevenlabs | Real /api/voice/speak TTS pipeline for the constructed string | No confirmed capital-partners-first ranking tied specifically to the speech order, and no 'one sugge |
| 258 | Voice activity in the corner | 🟡 PARTIAL | none | Same PttCluster recording-state visual as id230 (TopChrome.jsx ~480-487) | Duplicate concept of id230 — same partial evidence, no distinct always-visible corner mark, no live  |
| 259 | Voice send confirm by name | 🟡 PARTIAL | timelines-ai | Applies to both WhatsApp (Timelines) and SMS (OpenPhone) sends via the same doSend() function | The named-recipient/channel confirm gate is real and robust, but it is a visual browser confirm() di |
| 202 | English dictation button | 🔵 IMPLEMENTED_UNTESTED | openai | app/api/voice/transcribe-en/route.ts:1-46 — real OpenAI/Groq Whisper call, language:'en', auth-gated to g@reprime.com; components/cockpit/li | GROQ_API_KEY unset on Vercel per docs/FINAL_REPAIR_REPORT.md §12, so runs on OpenAI whisper-1 fallba |
| 203 | Hebrew dictation button | 🔵 IMPLEMENTED_UNTESTED | openai | app/api/voice/transcribe-he/route.ts:1-46 — same OpenAI/Groq client, language:'he', returns rtl:true | Same fallback situation as English (GROQ_API_KEY unset -> OpenAI whisper-1, still functional). |
| 204 | Tap-language-then-speak model | 🔵 IMPLEMENTED_UNTESTED | openai | components/cockpit/lib/voiceClient.js:202-256 useDictation.start(langOverride) locks langRef before recording, then posts to the matching tr | Exactly the described UX: language chosen before speaking, never auto-detected mid-utterance. |
| 205 | Recording state on the button | 🔵 IMPLEMENTED_UNTESTED | none | n/a — pure presentational state driven by useDictation.recording | Confirmed by direct code read; no visual-regression test exists. |
| 206 | Dictation in every reply field | 🔵 IMPLEMENTED_UNTESTED | openai | Same transcribe-en/he routes shared across all three call sites |  |
| 208 | Play and pause toggle | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | Same /api/voice/speak round trip |  |
| 213 | Talk-to-Nora push-to-talk | 🔵 IMPLEMENTED_UNTESTED | anthropic | startRecording/transcribeAndSend (TopChrome.jsx ~497-520) records → posts to /api/voice/transcribe-(en\|he) → dispatches `nora:sendMessage`  | Implemented as tap-to-start/tap-to-stop toggle (onClick={cycle}), not a literal press-and-hold gestu |
| 225 | Native Hebrew text-to-speech | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | app/api/voice/speak/route.ts:48-59 sets language_code:'he' on the eleven_flash_v2_5 multilingual model; docs/FIX_AUDIT.md:103 confirms the c | Backend genuinely requests native Hebrew synthesis from a multilingual model; actual audio-quality/n |
| 226 | Auto-punctuation and paragraphs | 🔵 IMPLEMENTED_UNTESTED | openai | app/api/voice/transcribe-en/route.ts:39-46 / transcribe-he/route.ts:38-45 return result.text verbatim from Whisper (response_format:'json')  | Punctuation/paragraph breaks come from Whisper's own default output, not a custom-built feature — fu |

## Nora's Desk + thread (Zoom) + calendar (47 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 285 | Tomorrow's meetings preview | 🔴 BROKEN | google-calendar | components/cockpit/live/CockpitLiveData.jsx:102 only ever fetches /api/calendar/today (which itself only queries today's window — lib/google | UI is wired to real state but the underlying data feed makes the tab permanently empty — a dead shel |
| 261 | Auto-join from calendar | ⬛ NOT_IMPLEMENTED | none | lib/google/calendar.ts:12-48 getTodayEvents() only detects a zoom/meet link to show a manual 'Join Zoom' button (CalendarPanel.jsx:372-395); | No trace of an auto-join mechanism tied to g@reprime.com calendar events. |
| 262 | Full call recording | ⬛ NOT_IMPLEMENTED | zoom | app/api/zoom/webhook/route.ts:8-16,40-50 receives recording.completed/meeting.ended and only inserts the raw payload into `zoom_events`; the | ZOOM_WEBHOOK_SECRET_TOKEN not set (webhook CRC returns 503) per docs/FIX_AUDIT.md:60 |
| 263 | Live transcript | ⬛ NOT_IMPLEMENTED | none | No live-transcript pipeline exists; the only Zoom text processed is a post-call summary EMAIL parsed after the fact in app/api/zoom/ai-compa |  |
| 264 | Speaker labeling | ⬛ NOT_IMPLEMENTED | none | No diarization/speaker-labeling code exists anywhere in the repo; meeting_summaries has no speaker field and no contact-list cross-reference |  |
| 267 | Follow-up draft ready | ⬛ NOT_IMPLEMENTED | none | ai-companion-ingest only creates a Pipedrive activity note; no code drafts a send-ready follow-up message in Gideon's voice. |  |
| 268 | Pre-meeting brief | ⬛ NOT_IMPLEMENTED | none | No pre-meeting brief endpoint exists (app/api/briefing has only today/route.ts and evening/route.ts, both aggregate stat dashboards — deals, |  |
| 269 | Relationship-aware brief | ⬛ NOT_IMPLEMENTED | none | Same evidence as #268 — no brief generator of any kind exists to lead with a relationship label. |  |
| 270 | Bilingual transcription | ⬛ NOT_IMPLEMENTED | none | app/api/voice/transcribe-en/route.ts and transcribe-he/route.ts are single-language-per-call Whisper/Groq endpoints used for dictation (voic |  |
| 271 | Hebrew-native summary | ⬛ NOT_IMPLEMENTED | none | No meeting-summary generation exists in this codebase (the only summary text comes verbatim from Zoom's own AI Companion email, unmodified/u |  |
| 273 | Past-meeting search | ⬛ NOT_IMPLEMENTED | none | No embeddings/pgvector/semantic-search infrastructure exists in the repo (grep for embedding/pgvector/vector( only turns up unrelated embed- |  |
| 275 | Voice-edit the follow-up | ⬛ NOT_IMPLEMENTED | none | No follow-up draft object exists to edit (see #267). General DictateButtons voice-to-text exists (components/cockpit/lib/voice.jsx:182-258)  |  |
| 276 | Send to any channel | ⬛ NOT_IMPLEMENTED | none | Channel senders exist generically (app/api/whatsapp/batch-send, app/api/email/send, app/api/phone/quo-send) but none is wired to a meeting-f | Duplicate of #304 in this feature list. |
| 277 | Calendar the next step | ⬛ NOT_IMPLEMENTED | none | lib/google/calendar.ts:78-107 createCalendarEvent() is real and used by app/api/bookings/confirm/route.ts and app/api/invitations/[token]/re |  |
| 278 | Auto-skip Shabbat scheduling | ⬛ NOT_IMPLEMENTED | none | The real Shabbat/Yom-Tov-aware slot filtering (app/api/bookings/available-slots/route.ts:144-150,239-246, hebcal-backed) only applies to the | The underlying capability (Shabbat-aware slots) is real elsewhere in the product, just not connected |
| 279 | Questions he didn't answer | ⬛ NOT_IMPLEMENTED | none | parseSummary() in ai-companion-ingest/route.ts only extracts 'Summary' and 'Action Items' sections — no logic detects unanswered questions. | Duplicate of #299. |
| 280 | Private vs shareable summary | ⬛ NOT_IMPLEMENTED | none | meeting_summaries stores exactly one summary_text field (app/api/zoom/ai-companion-ingest/route.ts:159-169); no dual-version (private/sharea | Duplicate concept of #294. |
| 281 | Meeting prep from the thread | ⬛ NOT_IMPLEMENTED | none | No endpoint builds a meeting brief from WhatsApp/email thread history (see #268/#269 evidence — no brief generator exists at all). | Duplicate of #300. |
| 282 | Auto-name the file | ⬛ NOT_IMPLEMENTED | none | No recording file storage/naming pipeline exists — the Zoom webhook (app/api/zoom/webhook/route.ts) never downloads or names a video file; i |  |
| 283 | Searchable transcript library | ⬛ NOT_IMPLEMENTED | none | No transcripts are ever stored (see #263), and no search/index infrastructure exists over meeting content (see #273 evidence). | Duplicate of #302. |
| 284 | No-Nora private mode | ⬛ NOT_IMPLEMENTED | none | There is no bot-join concept at all (#260/#261), so there is nothing for a 'keep the bot out' toggle to disable. |  |
| 288 | Hebrew RTL meeting view | ⬛ NOT_IMPLEMENTED | none | No meeting transcript/notes view exists at all to render RTL (see #263), so this styling never applies to meeting content. | RTL support exists for calendar event titles, not for any meeting transcript (which doesn't exist). |
| 289 | Tag a moment live | ⬛ NOT_IMPLEMENTED | none | No live-meeting session/bookmark concept exists anywhere (no bot join = nothing live to tag). | Duplicate of #303. |
| 290 | Waiting-room and join guard | ⬛ NOT_IMPLEMENTED | none | No bot-join mechanism exists (#260/#261), so there's no waiting-room/host-admit handling to implement. |  |
| 291 | Open action items he still owes | ⬛ NOT_IMPLEMENTED | none | No 'his vs their' action-item split exists; meeting_summaries.action_items is an unstructured string array with no owner attribution (app/ap |  |
| 292 | Hebrew-English code-switch handling | ⬛ NOT_IMPLEMENTED | none | app/api/voice/transcribe-en/route.ts and transcribe-he/route.ts each pin a single fixed `language` param per call — no code-switch/mixed-lan |  |
| 293 | His-accent name dictionary | ⬛ NOT_IMPLEMENTED | none | Neither transcribe-en nor transcribe-he passes a `prompt`/vocabulary-bias parameter to the Whisper/Groq call (app/api/voice/transcribe-en/ro |  |
| 294 | Investor vs internal summary split | ⬛ NOT_IMPLEMENTED | none | Same evidence as #280 — meeting_summaries has one summary_text field only, no investor/internal split. | Duplicate concept of #280. |
| 295 | Recurring-call running thread | ⬛ NOT_IMPLEMENTED | none | The meeting_summaries schema (app/api/zoom/ai-companion-ingest/route.ts:7-17) has no recurring-meeting linkage field (no series id) and noth |  |
| 296 | Open items waiting on the other side | ⬛ NOT_IMPLEMENTED | none | No data model or logic tracks counterpart-owed obligations from a call, and no chase-message drafting exists (meeting_summaries has no such  |  |
| 297 | Calendar follow-up that skips Shabbat | ⬛ NOT_IMPLEMENTED | none | Same evidence as #277/#278 — no meeting-outcome-driven booking flow exists to apply the (real, elsewhere) Shabbat-aware slot logic to. | Duplicate of #277+#278 combined. |
| 299 | Questions left on the table | ⬛ NOT_IMPLEMENTED | none | Same evidence as #279 — parseSummary() has no unanswered-question detection logic. | Duplicate of #279. |
| 300 | Pre-call brief from his own history | ⬛ NOT_IMPLEMENTED | none | Same evidence as #268/#269/#281 — no pre-call brief generator exists in the codebase. | Duplicate of #268/#269/#281. |
| 302 | Searchable call library | ⬛ NOT_IMPLEMENTED | none | Same evidence as #273/#283 — no transcript storage or search infra exists. | Duplicate of #273/#283. |
| 303 | Mid-call tag a moment | ⬛ NOT_IMPLEMENTED | none | Same evidence as #289 — no live-meeting session exists to bookmark within. | Duplicate of #289. |
| 304 | Send the follow-up to any channel | ⬛ NOT_IMPLEMENTED | none | Same evidence as #276 — channel senders exist generically but are not wired to any meeting-follow-up draft/approval flow. | Duplicate of #276. |
| 305 | Action items pushed to his task list | ⬛ NOT_IMPLEMENTED | none | grep for 'action_items'/'meeting_summary' across the repo shows only app/api/zoom/ai-companion-ingest/route.ts writes them, to `meeting_summ | The cockpit task list (bucket_items) is real and live-wired, but nothing feeds meeting action items  |
| 306 | Shabbat-aware bot scheduling | ⬛ NOT_IMPLEMENTED | none | No bot/auto-join scheduling system exists at all (#260/#261/#290), so there is no Shabbat gate to add to it. (The real Shabbat/Yom-Tov engin |  |
| 260 | One-click Nora joins | 🟣 MOCK_ONLY | zoom | No bot/SDK join logic anywhere in the repo (grep for recall.ai/RTMS/bot_id/autoJoin returns nothing). lib/zoom/client.ts only creates/reads  | The only 'Nora is in the meeting' visual is a fully fabricated demo tile, not a working bot join. |
| 265 | Plain-English summary | 🟡 PARTIAL | zoom | app/api/zoom/ai-companion-ingest/route.ts:71-99,158-178 parses the Zoom AI Companion's own summary email (regex on 'Summary'/'Action Items'  | Backend ingest is real and working (docs/FIX_AUDIT.md:132 marks it 'working') but the pipeline is wr |
| 266 | Action item extraction | 🟡 PARTIAL | zoom | parseSummary() in app/api/zoom/ai-companion-ingest/route.ts:77-99 extracts an action_items array from the Zoom summary email and stores it ( |  |
| 272 | Listen-back at his speed | 🟡 PARTIAL | elevenlabs | No playback-rate/speed parameter exists anywhere (grep for playbackRate/speed/rate in voiceClient.js and voice/speak/route.ts returns nothin | Real generic TTS exists but is neither meeting-specific nor speed-adjustable; branding is ElevenLabs |
| 274 | Peripheral inbound during calls | 🟡 PARTIAL | none | This is general cockpit chrome, not gated to or aware of an active Zoom call — there's no 'in a meeting' state that changes its behavior, si | Real peripheral awareness exists in general, but nothing meeting-specific about it. |
| 286 | Phone-call coverage too | 🟡 PARTIAL | quo-openphone | app/api/phone/quo-webhook/route.ts:126-165 stores real call recording URLs into `phone_calls` on call.completed/recording.completed, and app | Recording capture/playback is real; summarize+follow-up parity with the (also incomplete) Zoom pipel |
| 287 | Other-platform meetings | 🟡 PARTIAL | google-calendar | lib/google/calendar.ts:22-40 detects Zoom links and Google conferenceData/hangoutLink (Meet) only — there is no Microsoft Teams link detecti | Manual open-link works for Meet; Teams isn't parsed at all; no bot/record/summarize parity for any n |
| 298 | Peripheral inbound during the call | 🟡 PARTIAL | none | Same evidence as #274 — real general chrome, not meeting-gated. | Duplicate of #274. |
| 301 | Other-platform meeting support | 🟡 PARTIAL | google-calendar | Same as #287 — Meet links open manually via hangoutLink; Teams and dial-in lines are not parsed at all (lib/google/calendar.ts:22-40 only ch | Duplicate of #287. |

## Calendar panel (left flank) (25 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 309 | g@reprime.com only | 🔴 BROKEN | google-calendar | lib/google/calendar.ts:8 auth.setCredentials({refresh_token: process.env.GOOGLE_REFRESH_TOKEN}) | GOOGLE_REFRESH_TOKEN env var |
| 308 | Voice memo to event | ⬛ NOT_IMPLEMENTED | none | DictateButtons (components/cockpit/lib/voice.jsx:182-258) only appends Whisper transcript text to local memo state via setMemo; no call anyw | Voice-to-text works, but nothing parses the memo into an event or calls the calendar-write API — the |
| 315 | Reschedule by voice | ⬛ NOT_IMPLEMENTED | none | voiceCommands.js is never imported anywhere else in the repo (grep confirms zero consumers); app/api/nora/chat/route.ts:21 system prompt exp | updateCalendarEvent() exists but is only called by the recipient-facing app/api/invitations/[token]/ |
| 316 | Cancel by voice | ⬛ NOT_IMPLEMENTED | none | no calendar event-deletion/cancellation function exists anywhere in the repo (grep for events.delete/deleteCalendarEvent/cancelEvent returns | There is no cancel-event capability at all, voice-triggered or otherwise. |
| 318 | Meeting prep reminder | ⬛ NOT_IMPLEMENTED | none | lib/cron/manifest.ts:30-101 lists the full cron registry — no pre-meeting T-10/T-1 reminder cron exists (closest is meeting-verify, which ru | _ops-context/HANDOFF-BRIEF.md:167,262 claims 'PagerDuty meeting alerts (T-10, T-1)' live, but no suc |
| 321 | Auto reminder to the other side | ⬛ NOT_IMPLEMENTED | none | no code sends a pre-meeting reminder text/email to the counterparty distinct from Google Calendar's own native sendUpdates:'all' notificatio | Any reminder the other side gets is Google Calendar's own native invite email, not app logic. |
| 322 | Calendar from a chat thread | ⬛ NOT_IMPLEMENTED | none | no chat-thread-to-calendar-event conversion endpoint found |  |
| 323 | Email-to-event detection | ⬛ NOT_IMPLEMENTED | none | no email-body time-parsing/event-suggestion code found |  |
| 324 | Natural-language quick add | ⬛ NOT_IMPLEMENTED | none | no NLP date/time parser feeding createCalendarEvent found |  |
| 325 | Phone-call scheduling | ⬛ NOT_IMPLEMENTED | none | app/invite/[token]/page.tsx:55 meeting_type is only 'terminal' \| 'meeting' — no 'call' type; every booked meeting gets a Zoom link (zoomMee | No plain-phone-call event type exists anywhere; everything defaults to video/Zoom. |
| 326 | Free-slot sharing snippet | ⬛ NOT_IMPLEMENTED | none | no 'share my openings' snippet generator found in repo |  |
| 329 | One-tap accept from briefing | ⬛ NOT_IMPLEMENTED | none | Nora chat (app/api/nora/chat/route.ts) is read-only Q&A with no tool-calling / booking execution; no voice-driven accept-and-book flow exist |  |
| 330 | Pre-meeting thread pull | ⬛ NOT_IMPLEMENTED | none | no mechanism correlates an upcoming calendar attendee with WhatsApp/email history and surfaces it pre-call; NoraElevatedRead (CommsPanel.jsx |  |
| 331 | Calendar conflict across channels | ⬛ NOT_IMPLEMENTED | none | no code cross-references chat message content against calendar busy times |  |
| 310 | Shabbat auto-block | 🟡 PARTIAL | google-calendar | app/api/bookings/available-slots/route.ts:226-229 hard-skips Saturday (dayOfWeek===6) when generating bookable slots | Real Shabbat-day exclusion exists in the booking-slot generator, but that generator is only reachabl |
| 311 | Yom Tov auto-block | 🟡 PARTIAL | hebcal | app/api/bookings/available-slots/route.ts:128-161,232-256 fetchClosedDates() calls hebcal.com API for yomtov=true days and closes those days | Real Hebcal-backed Yom Tov exclusion, same reachability caveat as 310 — not wired into any cockpit U |
| 312 | Booking link for contacts | 🟡 PARTIAL | google-calendar | app/api/bookings/send-invitation/route.ts + app/api/invitations/route.ts + app/invite/[token]/page.tsx form a real invite-link/booking pipel | Booking-link generation is fully real end-to-end but only reachable via standalone app/compose/page. |
| 313 | Three smart slot picks | 🟡 PARTIAL | google-calendar | lib/scheduling/pick-three-slots.ts:83-143 pickThreeSlots() real locale-aware bucketing logic, used by app/compose/page.tsx and components/ch | Same pattern as 312 — real logic, unreachable from the live cockpit. |
| 314 | Free/busy conflict check | 🟡 PARTIAL | google-calendar | lib/google/calendar.ts:121-155 getBusyTimes/slotOverlapsBusy; used by app/api/bookings/available-slots/route.ts:170-192,269 and app/api/book | Real freebusy filtering exists for the booking/invite flow, which the cockpit never links to. |
| 317 | Double-booking guard | 🟡 PARTIAL | google-calendar | app/api/bookings/confirm/route.ts:257-295 'SLOT LOCK' checks confirmed invitations + freebusy and 303-redirects to a re-pick page ('taken=1' | Real double-booking guard, but only in the recipient-facing booking-confirm flow; no 'force it anywa |
| 327 | Meeting-location attach | 🟡 PARTIAL | google-calendar | lib/google/calendar.ts:78-109 createCalendarEvent supports location + auto-prepends Zoom link into the description | Real capability, but only exercised by the booking/invite pipeline (unreachable from cockpit), never |
| 328 | Two-way Google sync | 🟡 PARTIAL | google-calendar | lib/google/calendar.ts: getTodayEvents (read) + createCalendarEvent/updateCalendarEvent (write, sendUpdates:'all') are all real Google Calen | Read-side sync is live and real in the cockpit; write-side sync is real but only exercised through t |
| 307 | Today agenda view | 🔵 IMPLEMENTED_UNTESTED | google-calendar | app/api/calendar/today/route.ts (Supabase-gated, Redis-cached) -> lib/google/calendar.ts:12-50 getTodayEvents() real events.list call | Real live Google Calendar read, rendered in the live cockpit. 'Week'/'Tomorrow' tabs are always empt |
| 319 | Agenda read-aloud | ✅ TESTED_WITH_REAL_PROVIDER | elevenlabs | components/cockpit/lib/voiceClient.js useSpeech -> POST /api/voice/speak (ElevenLabs) | ELEVENLABS_API_KEY required (button shows 'disabled' state otherwise) |
| 320 | Spoken daily briefing | ✅ TESTED_WITH_REAL_PROVIDER | elevenlabs | app/api/briefing/today/route.ts aggregates real Google Calendar + Pipedrive deals + soft-schedule focus (no fabricated data) | ELEVENLABS_API_KEY required |

## Contact-history card (overlay) + directory (42 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 357 | Open Profile button in chat header | 🔴 BROKEN | none | components/cockpit/drawers/InvestorProfileDrawer.jsx is never imported/mounted in components/cockpit/App.jsx, so the state it sets has no co | Doubly broken: (1) the drawer that would open is unmounted dead code, and (2) per _ops-context/HANDO |
| 358 | Israeli number normalizer | 🔴 BROKEN | none | lib/timelines/normalize-phone.ts:1-15 is a generic normalizer (strip non-digits, prepend +1 only for exactly-10-digit numbers) with no Israe | An Israeli local-format number like '0524001234' would be mis-normalized (falls through the 10-digit |
| 333 | Relationship-first directory | ⬛ NOT_IMPLEMENTED | none | no 'family/legal/vendor/posek' categorization field found anywhere in the repo | InvestorsPanel.jsx itself is dead code (never imported by components/cockpit/App.jsx), so even this  |
| 334 | Unified 1567-person master view | ⬛ NOT_IMPLEMENTED | none | components/cockpit/panels/InvestorsPanel.jsx, InvestorsWideTab.jsx, and drawers/InvestorProfileDrawer.jsx are never imported by components/c | _ops-context/HANDOFF-BRIEF.md:286 corroborates: 'components/cockpit/data/*.js files are MOCK DATA re |
| 335 | Profile leads with last contact | ⬛ NOT_IMPLEMENTED | none | drawer is unmounted dead code (not imported in App.jsx) |  |
| 336 | AI one-line relationship summary | ⬛ NOT_IMPLEMENTED | none | drawer unmounted dead code; no AI relationship-summary endpoint found |  |
| 337 | All name variants shown in full | ⬛ NOT_IMPLEMENTED | none | real all_name_variants column exists in the contact_directory Supabase table (lib/contact-directory/client.ts:138) but is only used internal |  |
| 338 | Native Hebrew names, never transliterated | ⬛ NOT_IMPLEMENTED | none | no UI displays a canonical Hebrew-script name field; mock investors.js names are already Latin-only |  |
| 339 | Cross-channel block | ⬛ NOT_IMPLEMENTED | supabase | app/api/contacts/block/route.ts:1-122 is a real, working cross-channel block (matches by pipedrive_contact_id/phone/email, updates whatsapp_ | Real backend, but reachable only from the legacy /legacy dashboard, not the live cockpit. |
| 340 | Notes capture on every contact | ⬛ NOT_IMPLEMENTED | none | app/api/pipedrive/notes/route.ts PUT is a real Pipedrive-notes-field updater; its only UI caller is components/sidebar/PipedriveCard.tsx, us | Real save-to-Pipedrive wiring exists but only in the legacy dashboard; the cockpit's own drawer (its |
| 341 | Master-file-wins sync rule | ⬛ NOT_IMPLEMENTED | none | lib/enrich/provider.ts:6-8 only documents a narrower rule ('providers never overwrite existing data' for Apollo enrichment of missing Pipedr |  |
| 343 | Create contact from a conversation | ⬛ NOT_IMPLEMENTED | none | app/api/contacts/import-names/route.ts is a bulk CSV importer (legacy-only, app/legacy/page.tsx), not a one-tap single-contact save from a l |  |
| 344 | Full contact timeline | ⬛ NOT_IMPLEMENTED | none | drawer is unmounted dead code |  |
| 345 | Hebrew-speaker tag | ⬛ NOT_IMPLEMENTED | none | 'observance'/'language' fields exist only on mock components/cockpit/data/investors.js entries; no live tagging action or Nora-language-defa |  |
| 346 | Preferred-channel awareness | ⬛ NOT_IMPLEMENTED | none | 'primaryChannel' exists only on mock investors.js; live thread channel is simply whichever channel the last message arrived on (adapters.js  |  |
| 347 | AI talking points before a call | ⬛ NOT_IMPLEMENTED | none | no automatic incoming-call trigger produces a 2-line brief; app/api/nora/chat/route.ts only responds to explicit user messages | Related manual capability exists (see #367) but nothing fires automatically on an inbound call/messa |
| 348 | Spam and unknown-caller triage | ⬛ NOT_IMPLEMENTED | none | no spam/unknown-caller classification logic found in components/cockpit/** or app/api/** |  |
| 349 | VIP pinning | ⬛ NOT_IMPLEMENTED | none | no pin/isPinned field or control found anywhere in components/cockpit/** |  |
| 351 | Commitment and promise tracking | ⬛ NOT_IMPLEMENTED | supabase | app/api/secretary/asks/route.ts + outbound_asks table track whether OTHERS replied to Gideon's outbound asks (opposite direction from 'promi | A real, live commitment-tracking system exists but tracks 'did they reply to me', not 'things I said |
| 352 | Open-loop detector | ⬛ NOT_IMPLEMENTED | supabase | same outbound_asks/NorasDesk system as #351 — it tracks the reverse direction (Gideon waiting on them) | See #351 note — closely related real infrastructure exists but for the opposite direction of obligat |
| 355 | Whole-person merge across channels | ⬛ NOT_IMPLEMENTED | none | adapters.js adaptThreadRow keys threads by phone but does not merge distinct channel rows for the same phone into one unified card/history — |  |
| 356 | Quick action bar on a card | ⬛ NOT_IMPLEMENTED | none | InvestorsPanel.jsx is never imported by App.jsx — confirmed unmounted dead code | The live CommsPanel thread header has a different button set (Back/Profile/Zoom/Staff-move/Listen/Re |
| 360 | Two-number-same-person merge | ⬛ NOT_IMPLEMENTED | none | no logic links two distinct phone numbers (e.g. a 305 and a 718 line) to one person; each is a separate thread row |  |
| 362 | Hebrew name and Latin name both stored | ⬛ NOT_IMPLEMENTED | none | no dual Hebrew+Latin name storage/display found in any live path |  |
| 363 | Family low-friction mode | ⬛ NOT_IMPLEMENTED | none | components/cockpit/chrome/RecentlyActiveStrip.jsx:22 comment: 'familyTag ... has no live source yet'; familyTag only exists in mock componen | The low-friction behavior is coded correctly but never activates on real data since no live thread i |
| 364 | Shabbat-safe send guard | ⬛ NOT_IMPLEMENTED | none | isRestNow (lib/zmanim/postville.ts, app/api/religious-calendar/route.ts) is used only to render a display pill/drawer (CalendarPanel.jsx, Re |  |
| 365 | Last-good-number tracker | ⬛ NOT_IMPLEMENTED | none | no 'last successful number' tracking found |  |
| 366 | Voice-search the directory | ⬛ NOT_IMPLEMENTED | none | no voice-to-search wiring found |  |
| 369 | Promise-I-made tracker | ⬛ NOT_IMPLEMENTED | supabase | outbound_asks/secretary asks system (see #351) tracks the opposite direction | Duplicate of #351 as described in this registry. |
| 370 | Owed-reply queue | ⬛ NOT_IMPLEMENTED | supabase | outbound_asks/secretary asks system (see #351/#352) tracks the opposite direction (whether others replied to Gideon) | Duplicate of #352 as described in this registry. |
| 371 | Time-zone aware reach window | ⬛ NOT_IMPLEMENTED | none | the only timezone-aware reach-window logic (app/api/bookings/available-slots/route.ts:271-274, restricting Israel hours 8am-10pm) is part of |  |
| 372 | Quo line auto-pick | ⬛ NOT_IMPLEMENTED | none | no algorithm auto-selects 305 vs 718 based on which line a contact 'knows' Gideon on — line choice is manual (whichever lane's thread the us | The two-line infrastructure is real; automatic selection is not. |
| 373 | Pre-call one-pager | ⬛ NOT_IMPLEMENTED | none | no cron/trigger correlates upcoming calendar events with a generated spoken brief |  |
| 342 | Quick contact search | 🟡 PARTIAL | none | matches only threadList (t.contactName) sourced from useLiveData(); does not query the full contact_directory table or Pipedrive at large | Real, live, working search — but scoped to people Gideon has an active WhatsApp/SMS/iMessage thread  |
| 361 | Spoken-language flag | 🟡 PARTIAL | none | adapters.js:22-24 detectLanguage() computes language per-message dynamically from text content — not a stored per-contact flag | Achieves a similar practical effect (Hebrew-aware UI) via live per-message detection rather than a p |
| 367 | Ask-Nora about a person | 🟡 PARTIAL | anthropic | app/api/nora/chat/route.ts:130-147 real Claude call (Haiku/Opus routed by complexity) grounded in buildNoraContext(live) — threads/calendar/ | Real, live, grounded chat answers general questions about a person if the live context includes them |
| 368 | One-line who-is-this on inbound | 🟡 PARTIAL | pipedrive | caller-ID name resolution (#332) is real; NoraElevatedRead pulls recent context of the currently open thread | Name resolution is real and 'last dealing' context appears once you open the thread (not proactively |
| 332 | Caller ID on every channel | 🔵 IMPLEMENTED_UNTESTED | pipedrive | app/api/whatsapp/threads/route.ts:231-345 resolves Pipedrive person by phone first, then falls back to lib/contact-directory/client.ts:28-80 | Real two-tier caller-ID pipeline, live in the cockpit's thread lists. |
| 350 | Recently contacted strip | 🔵 IMPLEMENTED_UNTESTED | none | sourced from useLiveData().threads (real live WhatsApp/SMS/iMessage thread list) | Real and live, though the 'Family' strip always renders empty because familyTag has no live data sou |
| 353 | Per-surface Hebrew/RTL toggle | 🔵 IMPLEMENTED_UNTESTED | none | thread.language is a real live field set by adapters.js:22-24 detectLanguage() (Hebrew-char regex) on live message/contact text | Real, live, automatic (not a manual toggle) RTL switching driven by detected language, working in th |
| 359 | WhatsApp number is the identity key | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | app/api/whatsapp/threads route dedups by panel:phone | Phone number genuinely is the primary identity key for WhatsApp threads. |
| 354 | Listen button on every summary | ✅ TESTED_WITH_REAL_PROVIDER | elevenlabs | same /api/voice/speak (ElevenLabs) round-trip as #319/#320 | ELEVENLABS_API_KEY required |

## Nora's Desk — tasks drawer (61 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 375 | Custom time reminder | ⬛ NOT_IMPLEMENTED | none | app/api/bucket/[id]/remind/route.ts accepts an arbitrary ISO fire_at (up to 30 days out) so the backend could support an exact pick, but not | Preset chips only (1h/2h/3h/6h/Tomorrow 9am); no free-form time entry. |
| 379 | 30-second voice seed to task | ⬛ NOT_IMPLEMENTED | none | No splitting/segmentation logic found anywhere (searched app/api/voice, lib/voice, lib/center/voice-note.ts) that turns one transcript into  |  |
| 380 | Hebrew voice tasks | ⬛ NOT_IMPLEMENTED | openai | app/api/voice/transcribe-he/route.ts (Groq whisper-large-v3, falls back to OpenAI whisper-1) is a real Hebrew transcription endpoint, but no | Confused with real Hebrew chat support (which does exist for the Nora conversation, see id 418 note) |
| 384 | Edit task in place | ⬛ NOT_IMPLEMENTED | none | app/api/bucket/[id]/route.ts PATCH generically accepts title/body/due_at, so the backend could support it, but no live UI component calls PA | Evidence found only in the legacy /legacy dashboard's WindowManager wiring comment, and even there B |
| 391 | Per-person follow-up queue | ⬛ NOT_IMPLEMENTED | none | outbound_asks rows are only ever surfaced as a flat global list (GET /api/secretary/asks) -- no endpoint filters by a single recipient_ident |  |
| 393 | Nora task suggestions | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts has no tool-use/function-calling; bucket_items schema (supabase/migrations/2026-05-05-center.sql:9-26) has no fie |  |
| 395 | Shabbat-aware scheduling | ⬛ NOT_IMPLEMENTED | none | app/api/bucket/fire-reminders/route.ts (full file read) has zero Shabbat/Yom Tov awareness -- it fires strictly on fire_at <= now(). The onl | Reminders and no-reply nudges can and do fire during Shabbat/Yom Tov today. |
| 396 | Relationship-grouped queue | ⬛ NOT_IMPLEMENTED | none | bucket_items/outbound_asks schemas have no relationship-type column to group by. | The described grouping exists only in the dead components/cockpit/panels/BucketPanel.jsx (mock WAITI |
| 397 | One-tap follow-up draft | ⬛ NOT_IMPLEMENTED | none | NoraChat.jsx has a manual '/draft <text>' slash command that asks Nora to draft a reply, but it is not attached to any specific overdue thre |  |
| 398 | Listen to my tasks | ⬛ NOT_IMPLEMENTED | elevenlabs | /api/voice/speak (ElevenLabs) is real per-card TTS, but nothing concatenates the full task+nudge list into one spoken pass. | Per-item audio is real (see id 411); the whole-list rundown described here is not. |
| 400 | Post-call follow-up prompt | ⬛ NOT_IMPLEMENTED | none | No route or handler found (searched for post-call/commitment/after-call patterns across app/api and components/cockpit) that triggers a foll |  |
| 401 | Smart due-date guessing | ⬛ NOT_IMPLEMENTED | none | lib/voice/parser.ts is the only working parser and it is regex-based, requiring the exact form 'remind me ... in N minutes/hours/days' -- no | Cockpit's live NoraChat.jsx bypasses this parser entirely and sends free text straight to a non-tool |
| 402 | Natural-language reschedule | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts has no function-calling/tool-use, so even if Nora replies conversationally about rescheduling, no bucket_items ro |  |
| 403 | Waiting-on view | ⬛ NOT_IMPLEMENTED | none | No 'waiting on others' dedicated screen in the live cockpit; the only 'Waiting' tab is in the dead components/cockpit/panels/BucketPanel.jsx |  |
| 404 | My-court view | ⬛ NOT_IMPLEMENTED | none | No dedicated 'waiting on me' screen distinct from the combined All/Overdue/Today/Upcoming NorasDesk filters. |  |
| 405 | Aging indicator | ⬛ NOT_IMPLEMENTED | none | components/cockpit/panels/NorasDesk.jsx whenLabel() (adapters.js:302-307) only renders a clock time, never a day-count. |  |
| 406 | Task search | ⬛ NOT_IMPLEMENTED | none | No search endpoint queries bucket_items or outbound_asks by keyword. |  |
| 407 | Reminder confidence note | ⬛ NOT_IMPLEMENTED | none | No 'reason'/'confidence'/'why' column on bucket_items or outbound_asks. |  |
| 408 | Quiet-hours respect | ⬛ NOT_IMPLEMENTED | none | app/api/bucket/fire-reminders/route.ts and app/api/secretary/poll-overdue/route.ts have no time-of-day/waking-hours gate; both fire strictly | No 'quiet hours' concept found anywhere in the codebase. |
| 409 | Cross-channel follow-up merge | ⬛ NOT_IMPLEMENTED | none | lib/secretary/outbound-asks.ts markAskReplied() matches strictly on (channel, recipient_identifier) -- each channel produces its own separat |  |
| 410 | Undo a completed task | ⬛ NOT_IMPLEMENTED | none | PATCH /api/bucket/[id] generically accepts status back to 'open', so the backend could support an undo, but no live caller invokes it that w |  |
| 412 | Read full briefing aloud | ⬛ NOT_IMPLEMENTED | elevenlabs | No single button found that concatenates the full task+follow-up list into one continuous ListenButton call. | Only per-item Listen buttons exist (NorasDesk cards, BriefPanel apex item). |
| 413 | Confidence on auto-created tasks | ⬛ NOT_IMPLEMENTED | none | bucket_items has no 'created_by=nora' style flag beyond created_by text field (always g@reprime.com per app/api/bucket/route.ts:227-228) and |  |
| 414 | One-tap confirm or kill a Nora task | ⬛ NOT_IMPLEMENTED | none | No 'confirm'/'kill' pair of buttons on any Nora-suggested item, because Nora never creates such an item (id 393). |  |
| 415 | Suggested due time he can override | ⬛ NOT_IMPLEMENTED | none | No 'suggested due time, override by voice' flow found; NoraChat.jsx has no tool-use to modify a due_at based on spoken override. |  |
| 416 | Daily top three that must move | ⬛ NOT_IMPLEMENTED | none | No 'top three' UI found (grepped for 'top three'/'top 3' across components/cockpit) -- NorasDesk shows the full filtered list, not a curated |  |
| 419 | Bilingual due-date and reschedule by voice | ⬛ NOT_IMPLEMENTED | none | lib/voice/parser.ts has no Hebrew-calendar-aware date resolution, and it isn't wired into the cockpit anyway (only legacy VoiceShell.tsx use |  |
| 420 | Shabbat and Yom Tov auto-shift | ⬛ NOT_IMPLEMENTED | none | app/api/bucket/fire-reminders/route.ts has no Shabbat/chag check or auto-shift logic; the only Shabbat heuristic (lib/center/soft-schedule.t | Same underlying gap as id 395. |
| 421 | Waiting-on board across all channels | ⬛ NOT_IMPLEMENTED | none | outbound_asks rows are per-channel, unmerged (see id 409). |  |
| 422 | My-court board | ⬛ NOT_IMPLEMENTED | none | No 'my-court' board distinct from the flat NorasDesk card list. |  |
| 423 | Aging heat on each follow-up | ⬛ NOT_IMPLEMENTED | none | NoraCard only applies a binary OVERDUE red tag (NorasDesk.jsx:289-303), not a graduated heat-color by age. |  |
| 424 | Natural-language reschedule by voice | ⬛ NOT_IMPLEMENTED | none | No NL-to-reschedule execution path exists (Nora chat has no tool-use). | Same gap as id 402. |
| 425 | Relationship-grouped task queue | ⬛ NOT_IMPLEMENTED | none | Same as id 396 -- no relationship-type grouping in the live cockpit. |  |
| 426 | Undo a completed or snoozed task | ⬛ NOT_IMPLEMENTED | none | PATCH /api/bucket/[id] could generically revert status, but no caller does. |  |
| 427 | Task search across people and deals | ⬛ NOT_IMPLEMENTED | none | Same as id 406 -- SearchPalette.jsx has no bucket/task source. |  |
| 429 | Commitment digest before a call | ⬛ NOT_IMPLEMENTED | none | No route composes 'what was last promised' from thread history before a call. |  |
| 430 | Post-meeting follow-up draft | ⬛ NOT_IMPLEMENTED | none | No route generates follow-up messages from a meeting/call transcript. |  |
| 431 | Why-now note on each nudge | ⬛ NOT_IMPLEMENTED | none | Same as id 407 -- no 'why now' text field on any nudge card. |  |
| 432 | Reminder confidence on guessed due dates | ⬛ NOT_IMPLEMENTED | none | bucket_items has no such flag; due_at is set identically whether from a user tap or (hypothetically) Nora. |  |
| 433 | Who-asked-you tagging | ⬛ NOT_IMPLEMENTED | none | app/api/crew/delegate/route.ts (supabase/migrations/2026-05-05-center.sql:9-26 bucket_items schema) only supports Gideon delegating OUT to c |  |
| 434 | Team request lane | ⬛ NOT_IMPLEMENTED | none | No dedicated 'team request' lane separate from Gideon's own tasks anywhere in NorasDesk.jsx; 'Shirel' appears only in unrelated identity/sta |  |
| 378 | Voice-captured task | 🟪 UI_ONLY | openai | app/api/voice/transcribe-en/route.ts does real transcription, but app/api/nora/chat/route.ts (the only consumer of that text) is a plain Ant | Recording+transcription is real; the 'lands as a structured task' half of the claim has no code path |
| 376 | Reminder on a message | 🟡 PARTIAL | supabase | EmailPanel.jsx:129-177 setReminder() -> POST /api/bucket (title includes subject, body: email.preview, source_url: gmailUrl) then POST /api/ | Works for a single email message (tap, fixed 1h). No equivalent for a single WhatsApp/SMS message -- |
| 377 | Reminder on a person | 🟡 PARTIAL | supabase | Reminder is a hidden bucket_item carrier keyed by thread.id (CommsPanel.jsx:161-164), not a first-class 'contact' record -- there is no cont | Surfaces next to the thread as described, but it's thread-scoped, not a true cross-channel per-conta |
| 382 | Snooze a task | 🟡 PARTIAL | supabase | Bucket snooze: PATCH /api/bucket/[id] due_at=+24h (NorasDesk.jsx:180-188). Ask snooze: PATCH /api/secretary/asks action='snooze' defaults to | Real snooze exists but as one fixed offset, not the '1h/2h/3h/6h/tomorrow' quick-chip set the featur |
| 385 | Today's task list | 🟡 PARTIAL | supabase | Filtering is client-side over the live /api/bucket + /api/secretary/asks payload (adapters.js:324-386 adaptNoraDesk); each card has its own  | The filtered visual list is real; there is no single 'read this list top to bottom' continuous audio |
| 386 | Overdue strip | 🟡 PARTIAL | supabase | overdueCount computed client-side from live due_at values (computeDueState, lines 40-49) against /api/bucket + /api/secretary/asks data. | Real and live, but it's a header badge + inline tags, not a distinct always-visible 'band' UI elemen |
| 389 | Auto-close on reply | 🟡 PARTIAL | supabase | lib/secretary/outbound-asks.ts:81-131 markAskReplied() auto-closes on inbound match, but it is only called from app/api/whatsapp/webhook/rou | Auto-close works for WhatsApp; email requires the human to tap 'Mark replied' manually. |
| 390 | No-reply nudge from Nora | 🟡 PARTIAL | anthropic | Card actions are only ['Mark replied','Snooze'] (adapters.js:345) -- no draft-generation call is attached; app/api/secretary/poll-overdue/ro | The card surfaces (real, live) but doesn't offer a one-tap follow-up draft, and its copy is generic  |
| 392 | Morning briefing of tasks | 🟡 PARTIAL | supabase | app/api/briefing/today/route.ts (checked lines 340-442) pulls bucket_items and calendar gaps for a 'suggested focus' block, but does not ref | A real spoken morning brief exists; it does not combine due tasks + overdue + cold contacts into one |
| 418 | Hebrew-native task text and playback | 🟡 PARTIAL | anthropic | app/api/nora/chat/route.ts:8,142-144 detects Hebrew via HEBREW_RE and returns { reply, language:'he' } untranslated; app/api/voice/speak lik | True for Nora *chat* turns, but there is no such thing as a stored Hebrew *task* (bucket_items has n |
| 374 | Quick reminder picker | 🔵 IMPLEMENTED_UNTESTED | supabase | CommsPanel.jsx:210-259 setRemind() -> POST /api/bucket (creates carrier) then POST /api/bucket/[id]/remind (app/api/bucket/[id]/remind/route | docs/FIX_AUDIT.md:183 (2026-06-29) calls this 'demo-state/mock-only' but that describes an earlier v |
| 381 | Task from a message | 🔵 IMPLEMENTED_UNTESTED | supabase | EmailPanel.jsx:138-152 POST /api/bucket with body: email.preview, source_url: email.gmailUrl (message kept as context); CommsPanel.jsx:227-2 | Framed in the UI as 'Remind', not literally labeled 'Task', but functionally is exactly this: one ta |
| 383 | Mark done | 🔵 IMPLEMENTED_UNTESTED | supabase | mutationFor() -> PATCH /api/bucket/[id] { status: 'done' } (app/api/bucket/[id]/route.ts:83-156); GET /api/bucket excludes done/dropped so t | 'Swipe' is not implemented, only tap; core complete/clear behavior is real. |
| 387 | Sent-message follow-up tracking | 🔵 IMPLEMENTED_UNTESTED | supabase | lib/secretary/outbound-asks.ts recordOutboundAsk() inserts an outbound_asks row with expected_reply_by on every outbound send; called from a | docs/FIX_AUDIT.md:196 independently confirms this as '✅ working'. |
| 388 | Per-channel reply windows | 🔵 IMPLEMENTED_UNTESTED | supabase | lib/secretary/outbound-asks.ts:5-10 REPLY_WINDOW_HOURS = { email: 48, whatsapp: 24, imessage: 24, sms: 24 } -- exact match to the described  | docs/FIX_AUDIT.md:196 confirms as working. |
| 394 | Peripheral nudge dot | 🔵 IMPLEMENTED_UNTESTED | supabase | components/cockpit/live/adapters.js:481-491 deriveKpis() computes openBucket = noraToYou items with source==='bucket'. | It's a live numeric chip, not literally a 'dot', but functions as the described peripheral count. |
| 399 | Reminder toast on kiosk | 🔵 IMPLEMENTED_UNTESTED | supabase | Subscribes to Supabase Realtime UPDATEs on public.reminders and renders a toast the instant fired_at flips from null (ReminderToast.tsx:41-7 | Component lives under components/center/ (shared, not legacy-only in this case) -- confirmed importe |
| 411 | Voice playback of a single task | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | components/cockpit/lib/voice.jsx useSpeech -> POST /api/voice/speak (ElevenLabs), real audio round-trip with play/pause state. | BLOCKED_BY_CREDENTIAL possible if ELEVENLABS_API_KEY unset (voice.jsx:29-30 shows a disabled state f |
| 417 | Peripheral task count without leaving the thread | 🔵 IMPLEMENTED_UNTESTED | supabase | components/cockpit/live/adapters.js:481-491 deriveKpis().openBucket, refreshed from live /api/bucket + /api/secretary/asks polling via Cockp | Same underlying mechanism as id 394. |
| 428 | Kiosk reminder toast | 🔵 IMPLEMENTED_UNTESTED | supabase | Realtime subscription on public.reminders UPDATE, fires the instant fired_at is set by the cron (app/api/bucket/fire-reminders/route.ts). | Same component as id 399; 'kiosk' framing (large/glanceable) matches the described bottom-right toas |

## System-wide / top bar (68 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 440 | Channel-color presence stripe | ⬛ NOT_IMPLEMENTED | none | grep for '28px' across components/cockpit found no dedicated channel-color presence stripe; RecentlyActiveStrip.jsx uses per-chip 4px left-b | No 28px band matching the described feature exists anywhere in the cockpit. |
| 446 | Notification routing by category | ⬛ NOT_IMPLEMENTED | none | No backend route or table for notification routing/categories found (grep for category+notification returned nothing) |  |
| 452 | Semantic search | ⬛ NOT_IMPLEMENTED | none | No vector/embedding search found anywhere in repo (grep for vector/embedding/pgvector returned nothing) | 'The Boston note' would only surface if the literal word 'Boston' appears; there is no meaning-based |
| 453 | Natural-language command bar | ⬛ NOT_IMPLEMENTED | none | app/api/nora/chat/route.ts is Q&A only — no tool-calling/function-execution, confirmed by absence of any tools param in the Anthropic client | The palette runs zero real actions today; typing a request only navigates to a page or (via Nora cha |
| 454 | Silent mistranscription correction | ⬛ NOT_IMPLEMENTED | openai | app/api/voice/transcribe-en, transcribe-he routes and voiceClient.js useDictation() have no post-processing correction/replacement dictionar | No trace of any known-slip correction (e.g. 'Chad'->'chat') anywhere in the transcription pipeline. |
| 460 | Approval-gated Nora actions | ⬛ NOT_IMPLEMENTED | anthropic | app/api/nora/chat/route.ts:21 system prompt only instructs the model to say in TEXT that a drafted action 'needs his approval' — there is no | The legacy app/api/center/approval/route.ts approval queue is a different, unrelated Spanish-secreta |
| 461 | Per-relationship notification rules | ⬛ NOT_IMPLEMENTED | none | No per-relationship notification-rule table/route/UI found anywhere |  |
| 462 | Do-not-disturb with VIP bypass | ⬛ NOT_IMPLEMENTED | none | No Do-Not-Disturb / VIP-bypass mechanism found anywhere (grep for DND/do not disturb returned nothing) |  |
| 463 | Search filters by relationship and channel | ⬛ NOT_IMPLEMENTED | none | components/cockpit/chrome/SearchPalette.jsx — plain text input only, no filter chips/toggles for relationship, channel, or time range | CommsPanel does have channel-family tabs (305/718/investors/staff) via makeThreadHelpers, but that's |
| 468 | One-question-at-a-time prompts | ⬛ NOT_IMPLEMENTED | none | No general 'one question at a time' flow pattern found; multi-field forms exist elsewhere (e.g. app/invite/[token]/confirm/AddAttendeeForm.t |  |
| 469 | Global undo for sent actions | ⬛ NOT_IMPLEMENTED | none | No undo-after-send mechanism found anywhere (grep for 'undo' across cockpit/app/api returned nothing) |  |
| 470 | Contact-merge conflict resolver | ⬛ NOT_IMPLEMENTED | supabase | lib/contact-directory/client.ts lookups are silent best-effort matches (exact/ILIKE/partial) with no ambiguity/confirmation step; no UI foun |  |
| 474 | Read receipts and reply-status per thread | ⬛ NOT_IMPLEMENTED | none | live/adapters.js adaptThreadRow only carries `unread` count — no read_at/replied/delivered/reply-status field exists on the thread shape any |  |
| 477 | Per-contact AI memory card | ⬛ NOT_IMPLEMENTED | none | components/cockpit/lib/noraContext.js builds Nora's context fresh each turn from live threads/deals/brief — no persistent per-contact memory |  |
| 484 | Auto-draft for new inbound | ⬛ NOT_IMPLEMENTED | anthropic | app/api/ai/draft/route.ts is a request/response endpoint invoked by user action — no webhook-triggered auto-draft-on-arrival found in app/ap | Draft generation is real but on-demand only, not automatic the moment a message lands. |
| 485 | Spam and cold-pitch filter | ⬛ NOT_IMPLEMENTED | none | No spam/cold-pitch classification field or bucket found anywhere (grep for spam/cold-pitch/is_spam returned nothing app-specific) |  |
| 488 | Missed-call to draft text | ⬛ NOT_IMPLEMENTED | none | app/api/phone/quo-webhook/route.ts call.completed only upserts to phone_calls; no missed-call branch or draft-text-suggestion trigger found |  |
| 489 | Pre-Shabbat wind-down | ⬛ NOT_IMPLEMENTED | none | lib/center/soft-schedule.ts isInShabbatWindow() only suppresses focus-time task suggestions during a coarse heuristic window; no queue-urgen |  |
| 491 | Send scheduling around quiet hours | ⬛ NOT_IMPLEMENTED | none | lib/center/soft-schedule.ts is for suggesting internal focus-time gaps, unrelated to delaying outbound sends by recipient timezone; no send- |  |
| 492 | Timezone badge per contact | ⬛ NOT_IMPLEMENTED | none | No per-contact timezone field found in thread/contact shapes (adaptThreadRow, contact_directory schema) |  |
| 493 | Recall and edit just-sent message | ⬛ NOT_IMPLEMENTED | none | No recall/edit-after-send mechanism found anywhere | Same underlying gap as feature 469 (global undo). |
| 494 | One-tap delegate to a teammate | ⬛ NOT_IMPLEMENTED | none | Per ground rules, legacy-only evidence means the live cockpit lacks the feature | Live cockpit (app/cockpit/page.tsx tree) has no delegate-to-teammate control. |
| 496 | Conversation summary on reopen | ⬛ NOT_IMPLEMENTED | none | No auto-summary-on-reopen logic found in CommsPanel.jsx (thread open handler just loads messages, no summary call) |  |
| 499 | Voice command to act on a thread | ⬛ NOT_IMPLEMENTED | anthropic | app/api/nora/chat/route.ts is pure Q&A (no tool-calling/function execution — see feature 453/460 evidence); components/cockpit/lib/voiceComm | 'Reply yes and snooze till tomorrow' would just become a chat message Nora answers in text; nothing  |
| 502 | Family-mode low-friction view | ⬛ NOT_IMPLEMENTED | none | live/adapters.js never sets `familyTag` to true anywhere (only referenced as a filter condition, no source assigns it) — so RecentlyActiveSt | Same root gap as feature 441 — family relationship tagging does not exist in the live data pipeline. |
| 473 | Pin VIP threads to the top | 🟣 MOCK_ONLY | none | components/cockpit/wideTabs/PinnedWideTab.jsx renders components/cockpit/data/pinned.js — a hardcoded static array (Bay Valley, Doron Sagiv, |  |
| 500 | Disappearing peripheral alert tray | 🟣 MOCK_ONLY | none | No live data source feeds ToastStack at all |  |
| 498 | Adjustable Listen speed and voice | 🟪 UI_ONLY | elevenlabs | grep confirms `speechifySpeed` is set and read ONLY inside TopChrome.jsx itself; app/api/voice/speak/route.ts request body accepts only {tex | The speed selector is cosmetic — selecting 1.2x-2.0x has no effect on actual ElevenLabs playback rat |
| 467 | Hebrew keyboard and mixed-direction text | ⬜ UNVERIFIED | none | components/cockpit/panels/CommsPanel.jsx sets a single `direction`/`hebrew` class per whole message based on isHebrew() detection | No dedicated bidi (mixed Hebrew+English within one message) handling logic found — direction is chos |
| 436 | Unified search across all channels | 🟡 PARTIAL | none | live/adapters.js channelKey() maps whatsapp/sms/imessage/google_voice into one thread shape; email via /api/email/triage | Call notes/phone calls are NOT included in search (no phone_calls table query in SearchPalette) desp |
| 439 | Top-3 peek above open thread | 🟡 PARTIAL | none | components/cockpit/live/adapters.js — no urgency-ranking/'top 3' selection logic found; no CommsPillar/CommsPanel code slices to a ranked to | General peripheral-strip concept is real; the specific 'top 3 most urgent, above the open thread' ra |
| 441 | Relationship-first contact list | 🟡 PARTIAL | supabase | live/adapters.js:66-71 real isInvestor/staffTag classification (staff-roster.ts + row.is_investor); NO familyTag field is ever set by any ad | Investor/staff grouping real; family/legal/vendor/posek relationship taxonomy from the feature descr |
| 445 | Dictation on every input | 🟡 PARTIAL | openai | components/cockpit/lib/voiceClient.js useDictation() → /api/voice/transcribe-(en\|he) real Whisper round-trip | Real on major composers verified (chat reply, PTT); not individually verified on every input field i |
| 447 | Shabbat and Yom Tov pause | 🟡 PARTIAL | hebcal | app/api/religious-calendar/route.ts + lib/zmanim/postville.ts (real Hebcal); lib/center/soft-schedule.ts isInShabbatWindow() skips only the  | Countdown display is real and accurate; no evidence any actual send/reminder/timer is held or paused |
| 451 | Anchored peripheral updates | 🟡 PARTIAL | none | components/cockpit/chrome/TopChrome.jsx comment: 'the cockpit is a fixed spatial kiosk layout' (i18n.jsx:3-7); RecentlyActiveStrip/DrawerShe | Structurally plausible (fixed absolute-position chrome, no reflow) but not explicitly verified again |
| 455 | Smart notification triage | 🟡 PARTIAL | anthropic | live/adapters.js tierFromScore() real email urgency mapping (L2-L7); app/api/secretary/asks/route.ts overdue vs awaiting split | Real per-domain triage exists (email score, ask overdue); there is no single cross-channel 'what nee |
| 456 | Religious calendar engine | 🟡 PARTIAL | hebcal | app/api/religious-calendar/route.ts + lib/zmanim/postville.ts — real Hebcal candle-lighting/havdalah/Yom Tov data | Jewish calendar is real and live; no Muslim or Christian date support found anywhere in the codebase |
| 457 | Cross-channel identity merge | 🟡 PARTIAL | supabase | lib/contact-directory/client.ts lookupByPhone/lookupByName/lookupByEmail against contact_directory table; used in app/api/whatsapp/threads/r | Real phone/name/email lookup exists and feeds display names; there is no unified 'one person record' |
| 459 | Urgency scoring on inbound | 🟡 PARTIAL | none | live/adapters.js tierFromScore() (L2-L7) — real for email only; adaptThreadRow (WhatsApp/SMS/iMessage) computes no urgency score, only raw u | Real scoring exists for email; not implemented for comms threads or calls. |
| 464 | Recent-and-frequent contact rail | 🟡 PARTIAL | none | live/adapters.js has no contact-frequency/interaction-count computation | Recency-based rail is real; there is no 'learned from his own habits' frequency model. |
| 466 | Cross-channel conversation thread | 🟡 PARTIAL | timelines-ai | live/adapters.js adaptThreadRow keys threads on row.phone across panel/channel_type, unifying WA+SMS+iMessage | WhatsApp/SMS/iMessage are stitched into one thread; email (EmailPanel) and calls (phone_calls table) |
| 471 | Cross-account unified inbox | 🟡 PARTIAL | gmail-api | app/api/email/triage/route.ts normalizes/filters by account_email; gated on GOOGLE_REFRESH_TOKEN_2 for the second mailbox | GOOGLE_REFRESH_TOKEN_2 env var (per project memory, only the primary Gmail token is currently config |
| 472 | Snooze a thread until later | 🟡 PARTIAL | supabase | app/api/secretary/asks/route.ts PATCH action='snooze' re-dates expected_reply_by for follow-ups | Snooze exists for bucket tasks and outbound-ask follow-ups; no 'snooze this comms thread and it reap |
| 476 | Follow-up reminder on send | 🟡 PARTIAL | supabase | lib/secretary/outbound-asks.ts recordOutboundAsk() auto-inserts a fixed reply window (48h email / 24h WA-SMS-iMessage) on every send in app/ | Tracking is automatic and fixed-window; there is no UI letting the user set a custom 'remind me if n |
| 478 | Hebrew-English same-thread switch | 🟡 PARTIAL | anthropic | app/api/ai/draft/route.ts SYSTEM_305/718 instruct 'Code-switch naturally between English and Hebrew when it fits'; app/api/nora/chat/route.t | Real prompt-level language-matching instruction to the model; not a deterministic per-message-langua |
| 479 | Attachment and document peek | 🟡 PARTIAL | supabase | lib/uploads.js uploadAttachment() real Supabase-backed file upload/send pipeline | PDFs/docs (e.g. an LOI) only render as an external `target=_blank` link (isOtherMedia branch), not a |
| 480 | Voice-note transcription with playback | 🟡 PARTIAL | openai | No inbound-audio transcription found — inbound audio messages fall into the generic isOtherMedia branch (Paperclip 'Attachment' link only, n | Outbound voice-note sending is real; the described inbound 'turns voice notes into readable text' ca |
| 481 | Daily morning briefing | 🟡 PARTIAL | supabase | live/adapters.js adaptBrief() built from real /api/briefing/today (deals, meetings, follow-ups) | Real live data + on-demand Listen button exist; no evidence of a proactive/automatic 'each morning N |
| 483 | Promise and commitment tracker | 🟡 PARTIAL | supabase | lib/secretary/outbound-asks.ts tracks reply-expected windows on every outbound send/reply | Tracks 'did they reply' generically for every outbound message; does not parse message content for s |
| 486 | Unknown-caller and number identifier | 🟡 PARTIAL | supabase | lib/contact-directory/client.ts lookupByPhone() is real and used in app/api/whatsapp/threads/route.ts to resolve real contact names for thre | Real backend phone lookup feeds thread contact names; the dedicated Caller-ID popup drawer described |
| 487 | Aircall and phone-log merge | 🟡 PARTIAL | quo-openphone | app/api/phone/quo-webhook/route.ts call.completed writes real rows to a `phone_calls` table | Calls are logged server-side; no cockpit UI (CommsPanel/adapters) reads phone_calls to merge them in |
| 490 | Translation guard on Hebrew outbound | 🟡 PARTIAL | anthropic | app/api/email/draft/route.ts SYSTEM: 'reply in native business Hebrew (dugri register), never machine-translated' — a prompt-level instructi | No post-generation validation/guard step was found that inspects a Hebrew draft and holds/flags it i |
| 495 | Calendar-aware reply suggestions | 🟡 PARTIAL | anthropic | components/cockpit/lib/noraContext.js buildNoraContext() includes `events` (title/time/zoom) from live calendar data passed to /api/nora/cha | Nora chat can answer scheduling questions grounded in real calendar data if asked; there is no dedic |
| 497 | Read-aloud full thread | 🟡 PARTIAL | elevenlabs | app/api/voice/speak/route.ts real TTS | Per-item Listen buttons are real; no dedicated 'play the entire conversation as one continuous audio |
| 435 | Global command palette | 🔵 IMPLEMENTED_UNTESTED | none | Reads live useLiveData() threads/events/emails (components/cockpit/live/CockpitLiveData.jsx); rows open real actions (openThread/openEventRo | Real cockpit feature, no dedicated tests found. |
| 437 | Contact search by name and number | 🔵 IMPLEMENTED_UNTESTED | none | adaptThreadRow uses row.phone as thread id, resolved via contact_directory/Pipedrive earlier in the pipeline |  |
| 438 | Peripheral inbound strip | 🔵 IMPLEMENTED_UNTESTED | none | Driven by useLiveData() threads, sorted by lastTs; click opens thread via set('openChat') | Family lane is structurally always empty — see note on feature 441/502 (no familyTag ever set by any |
| 442 | Hebrew and RTL native rendering | 🔵 IMPLEMENTED_UNTESTED | none | live/adapters.js detectLanguage() Hebrew-char regex on real preview/subject text | Renders real Hebrew content RTL, not a translation. |
| 443 | Listen button everywhere | 🔵 IMPLEMENTED_UNTESTED | elevenlabs | app/api/voice/speak/route.ts — real ElevenLabs eleven_flash_v2_5 TTS call, gated on ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID | ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID required (disables to 'TTS off' state otherwise) |
| 444 | Large-type accessible layout | 🔵 IMPLEMENTED_UNTESTED | none | Consistent 16-22px+ font sizes and high-contrast ink/warm tokens throughout every cockpit component read (TopChrome, CommsPanel, BriefPanel, | Structural design-system property, not a togglable accessibility mode; no dyslexia-specific setting  |
| 448 | Recent-items quick switcher | 🔵 IMPLEMENTED_UNTESTED | none | Backed by live threads sorted by lastTs |  |
| 449 | Plain-English mode for Nora | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/nora/chat/route.ts:21 NORA_SYSTEM prompt: 'You speak plainly, warmly, concise... never corporate filler' | Enforced via LLM system prompt, not deterministic. |
| 450 | Institutional voice for outbound | 🔵 IMPLEMENTED_UNTESTED | anthropic | app/api/ai/draft/route.ts SYSTEM_305 ('Blackstone partner...transaction-grade') vs SYSTEM_718 (personal, casual) by panel; app/api/email/dra | Genuinely distinct prompts per channel — real implementation, not a stub. |
| 458 | Peripheral-aware overlays | 🔵 IMPLEMENTED_UNTESTED | none | components/cockpit/drawers/DrawerShell.jsx:19-22 — drawer top offset is `80+60` (below Row1 chrome + sub-strip), leaving RecentlyActiveStrip |  |
| 465 | Inbound language auto-detect | 🔵 IMPLEMENTED_UNTESTED | none | live/adapters.js detectLanguage() (Hebrew regex) drives thread.language, feeding both rendering direction and ListenButton's language param |  |
| 475 | Waiting-on-them tracker | 🔵 IMPLEMENTED_UNTESTED | supabase | app/api/secretary/asks/route.ts GET returns awaiting/overdue buckets from real outbound_asks table |  |
| 482 | End-of-day loose-ends sweep | 🔵 IMPLEMENTED_UNTESTED | supabase | app/api/briefing/evening/route.ts real handled/open/loose_ends payload, Redis-cached 2min, Chicago-timezone dated |  |
| 501 | Per-channel signature and identity | 🔵 IMPLEMENTED_UNTESTED | timelines-ai | lib/timelines/client.ts PANEL_ACCOUNT_MAP fixes 718→+17185505500 and 305→+13057784861 for every WhatsApp send; app/api/ai/draft/route.ts SYS | Correct-by-construction static routing, not a dynamic verification step, but functionally prevents w |

## Thread header — Nora live (3 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 504 | Nora on the call — Jump in | ⬛ NOT_IMPLEMENTED | none | No text-to-speech-into-call or bot-audio-injection code found in lib/elevenlabs, lib/zoom, or app/api/zoom/**. | No real-time audio bridge exists to let Nora speak into a live meeting |
| 505 | Record the room (in-office meeting) | ⬛ NOT_IMPLEMENTED | none | Repo-wide grep for 'record the room' / 'in-office' / 'in-person' recording returns zero hits outside this registry file itself. | Feature has no code trace at all |
| 503 | Nora always-on the call — Listen only | 🟣 MOCK_ONLY | none | app/api/zoom/webhook/route.ts:8-51 only stores raw Zoom webhook events into zoom_events; comment at line 46-49 says the recording/transcript | No live audio/transcript pipeline built; ZOOM_WEBHOOK_SECRET_TOKEN wiring exists but only captures p |

## Phone-in (Nora 917-970-3154) (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 506 | Call Nora from anywhere | ⬛ NOT_IMPLEMENTED | none | app/api/phone/** contains only bb-webhook, quo-webhook, quo-send, call-event, recording/[id] — all of these ingest/log calls+SMS for the exi | No inbound-voice-agent infrastructure (Twilio/ElevenLabs conversational relay) built for a dedicated |

## Phone-in + approval queue (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 507 | Voice approval over the phone | ⬛ NOT_IMPLEMENTED | none | No route or lib module implements a spoken-approval gate; the only approval-adjacent code (app/api/center/approval, app/api/secretary/asks)  | Depends entirely on the non-existent Nora phone-in voice agent (feature 506) |

## Phone-in (Nora line) auth (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 508 | Nora phone keypad code (770770) | ⬛ NOT_IMPLEMENTED | none | Repo-wide grep for '770770' or any keypad/DTMF auth handler returns zero hits in app/, lib/, components/. | Depends on the non-existent Nora phone-in line |

## Contact-history card (opens from any thread) (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 509 | One universal contact-history card | ⬛ NOT_IMPLEMENTED | none | InvestorProfileDrawer.jsx:421 Timeline tab falls back to hardcoded mock entries ('Mock chronological entries — replace with il_timeline inge | No reachable contact-history UI in the live cockpit; nearest candidate components are dead/unrendere |

## Thread header (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 510 | Move someone into a lane (exclusive) | 🔒 BLOCKED_BY_INFRASTRUCTURE | supabase | app/api/whatsapp/threads/[id]/route.ts:37-71 validates and persists lane_override ('investor'\|'staff'\|'general') to whatsapp_threads, expl | supabase/migrations/2026-06-23-whatsapp-threads-lane-override.sql not confirmed applied — migration  |

## Top bar (Row 1) (2 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 511 | PINNED sticky notices | ⬛ NOT_IMPLEMENTED | none | The only 'pinned' concept in the cockpit is components/cockpit/wideTabs/PinnedWideTab.jsx, a wide-tab (not top-bar) that renders 100% static | Removed/never built in the top bar; PinnedWideTab is an unrelated static mock elsewhere in the layou |
| 514 | NEXT UP agenda strip | ⬛ NOT_IMPLEMENTED | google-calendar | app/api/calendar/today/route.ts backs the live event feed used by LiveMeetingAlertSync, but no component renders it as a dedicated 'NEXT UP' | No persistent agenda-strip UI built; only a conditional imminent-meeting alert exists |

## Top bar (RecentlyActiveStrip) (2 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 512 | WHAT NEEDS YOU live counters | ⬛ NOT_IMPLEMENTED | none | Repo-wide grep for 'WHAT NEEDS YOU', 'going-cold', 'to-approve' pills returns no matches in components/cockpit. | Feature was never built; the strip that occupies this surface today serves a different purpose |
| 513 | QUICK START cluster | ⬛ NOT_IMPLEMENTED | none | Repo-wide grep for 'QUICK START' / quick-start cold-start actions returns no matches. | Feature has no code trace |

## Top bar (Row 1, left of Nora) (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 515 | Global command / search line | 🟡 PARTIAL | none | Search itself is client-side filtering over already-fetched live data (no dedicated search-index backend); lib/cockpit/commands.ts backs the | Functionally covers 'find anyone/any message/any meeting' well, but is a modal overlay, not a persis |

## Top bar (Row 1, right of Nora) (1 features)

| # | Feature | Status | Provider | Evidence | Blocker/Note |
|---|---|---|---|---|---|
| 516 | NORA SUGGESTS live recommendation | ⬛ NOT_IMPLEMENTED | none | Repo-wide grep for 'NORA SUGGESTS' / live-recommendation widget returns no matches. | Feature has no code trace |
