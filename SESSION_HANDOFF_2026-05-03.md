# RePrime Command Center — Session Handoff (May 3, 2026)

**For:** the next Claude session, who has not seen any of this conversation.
**Read in this order:** this file → `HANDOFF.md` (architecture) → `_terminal-design-reference/README.md` (locked design + tokens) → `_terminal-design-reference/brand/CLAUDE_CODE_MIGRATION_BRIEF.md` (Imperial Gold spec).

Auto-memory at `C:\Users\G\.claude\projects\C--reprime-command-center\memory\` will load on session start. Confirm you see 9 entries in `MEMORY.md` before doing anything.

---

## 1. Current State (verified end of session)

- **Branch:** `main` · clean working tree
- **Latest commits:**
  - `3041b34` brand: Imperial Gold migration — one gold #FFCC33, one navy #0E3470
  - `a0c381c` fix(dictation): preserve last word on mic stop; refocus textarea after transcript
- **Production URL:** `https://project-7e87w.vercel.app` — Vercel rebuild may still be in flight when you start. Visual-smoke-test it before assuming the migration is live.
- **Repo:** `C:\reprime-command-center\dashboard` (Next.js 15 · read `AGENTS.md` before touching code — Next 15 has breaking changes from training data)

---

## 2. What Changed Today (in plain terms)

**A. Imperial Gold migration completed.** Single brand gold (`#FFCC33`) and single brand navy (`#0E3470`) across the entire dashboard. Hierarchy now comes from opacity, never a different hex.
- Source of truth: `dashboard/lib/design-tokens.ts` (TS) and `_terminal-design-reference/brand/TerminalLogo.jsx` (JSX)
- ~25 files swept, ~180 hex replacements
- New favicon + master logo SVG live; old versions preserved at `public/legacy/`
- 7 brand attachments saved at `_terminal-design-reference/brand/`
- **Carved out (still on legacy gold — separate migration pass when Gideon greenlights):**
  - `_terminal-design-reference/Page1_Base_Email.html`, `Page2_Confirmation.html`, `Page3_Choose_Time.html` (3 locked recipient pages)
  - `_terminal-design-reference/briefs/*` and `playbooks/*` (historical reference docs)
  - `public/legacy/*` (pre-migration logo backups)
- Verification grep (should find only the carved-out zones + intentional doc comments): `grep -rn -i -E "#(bc9c45|ffd700|ffec8a|e8b840|a88b40|e8c96d|c4a84e|b09040|a08a3e|d4af37|0a1f44|0a1430|0a1830|1a3560)"`

**B. Dictation fix shipped.** `MicButton.tsx` now preserves the last word when Chrome ends recording before delivering the final transcript (previously dropped the last word). `ReplyBox.tsx` re-focuses the textarea after dictation lands.

**C. Investor profile design locked** (mockup at `_terminal-design-reference/mockup_investor_profile_slide_in.html`). Open the file in a browser to see the agreed-on layout. Key rules:
- Profile opens via a dedicated **`★ Open Profile`** button in the conversation header of the Investors panel — NEVER on row click. Row click opens the WhatsApp chat. (See `memory/investor_panel_chat_first.md`.)
- Slide-in covers ~70% of the screen from the right; ESC or backdrop-click closes.
- Layout top to bottom: Last communication → Summary card (cream) → Recommended next step + Open Tasks SIDE BY SIDE → Quick actions row → Your Notes textarea → Full timeline (collapsed at bottom).
- AI summary engine: **Claude Opus 4.7** for investor summaries (best quality), **Haiku 4.5** for fast actions like draft replies.
- Recommendation card always shows ONE clear next step OR explicit "Wait — no action." Never empty.
- Every AI text block has a `▶ Listen` button (TTS). Use existing `components/chat/SpeakerButton.tsx`.
- All internal text in **Poppins regular**, simple English, short sentences, no jargon, no italics, no Playfair body. (See `memory/plain_english_standard.md` and `memory/font_and_tts_standard.md`.)

**D. Terminal vs Regular Meeting Request flow locked.** Same design system, two variants controlled by `meeting_type` field on `invitations` row.
- **Two top-bar buttons** (not a toggle): `✉ Terminal` and `🤝 Meeting Request`. Both large, clearly labeled.
- Regular meeting differences:
  - Hero label `Meeting Request` placed BELOW the big name (Terminal has `Private Introduction` ABOVE)
  - "Private Membership · By Invitation Only" block REMOVED for regular meetings
  - Default bubble copy: `"[Name] — let's find time to connect. Pick what works for you."` (editable before send)
  - Duration chip row: `10 · 20 (default) · 30 · 45 · 60 · Custom` — Custom defaults to 20, allows typed override. Terminal stays locked at 30 min.
  - Confirm line uses dynamic duration (e.g., `"Twenty minutes"` / `"One hour"`)
  - Email subject: `Meeting request — [Name]`
  - Page 2 confirmation letter says `"Your meeting is set."` (Terminal says `"Your introduction is set."`)
  - Page 3 bubble note (week picker): `"Whenever works for you, [Name]. The calendar is open."` — same for both
  - Same Terminal-branded OG card; just regular-meeting copy
  - Bubble copy is pre-filled but ALWAYS editable before send — never auto-sends
- Banned across both: "AI", "booked", "schedule a meeting", "hop on a call", "quick chat", "sync up", em-dash bullets, marketing numbers ("3,000+ transactions", "$15 billion deployed").

**E. Block button defined.** One block hits all channels (305 / 718 / SMS / email) for the same person. Resolution by Pipedrive contact ID + phone/email match. Confirmation modal lists the channels before firing. Reversible from a "Blocked" view. (See `memory/block_is_cross_channel.md`.)

---

## 3. Critical "Do Not" Rules

1. **Google Voice is dead.** The 305 number ported to **Quo** (formerly OpenPhone). Anywhere code references `google_voice_305` as a channel, route through Quo's API instead. Stop opening `voice.google.com` popups. (See `memory/google_voice_retired.md`.) HANDOFF.md still has stale references — trust this file over those.
2. **Off-scope content** — Gideon repeatedly uploaded a zip with materials for a different family business. He explicitly said it's not part of the Command Center. **Never name that project, even in disclaimers**. If a future zip contains those filenames, refuse to import and ask him to point at a different file. (See `memory/scope_guardrail.md`.)
3. **Investor row click = chat, never profile.** The Investors panel is a working WhatsApp chat (`InvestorChatPanel.tsx`). Don't hijack thread row clicks. (See `memory/investor_panel_chat_first.md`.)
4. **No new gold or navy hex values in the codebase.** Use `lib/design-tokens.ts` constants or `rgba()` with the locked RGB triplets (`255, 204, 51` for gold, `14, 52, 112` for navy). (See `memory/imperial_gold_tokens.md`.)
5. **Plain English internal copy.** Every AI summary, recommendation, briefing item, alert text → short sentences, common words, active voice, no jargon. Never italic body. Outbound recipient pages keep their locked Playfair design. (See `memory/plain_english_standard.md`, `memory/font_and_tts_standard.md`.)
6. **More buttons, big and readable** beats compact toggles. Gideon has wide screens and is dyslexic. Default to multiple prominent buttons over space-saving dropdowns. (See `memory/ui_density_preference.md`.)

---

## 4. Channel Facts (current truth)

| Channel | Phone | Status | How to send/receive |
|---|---|---|---|
| WhatsApp 305 | +1 (305) 778-4861 | Live via Timelines.ai | Existing `/api/whatsapp/*` routes |
| WhatsApp 718 | +1 (718) 550-5500 | Live via Timelines.ai | Existing routes |
| **305 SMS / Calls / Voicemail** | +1 (305) 778-4861 | **Quo (ported from Google Voice)** — webhook needs to be wired | Build new `/api/phone/quo-webhook` (account-scoped, filtered by number); Quo API for outbound |
| 718 SMS / Calls | +1 (718) 550-5500 | iPhone — passive mirror via cloud Mac + BlueBubbles is the approved plan, not yet built | iPhone Continuity → cloud Mac (HostMyApple) → BlueBubbles Server (PIN to v2026.2.26) → webhook to dashboard. Audio cannot be captured server-side; metadata only. |
| Email (out) | g@reprime-terminal.com via SendGrid | Live | Existing email infra |
| Email (in) | g@reprime.com (Gmail) | OAuth Calendar scope live; **Gmail readonly scope needs to be added** for investor profile email history | Re-auth required once when Gmail readonly is added |

---

## 5. Team & Task Model

- **Team members** (all `@reprime.com` emails — extract via Gmail signatures using the readonly scope once added):
  - Shirel
  - Steve
  - Adir
  - Yaron
  - Chaim
- **Workflow:** Claude drafts the task + recipient suggestion. Gideon reviews, picks recipients (one or more team members or a WhatsApp group), sends. No team login.
- **Reminders:** Claude tracks every sent task and reminds Gideon to follow up. Cadence depends on task type (default next-day; longer for research). Confirmation arrives on the same channel as send (WhatsApp out → expect WhatsApp reply; email out → expect email).
- **WhatsApp groups** for sending: Gideon picks the group at send time, copy-paste or tag flow. Don't pre-define group lists.

---

## 6. What to Build — Track Order

The user ranked these. Investor profile first.

### Track B (PRIMARY) — Investor profile + cross-channel command
Goal: clicking `★ Open Profile` on an investor opens the slide-in showing last comm + AI summary + recommended next step + tasks + actions + notes + collapsed timeline.

Subtasks in order:
1. **Schema migration** — verify `invitations` table exists (HANDOFF.md flags it as missing; check Supabase). Add `parent_invitation_id`, `reschedule_count`, `zoom_passcode` if not present (per `briefs/RePrime_Invitation_Flow_Handoff_Brief.docx` §7).
2. **Add `investor_profiles` aggregation** — view or table that joins `whatsapp_messages` + `whatsapp_threads` + email (Gmail) + calls (Quo) + meetings + Pipedrive notes by Pipedrive contact ID.
3. **Gmail readonly OAuth** — extend existing Google OAuth scope. Gideon re-authorizes once. Pull all-time email history for tagged investors on first profile open.
4. **Profile route + slide-in component** — render the layout from `mockup_investor_profile_slide_in.html` as a Next.js component. Wire to real data.
5. **`★ Open Profile` button** in `InvestorChatPanel.tsx` conversation header — only this opens the profile. Row click stays as-is (opens chat).
6. **Opus 4.7 summary engine** — endpoint that takes investor ID, pulls full timeline, returns: last communication line, 2-3 sentence summary, recommended next step (or "Wait — no action"). Must always recommend OR explicitly say wait.
7. **TTS Listen buttons** on every AI text block (existing `SpeakerButton.tsx` component).
8. **User notes textarea** — auto-saves, scoped to investor.
9. **Pipedrive auto-write** — every confirmed meeting + every task sent → Pipedrive Note on the contact (investor or not).

### Track C — Quo call recording
- New env vars: `QUO_API_KEY`, `QUO_WEBHOOK_SECRET`
- New `phone_calls` Supabase table (channel_type='call', recording URL, duration, transcript)
- `/api/phone/quo-webhook` with HMAC verification, account-scoped (filtered by `to`/`phoneNumberId`)
- `/api/phone/recording/[id]` to proxy authenticated recording URLs
- Add Calls subtab/badge in 305 panel
- Wire NOW to whatever number is live in the Quo account; auto-handles 305 when port completes (no code change needed)

### Track D — Morning Daily Briefing
- Cron at 8 AM Chicago time daily — builds a triaged inbox view
- Auto-shown on first dashboard load each morning + emailed to g@reprime.com at 8 AM CT
- Scope: all unread WhatsApp 305/718, SMS, email, voicemail, today's meetings; investors expanded with detail; non-investors compact one-line + Answer / Decline / Suggested reply / Ignore quick-actions
- Block button on every row (especially 305 spam)

### Track E — Meeting Zoom popup
- Existing 10-min and 1-min reminders already fire (per HANDOFF.md §6f). Verify they still work.
- New: full-screen Zoom popup at meeting start time with sticky "Join Zoom" button
- On "Join" click → popup closes immediately
- On no action → auto-dismiss after 5 min from start time

### Track F — Regular Meeting Request flow
- Companion to existing Terminal flow. Same 3 pages, regular-meeting variant per spec in §2D above.
- Add `🤝 Meeting Request` button to top control bar next to existing `✉ Terminal` button (separate buttons, not a toggle).
- Reuses existing invitation rail; `meeting_type='meeting'` branch in renderers.

### Track G — iPhone 718 mirror (BlueBubbles)
- Approved architecture from prior session (see HANDOFF.md context). Cloud Mac VPS + BlueBubbles Server v2026.2.26 + custom call-log watcher daemon.
- Captures iMessage + SMS + call metadata. NOT call audio (iOS limitation).
- New `/api/phone/call-event` endpoint for the call-log webhook.
- Add `718-imessage` panel mirroring existing 305 pattern.

### Migration follow-up — 3 locked HTML pages to Imperial Gold
After dashboard validation, Gideon will greenlight migrating `Page1_Base_Email.html`, `Page2_Confirmation.html`, `Page3_Choose_Time.html` to the new tokens. The `whatsapp/whatsapp_invite_preview.html` and old briefs HTML files also need a pass eventually.

---

## 7. First Actions in the New Chat

1. Confirm 9 memory entries loaded from `MEMORY.md`. List them in your first response.
2. Read `HANDOFF.md` (architecture), this file, and `_terminal-design-reference/README.md`.
3. Visit `https://project-7e87w.vercel.app` — confirm Imperial Gold rendered correctly. If Vercel hasn't rebuilt yet, wait or ask Gideon.
4. Open `_terminal-design-reference/mockup_investor_profile_slide_in.html` in a browser — that's the locked investor profile design.
5. Run `git log --oneline -5` to confirm last two commits are visible (`3041b34`, `a0c381c`).
6. Ask Gideon: *"Investor profile build — start with the schema check + Gmail OAuth scope, or some other entry point?"*
7. Build.

---

## 8. Notes for Future-You

- Gideon is dyslexic. Plain English everywhere. Big buttons, readable fonts.
- He has wide screens. More vertical space, more visible buttons, no compact toggles.
- He uses TTS heavily — Listen button on every AI-generated text block is mandatory.
- He communicates in stream-of-consciousness sometimes; parse for intent, not literal word-by-word.
- Don't ship before he says go. Show, confirm, ship.
- When he says "everything we said is locked" — believe him; don't re-litigate decisions.
- He has more wide screens than vertical phone real estate. Scrolling is fine; cramming is not.

End of handoff.
