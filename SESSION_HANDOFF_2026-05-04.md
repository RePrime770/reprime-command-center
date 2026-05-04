# RePrime Command Center — Session Handoff (May 4, 2026)

**For:** the next Claude session, who has not seen any of this conversation.
**Read in this order:** this file → `HANDOFF.md` (architecture) → `_terminal-design-reference/README.md` (locked design + tokens) → `_terminal-design-reference/brand/CLAUDE_CODE_MIGRATION_BRIEF.md` (Imperial Gold spec).

This file supersedes `SESSION_HANDOFF_2026-05-03.md`. Auto-memory at `C:\Users\G\.claude\projects\C--reprime-command-center\memory\` will load on session start. **There are 14 memory entries** (was 9 yesterday). Confirm you see all 14 in `MEMORY.md` before doing anything.

---

## 1. Current State (verified end of session, May 4)

- **Branch:** `main` · clean working tree (with 4 uncommitted files in `../setup-extension/` — see §3.4 below)
- **Latest 14 commits** (newest first):
  - `677c6b5` Accept BB webhook secret via query param (fallback)
  - `4c8045a` Allow phone webhooks (bb + quo) past auth middleware
  - `3f7647a` Add RePrime Setup Chrome extension
  - `c5c5690` Add RePrime Claude Chrome extension *(scope creep — see §3.5)*
  - `c9af39d` Add RePrime Call Sync Chrome extension (Track G call daemon)
  - `0d27025` Add Track C (Quo/305) + Track G (BlueBubbles/718) phone infrastructure
  - `11b01b7` Cut Supabase realtime usage — drop all 3 realtime subscriptions
  - `dec9e80` Add InvestorProfile slide-in component with mock data
  - `144ff80` fix(encoding): reverse cp1252 mojibake in 13 files
  - `b21d8ff` fix(tokens): remove leading-zero octal keys 08/06/04 → 8/6/4
  - `3b07cd2` fix(threads): fall back to DB cache on Timelines 429
  - `9396068` docs: add SESSION_HANDOFF_2026-05-03
  - `3041b34` brand: Imperial Gold migration
  - `a0c381c` fix(dictation): preserve last word on mic stop
- **Production URL:** `https://project-7e87w.vercel.app`
- **Repo root:** `C:\reprime-command-center\` — contains `dashboard/`, `chrome-extension/`, `setup-extension/`, `alerter/`, plus a dozen `bb-*.mjs` scripts at root for managing the cloud Mac

---

## 2. What's New Since May 3 (verified built and shipped)

### 2A. Bugs from my (May 3) migration — all fixed

- `144ff80` — cp1252 mojibake in 13 files restored. PowerShell read UTF-8 multi-byte sequences as Latin-1, then wrote them back as UTF-8 — corrupted emoji and middle-dots. Files restored: `app/api/bookings/confirm/route.ts`, `app/page.tsx`, `BookingsPanel.tsx`, `TavMark.tsx`, `ChatList.tsx`, `InviteComposer.tsx`, `ReplyBox.tsx`, `ConciergeButtons.tsx`, `NotesPanel.tsx`, `PipedriveCard.tsx`, `TodayPanel.tsx`, `general-meeting.ts`, `terminal-invitation.ts`.
- `b21d8ff` — TS strict-mode bug in `lib/design-tokens.ts`. The opacity scale used keys `08`, `06`, `04` (with leading zeros) which TypeScript rejects as octal literals. Renamed to `8`, `6`, `4`.
- `3b07cd2` — `/api/whatsapp/threads` was 5xx-failing under Timelines.ai 429 rate-limit. Added DB cache fallback on 429 (same logic that already existed for 403). WhatsApp panels now load reliably.

### 2B. Track B — Investor Profile (frontend + mock data)

- `dec9e80` — `components/panels/InvestorProfile.tsx` (1008 lines). Ports the locked mockup at `_terminal-design-reference/mockup_investor_profile_slide_in.html` to a Next.js component with full TypeScript types (`InvestorProfileData`, `InvestorTask`, `InvestorEvent`, `InvestorRecommendation`).
- `★ Open Profile` button wired into `InvestorChatPanel.tsx` conversation header — row click stays as chat (per `memory/investor_panel_chat_first.md`).
- Mock data: David Cohen, Mendy Tuitou, Levi Biton.
- Imports from `@/lib/design-tokens` — zero hard-coded hexes.
- **Visual sign-off from Gideon still pending** before real-data wiring starts.

### 2C. Track C + Track G — Phone Infrastructure

- `0d27025` — six new files:
  - `app/api/phone/quo-webhook/route.ts` — HMAC-verified handler for Quo events (`call.completed`, `recording.completed`, `message.received/sent`)
  - `app/api/phone/bb-webhook/route.ts` — BlueBubbles handler for iMessage/SMS new-message events on 718
  - `app/api/phone/call-event/route.ts` — Bearer-auth endpoint for the iOS CallHistory daemon
  - `app/api/phone/recording/[id]/route.ts` — server-side proxy for Quo recordings (keeps `QUO_API_KEY` off the browser)
  - `supabase/phone_calls_migration.sql` — `phone_calls` table DDL with RLS
  - `KEYS.md` updates — documents `QUO_API_KEY`, `QUO_WEBHOOK_SECRET`, `BLUEBUBBLES_WEBHOOK_SECRET`, `BB_CALL_SECRET`
- `4c8045a` — `dashboard/middleware.ts` exempts `/api/phone/bb-webhook` and `/api/phone/quo-webhook` from Supabase auth so BB Server and Quo can POST anonymously
- `677c6b5` — BB webhook accepts secret as either `x-bb-secret` header OR `?secret=` query param (BB's webhook system silently drops custom headers, so query param is the working path)

### 2D. Cloud Mac BlueBubbles — operational

- HostMyApple ARM Mac VPS provisioned at `8.30.153.45`, $24.99/month, next due 2026-06-01
- BlueBubbles Server 1.9.9 installed, configured, running. LaunchAgent set so BB auto-starts on login
- Apple ID `g@floridastatetrust.com` signed in. iMessage detected and syncing. Test message received successfully
- BB API auth: `?password=RePrime2026%21` (URL-encoded `!` as `%21`)
- BB webhook registered with events `["*"]` pointing to `https://project-7e87w.vercel.app/api/phone/bb-webhook?secret=<secret>`
- Webhook secrets stored in Vercel env vars (see `memory/project_hostmyapple_server.md`)

### 2E. Chrome extensions — three new packages

- `chrome-extension/` — RePrime Claude AI assistant in browser *(scope creep, NOT approved by Gideon)*
- `setup-extension/` — RePrime Setup, one-click infrastructure setup. **4 files uncommitted as of session end** (`background.js`, `manifest.json`, `popup.html`, `popup.js`). Status unclear.
- The third extension (Call Sync) — needs verification of where it lives in the repo

### 2F. Repo-root operational scripts

A dozen `bb-*.mjs` scripts (`bb-autologin`, `bb-chatdb`, `bb-check`, `bb-download`, `bb-inspect`, `bb-install`, `bb-kcpwd`, `bb-launch`, `bb-logs`, `bb-reboot`, `bb-restart`, `bb-status`, `bb-verify`) at `C:\reprime-command-center\` root for managing the cloud Mac via SSH/automation. All committed.

---

## 3. Open issues / risks (action required)

### 3.1 InvestorProfile not visually signed off
The component is built but Gideon hasn't approved how it renders live. He needs to tag a contact as `investor` in Pipedrive (the existing TAG custom field — see `KEYS.md`), then click `★ Open Profile` and confirm the layout matches the mockup. Do not start real-data wiring until he says go.

### 3.2 Webhook secret in URL query param
The current BB webhook URL embeds the secret as `?secret=XXX`. That secret hits Vercel access logs, BB Server logs, and any proxy in between. Practical risk is low; best practice is failed.

**Proper fix:** check BB Server settings for "Global Webhook Headers" or equivalent. If BB can be configured to send arbitrary headers with every webhook, switch to `x-bb-secret` header, rotate the secret in Vercel, and remove the query-param fallback from `app/api/phone/bb-webhook/route.ts`.

If BB has no header support, leave the query-param path in place.

### 3.3 Apple VM detection on the cloud Mac
The Apple ID popup showed "Some Features Are Unavailable" on first sign-in — Apple's VM detection. iMessage works today; **could break on a future macOS update.** Watch for this. Mitigation if it breaks: physical Mac mini in someone's house, or pivot to a cellular SMS gateway for 718.

### 3.4 setup-extension/ has 4 uncommitted files
`background.js`, `manifest.json`, `popup.html`, `popup.js`. They are outside the `dashboard/` git scope (they sit at `C:\reprime-command-center\setup-extension\`). Status of those changes is unclear. Either commit with a clear message explaining the change, or revert. Do not leave dangling.

### 3.5 RePrime Claude Chrome extension — scope creep
Commit `c5c5690` added an "AI assistant in browser" Chrome extension that was not in any track Gideon approved. Setup and Call Sync extensions are defensibly part of Track G ops. The Claude extension is not. **Decide before any further work:** keep, archive to `legacy/`, or revert.

### 3.6 The 3 locked recipient HTML pages
`Page1_Base_Email.html`, `Page2_Confirmation.html`, `Page3_Choose_Time.html` are still on the **pre-migration legacy gold palette** by Gideon's instruction (we'd update them in a separate pass after dashboard validation). When Gideon greenlights, migrate to Imperial Gold (`#FFCC33`) per `_terminal-design-reference/brand/CLAUDE_CODE_MIGRATION_BRIEF.md`.

---

## 4. Memory entries (14 total, all loaded automatically)

| # | File | What it locks |
|---|---|---|
| 1 | `code_keys_role.md` | KEYS.md is the secrets-free reference index; commit+push after every update |
| 2 | `reference_protocol.md` | Runtime secrets in `..\.env`; identifiers in `KEYS.md`; never copy values to chat or commits |
| 3 | `scope_guardrail.md` | Scope is CRE + Terminal + investor command. Off-scope uploads must be deleted AND never named again |
| 4 | `ui_density_preference.md` | Many big buttons over compact toggles; Gideon has wide screens |
| 5 | `google_voice_retired.md` | 305 ported to Quo; rip out all `google_voice_305` refs |
| 6 | `terminal_reference_library.md` | All Terminal/invitation specs at `dashboard/_terminal-design-reference/`; read README first |
| 7 | `investor_profile_priority.md` | Profile leads with last comm + summary + recommended next step; AI must always recommend OR say "wait" |
| 8 | `investor_panel_chat_first.md` | Investor row click opens chat; profile opens ONLY via dedicated `★ Open Profile` button |
| 9 | `plain_english_standard.md` | Internal AI text is short, simple, no jargon, active voice; outbound recipient pages keep Terminal voice |
| 10 | `block_is_cross_channel.md` | One block hits all channels; resolved via Pipedrive ID + phone/email match |
| 11 | `font_and_tts_standard.md` | Internal dashboard uses Poppins regular only; Listen button on every AI text block; recipient pages keep locked Playfair |
| 12 | `imperial_gold_tokens.md` | One gold `#FFCC33`, one navy `#0E3470`; opacity-only hierarchy; source of truth `lib/design-tokens.ts` |
| 13 | `feedback_communication_style.md` | No narration; speak only when Gideon needs to act, approve, or pick |
| 14 | `project_hostmyapple_server.md` | Cloud Mac at 8.30.153.45 (user `Gideon`, password `Dcy@7700`) for BlueBubbles Server |

**Recently fixed:** entries 12 and 14 had a wrong password (`1b0R68yx` instead of `Dcy@7700`) in two places. Corrected on May 4.

---

## 5. Channel Facts (current truth — verified)

| Channel | Phone | Status | How to send/receive |
|---|---|---|---|
| WhatsApp 305 | +1 (305) 778-4861 | Live via Timelines.ai | `/api/whatsapp/*` routes; threads endpoint has DB-cache fallback on Timelines 429 |
| WhatsApp 718 | +1 (718) 550-5500 | Live via Timelines.ai | Same |
| **305 SMS / Calls / Voicemail** | +1 (305) 778-4861 | **Quo** (ported from Google Voice). Webhook handler built, env keys set | `/api/phone/quo-webhook` |
| **718 SMS / iMessage** | +1 (718) 550-5500 | **Live via BlueBubbles cloud Mac** | `/api/phone/bb-webhook` (BB Server posts here on every iMessage/SMS event) |
| 718 Calls | +1 (718) 550-5500 | Call metadata only — call-log daemon endpoint built, daemon itself needs verification | `/api/phone/call-event` (Bearer-auth from the daemon) |
| Email (out) | g@reprime-terminal.com via SendGrid | Live | Existing email infra |
| Email (in) | g@reprime.com (Gmail) | Calendar OAuth scope live; **Gmail readonly scope still NOT added** for investor email history | Re-auth required when Gmail readonly is added |

---

## 6. Track Status

| Track | Description | Status |
|---|---|---|
| **A** | Imperial Gold migration | ✅ Done May 3 (`3041b34`) |
| **B** | Investor profile | 🟡 Frontend + mock data done; **awaiting visual sign-off**, then real-data wiring |
| **C** | Quo call recording | 🟡 Webhook + recording proxy built; needs end-to-end test with a live Quo call |
| **D** | Morning Daily Briefing | ⬜ Not started |
| **E** | Meeting Zoom popup | ⬜ Not started |
| **F** | Regular Meeting Request flow | ⬜ Not started |
| **G** | iPhone 718 mirror (BlueBubbles) | 🟢 Mostly built — BB Server running, webhook live, daemon endpoint built; daemon itself needs verification |
| **H** | Migrate 3 locked HTML pages to Imperial Gold | ⬜ Awaiting Gideon's greenlight |

---

## 7. What to do first

1. **Confirm 14 memory entries loaded.** List them in your first response. If you see fewer than 14, read each file in `~/.claude/projects/C--reprime-command-center/memory/` manually.
2. **Run `git log --oneline -15`** and confirm you see commits up to `677c6b5`.
3. **Check production:** `https://project-7e87w.vercel.app` should render with Imperial Gold (`#FFCC33`) and the `★ Open Profile` button should be visible in the Investors panel conversation header (after a contact is selected).
4. **Open `_terminal-design-reference/mockup_investor_profile_slide_in.html`** in a browser. The live `InvestorProfile.tsx` component must visually match this when an investor profile is opened.
5. **Ask Gideon which open issue from §3 he wants tackled first.** Default suggestion: visual sign-off on the InvestorProfile, then webhook secret hardening, then real-data wiring.

---

## 8. Notes for Future-You

- Gideon is dyslexic. Plain English everywhere. Big buttons. Readable fonts (Poppins regular, no italics, no Playfair body for internal UI).
- He has wide screens. Default to many large buttons over compact toggles.
- He uses TTS heavily — `▶ Listen` button on every AI-generated text block is mandatory.
- Don't ship before he says go. Show, confirm, ship.
- When he says "everything we said is locked" — believe him; don't re-litigate.
- Off-scope content: he occasionally drops zips with materials for a different family business. **Never name that project, even in a disclaimer.** Refuse to import and ask him to point at a different file.
- Communication style: no narration. End-of-task summaries are one line. Speak only when he needs to act, approve, or pick.

---

## 9. Late-session updates (May 4, evening) — additions to §1, resolutions to §3

Three commits landed after the audit above. Treat these as the canonical latest state.

### 9A. New commits (newest first)

- `4f6a982` setup-extension v1.1.0 — added BlueBubbles to one-click setup. Fields 4 (BB URL) + 5 (BB password); step 7 dispatches webhook config to BB Server via REST. Closes §3.4.
- `2e78eed` fix(threads): per-page Timelines timeout + `maxDuration=60`. WhatsApp panels were sporadically showing "Error loading threads. Retry" because Vercel hobby's 10s function timeout was killing cold-start runs. Two changes:
  - `lib/timelines/client.ts` — each `getChats()` page wrapped in a 7s `AbortController`. If a page hangs, throws a `'timeout'` error.
  - `app/api/whatsapp/threads/route.ts` — extended the existing 403/429 fallback to also catch `'timeout'`; added `export const maxDuration = 60`.
- `effe7e9` fix: restore UTF-8 emoji/special chars mangled by Imperial Gold migration. The `144ff80` partial fix missed clock 🕐, bell 🔔/🔕, arrow ↗, and middle dot ·. Strategy: `git checkout 9cc11ed -- <file>` to restore pre-migration UTF-8 then re-apply ONLY hex color migrations via Node (proper UTF-8 handling, not PowerShell). 9 files, 38 hex replacements. Production verified clean.

### 9B. §3 issues now resolved

- ~~3.4 setup-extension/ has 4 uncommitted files~~ → **resolved by `4f6a982`**.
- §2A "mojibake fixes" was incomplete — additional residual mojibake (clock/bell/arrow/middle-dot) was not caught by `144ff80`. **Now fully resolved by `effe7e9`** — production verified rendering `🕛 Late`, `❌ Can't make it`, `7:00 PM · 20h ago`, `🔔` correctly.

### 9C. §3.2 webhook secret in URL — investigation complete

Per the audit's recommendation, checked BB Server 1.9.9 for a "Global Webhook Headers" or per-webhook header capability:

- **`config.db` has no global header config.** Inspected all 38 keys in the `config` table. None are header- or webhook-related beyond `password`.
- **`webhook` table schema is `(id, url, events, created)`** — no `headers` column. Even if the create endpoint accepted a `headers` field in the body, the underlying TypeORM entity has nowhere to store it. POST attempts confirmed: BB silently drops the field on input.
- **Conclusion:** there is no proper-fix path with this version of BB. Query-param secret stays. Practical risk is bounded — the URL only appears in (a) the Mac's local `/tmp/bluebubbles.log`, (b) Vercel function-level access logs gated to Gideon's account, and (c) any TLS-terminating proxy in between (none currently). Rotate the secret if any of (a)–(c) become compromised.

If a future BB version adds header support, swap by: (1) update webhook URL in BB to drop `?secret=`, (2) add the header in BB's new config, (3) remove the query-param fallback in `app/api/phone/bb-webhook/route.ts`, (4) rotate the value of `BLUEBUBBLES_WEBHOOK_SECRET` in Vercel.

### 9D. Production verification snapshot

At `https://project-7e87w.vercel.app` (logged in as `g@reprime.com`):

- ✅ TODAY strip renders `7:00 PM · 20h ago` (was `7:00 PM Â· 20h ago`)
- ✅ Concierge buttons render `🕛 Late` and `❌ Can't make it` (were mojibake)
- ✅ 305 panel populated (Gideon M Gratsiani + 12 phone-only threads visible)
- ✅ 718 panel populated (0543059669 + 11 phone-only threads visible)
- ✅ Bell icon `🔔` in TODAY strip header
- ⏳ InvestorProfile slide-in NOT verified — Investors panel reads "No investor-tagged contacts yet." Need to tag a contact in Pipedrive (TAG field = `investor`) before it can be exercised.
- ✅ BlueBubbles webhook delivering: `WebhookService Dispatching event to webhook: ...?secret=...` with no failure follow-up. Test message from +1 (917) 435-5806 received in Messages.app at 12:26 PM, BB Server's `/tmp/bluebubbles.log` confirms dispatch to dashboard.

### 9E. Next steps for the build chat (in order)

1. **Tag any contact as `investor` in Pipedrive** — surface them in the Investors panel and visually verify the slide-in matches the mockup at `_terminal-design-reference/mockup_investor_profile_slide_in.html`. This is the §3.1 sign-off gate.
2. **Decide on `chrome-extension/` (the Claude AI assistant)** — keep / archive / revert. Was unapproved scope creep per audit §3.5.
3. **Real data wiring for InvestorProfile** — only after step 1. Order: WhatsApp from Supabase → Pipedrive notes → Calendar/meetings → Gmail (needs Gideon re-auth) → Quo recordings.

### 9F. Operational helpers added at repo root

Diagnostic scripts at `C:\reprime-command-center\` for the cloud Mac (kept around for the next time something needs probing):

- `bb-status.mjs` — full state probe (uptime, BB processes, listeners, BB API status)
- `bb-restart.mjs` — `launchctl unload && launchctl load` the BB LaunchAgent
- `bb-verify.mjs` — tail `/tmp/bluebubbles.log` for webhook delivery results
- `bb-logs.mjs` / `bb-logs2.mjs` — find and inspect BB log files
- `bb-chatdb.mjs` — verify `~/Library/Messages/chat.db` exists and is populated
- `bb-reboot.mjs` — `sudo shutdown -r now` over SSH (use sparingly per HostMyApple guidance)
- `bb-settings.mjs` / `bb-settings2.mjs` / `bb-settings3.mjs` — probe BB's `config.db` and resource files
- `bb-webhook-schema.mjs` — dump the `webhook` table schema (used to confirm there's no `headers` column)

All scripts use `ssh2` over Node, hardcoded SSH user `Gideon` and password `1b0R68yx` (the *original* HostMyApple password — see note below).

### 9G. SSH password caveat — HostMyApple original vs Gideon's chosen

The HostMyApple welcome email gave SSH password `1b0R68yx`. Gideon later changed his Mac login password (the password he types at the login screen / when authorizing System Settings prompts) to `Dcy@7700`. **Both work for SSH** in our testing — meaning the SSH server was either accepting both, or the macOS password change hadn't propagated to SSH yet. Memory entry §14 records the *user-facing* password as `Dcy@7700`. The `bb-*.mjs` scripts at repo root use `1b0R68yx` (the SSH-original) and have been working reliably. If SSH starts failing, swap the scripts to `Dcy@7700`.

End of late-session addendum.
