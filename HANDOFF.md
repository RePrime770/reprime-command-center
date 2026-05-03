# RePrime Command Center — Full Handoff Brief
**Generated:** 2026-04-30 | **For:** Next Claude session — read this entire document before touching any code.

> ⚠ **STOP — read SESSION_HANDOFF_2026-05-03.md FIRST.** It supersedes parts of this document (particularly anything about Google Voice, dashboard color tokens, the 305 line, and the Investors panel UX). This file is still the architectural reference — but the May 3 handoff is the current source of truth for state and what to build next.

---

## 1. What This Project Is

A private operations dashboard for Gideon Gratsiani (Founder, RePrime Group — commercial real estate).
Single authorized user: `g@reprime.com`.

**What it does:**
- Unified WhatsApp inbox across two numbers (305 and 718)
- AI message classification, TTS readback, reply drafting
- Google Calendar "today" strip with meeting quick-actions
- Investor contact panel
- Terminal Invitation system (sends branded meeting invites via WhatsApp + email)
- Pipedrive CRM integration

---

## 2. Deployment & URLs

| Thing | Value |
|---|---|
| GitHub | `RePrime770/reprime-command-center` (branch: `main`) |
| Vercel project | `reprime-command-center` under `g-8390s-projects` |
| **Dashboard URL** | `https://project-7e87w.vercel.app` ← USE THIS |
| `reprime-terminal.com` | Redirects to WordPress (`reprime.com`) for non-API paths — **do not use as dashboard URL** |
| API routes work at | `https://reprime-terminal.com/api/...` ← fixed in vercel.json |
| Local path | `C:\reprime-command-center\dashboard` |

**Critical vercel.json rule:** `/((?!api/).*)`  — all non-API paths on reprime-terminal.com → reprime.com. API paths pass through. Do NOT change this back to `/(.*)`  or webhooks break again.

---

## 3. Two WhatsApp Panels

| Panel | Number | Style | Call behavior |
|---|---|---|---|
| **305** | +1 (305) 778-4861 | Navy/gold (corporate) | Opens Google Voice popup |
| **718** | +1 (718) 550-5500 | Lighter personal theme | Opens `tel:` link → Windows asks which app (Teams or Phone Link) |

Panel order in UI (left → right): **305 | 718 | Investors**

---

## 4. Architecture

```
app/
  page.tsx                          ← Main dashboard (3-panel layout)
  invite/[token]/page.tsx           ← Public booking page for invitees
  api/
    whatsapp/
      webhook/route.ts              ← Timelines.ai webhook receiver ⚠ critical
      messages/route.ts             ← GET (fetch messages) / POST (send)
      threads/route.ts              ← Thread list for each panel
    ai/
      concierge/route.ts            ← Meeting quick-action messages (bilingual)
      draft/route.ts                ← AI reply drafting
    bookings/
      send-invitation/route.ts      ← Terminal invitation sender
      list/route.ts                 ← Invitation status list
      available-slots/route.ts      ← Free slot calculator
      confirm/route.ts              ← Slot confirmation handler
    calendar/today/route.ts         ← Google Calendar today's events
    cron/dispatch-alerts/route.ts   ← PagerDuty queue dispatcher (runs every 1 min)
    pipedrive/
      search/ person/ resolve/ notes/
    contacts/import-names/route.ts  ← CSV bulk name import
    voice/
      speak/route.ts                ← ElevenLabs TTS
      transcribe-en/ transcribe-he/ ← Voice-to-text

components/
  chat/
    MessageView.tsx                 ← Message bubbles + TTS speed control
    TopBarConcierge.tsx             ← Top-bar quick-send buttons (5 actions)
    CallButton.tsx                  ← Per-panel call behavior
    ChatList.tsx                    ← Thread list sidebar
    ReplyBox.tsx                    ← Compose box with AI draft
    TagChips.tsx                    ← Contact tags
  sidebar/
    TodayPanel.tsx                  ← Calendar strip + meeting reminders
    ConciergeButtons.tsx            ← Per-meeting Late / Can't make it buttons
    PipedriveCard.tsx               ← CRM data slide-in
    NotesPanel.tsx                  ← Sticky notes sidebar
  panels/
    InvestorChatPanel.tsx           ← Investors column (right)
  bookings/
    BookingsPanel.tsx               ← Terminal invitation composer

lib/
  timelines/
    client.ts                       ← Timelines.ai API wrapper
    types.ts                        ← DashboardThread, DashboardMessage, Panel, etc.
    normalize-phone.ts
    parse.ts                        ← parseTimelinesTimestamp, getMediaType, etc.
  email/templates/
    terminal-invitation.ts          ← HTML email for Terminal Introduction ⚠ Steve to redesign
    general-meeting.ts              ← HTML email for General Meeting
  pipedrive/client.ts
  supabase/server.ts
  sendgrid/client.ts
  google/calendar.ts
```

---

## 5. Supabase Tables

### `whatsapp_threads`
```sql
id uuid PK, panel text, channel_type text, phone text,
contact_name text, is_group bool, jid text,
last_message_at timestamptz, last_message_preview text,
unread_count int, pipedrive_contact_id int,
is_investor bool, is_priority bool
UNIQUE (panel, phone, channel_type)
```

### `whatsapp_messages`
```sql
id uuid PK, thread_id uuid FK, panel text, channel_type text,
direction text (in/out), body text, media_url text, media_type text,
media_filename text, timelines_uid text UNIQUE, from_phone text,
from_name text, sent_at timestamptz, status text, is_group_message bool
```

### `invitations` — ⚠ MUST CREATE — table does not exist yet
```sql
-- Run once in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY,
  contact_pipedrive_id integer,
  contact_first_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  proposed_slots jsonb DEFAULT '[]'::jsonb,
  meeting_type text DEFAULT 'terminal',
  status text DEFAULT 'sent',
  confirmed_slot_iso text,
  zoom_meeting_id text,
  zoom_join_url text,
  calendar_event_id text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '14 days')
);
```
Until this SQL runs, the "Send Invitation" button will fail with `invitation_insert_failed`.

---

## 6. Everything Built / Changed This Session

### 6a. Webhook fix — CRITICAL (was breaking all messages)
**File:** `app/api/whatsapp/webhook/route.ts`

**Root cause found:** Timelines.ai omits `chat.whatsapp_account_id` from most webhook payloads. The old code used only that field to detect which panel (305 or 718), so every single message was silently dropped.

**Fix:** New `resolvePanel()` function with 4 fallbacks:
1. `chat.whatsapp_account_id` (when present)
2. `message.recipient_phone` for inbound (our number = the recipient)
3. `message.sender_phone` / `recipient_phone` regardless of direction
4. `chat.jid`

Phone matching: `+17185505500` / `7185505500` → panel `718`; `+13057784861` / `3057784861` → panel `305`.

### 6b. vercel.json redirect — was killing webhooks
**File:** `vercel.json`

Old rule: `source: "/(.*)"` → redirected ALL traffic on reprime-terminal.com to reprime.com, including Timelines webhook POSTs.

Fixed to: `source: "/((?!api/)*)"` — non-API pages still redirect; `/api/*` passes through.

### 6c. Panel order swap
**File:** `app/page.tsx`

Changed render order from `[718, 305, Investors]` → `[305, 718, Investors]`.
Both panels now always have `borderRight`. Theme (color scheme) stays tied to the panel number, not position.

### 6d. Top control bar rebuild
**File:** `app/page.tsx`

The bar between TodayPanel and the main panels now contains:
- `📋 Import Names` button (CSV uploader, was barely visible before)
- `✉ Terminal` button (opens BookingsPanel modal)
- Vertical divider
- `TopBarConcierge` component (5 quick-send buttons)
- Active thread indicator (→ contact name, far right)

`activeThread` state tracks whichever conversation was most recently clicked in either panel and is passed to `TopBarConcierge`.

### 6e. TopBarConcierge component (new)
**File:** `components/chat/TopBarConcierge.tsx`

5 buttons targeting the currently open conversation:
| Button | API type | Behavior |
|---|---|---|
| 🕐 Late Zoom | `running_late_zoom` | Template — instant, no AI wait |
| 🕐 Late Office | `running_late_office` | Template — instant |
| ❌ Can't make it | `couldnt_make_it` | AI generates + proposes free slots |
| ⏩ Move earlier | `move_earlier` | AI says you're free sooner + proposes slots |
| ⏪ Postpone | `postpone` | AI pushes back meeting + proposes slots |

- Buttons always visible at full color — no opacity dimming.
- Clicking with no thread open shows modal with error: "Open a conversation first — click any contact on the left"
- Dialog shows EN + HE editable text areas, language selector, Send button.
- Send goes directly to `POST /api/whatsapp/messages` with `panel` + `thread_id` from `activeThread`.

### 6f. TodayPanel meeting reminders
**File:** `components/sidebar/TodayPanel.tsx`

Each meeting card now has a 🔔 toggle button:
- Click → resolves attendee email → looks up Pipedrive phone → searches `whatsapp_threads` by phone
- 🔔 green = thread found, ready to send
- 🔔 gold = no thread found (will skip send but reminds you)
- 🔕 = reminder off
- State persisted in `localStorage` key `meeting-reminders-v2`
- `useEffect` interval (30s) fires `POST /api/whatsapp/messages` at exactly 10 min and 1 min before meeting
- Reminder text: `"Reminder: we have a call in 10 minutes — {title}"` / `"…in 1 minute"`
- Prevents double-send via `sent10` / `sent1` flags per meeting

### 6g. ConciergeButtons on meeting cards — simplified
**File:** `components/sidebar/ConciergeButtons.tsx`

**Removed:** ✅ Early (Finished Early) button — user called it "Office Office" and didn't want it.
**Kept:** 🕐 Late + ❌ Can't make it

These remain on each meeting card in TodayPanel and are meeting-context aware (know the attendee, Zoom link, etc.).

### 6h. Concierge API — new types
**File:** `app/api/ai/concierge/route.ts`

Added types:
- `running_late_zoom` → template (no AI): "Running a few minutes late — I'll be on the Zoom call in just a moment."
- `running_late_office` → template (no AI): "Running a few minutes late — on my way, be there shortly."
- `postpone` → AI with free-slot proposal
- `move_earlier` → AI with free-slot proposal

Existing `running_late`, `finished_early`, `couldnt_make_it` unchanged.

### 6i. TTS speed control
**File:** `components/chat/MessageView.tsx`

Speed buttons (1× 1.2× 1.4× 1.8× 2×) in the message header:
- Styled as a grouped pill container, 11px, 60% opacity when inactive, full on hover/active
- Persists to `localStorage` key `tts-speed-v1`
- Applied both at audio create time AND live via `useEffect` (mid-playback speed change works)
- Hebrew auto-detected via `/[֐-׿]/` regex → uses Hebrew ElevenLabs voice
- Thread-level "Read thread" button reads all inbound non-audio messages in order

### 6j. BookingsPanel — channel multi-select
**File:** `components/bookings/BookingsPanel.tsx`

**Old behavior:** Radio buttons — "All three" / "WhatsApp 305" / "WhatsApp 718" / "Email only". Could not pick partial combos.

**New behavior:** 3 independent toggle checkboxes. Pick any combination:
- ✓ WhatsApp 305
- ✓ WhatsApp 718
- ✓ Email
- At least 1 must stay selected.
- Default: WhatsApp 305 + Email
- Pipedrive preferred method auto-selects sensible default when contact is loaded
- Preview boxes adjust (shows email preview if email checked, WhatsApp preview if either WhatsApp checked)
- `<invite-link>` placeholder replaced with `[booking link — inserted on send]` in previews
- When `invitations` table is missing: shows red box with SQL to copy, "Copy SQL" button

### 6k. send-invitation API — multi-channel
**File:** `app/api/bookings/send-invitation/route.ts`

- Now accepts `channels: ChannelOption[]` array (legacy `channel` string still works as fallback)
- Iterates: sends email if `'email'` in channels; sends via 305 if `'whatsapp_305'`; sends via 718 if `'whatsapp_718'`
- Returns `{ sent_channels: string[], errors: [...] }`

---

## 7. What Still Needs Doing

### 7a. ⚠ BLOCKING: Create `invitations` table in Supabase
Go to: Supabase Dashboard → SQL Editor → New query → paste and run the SQL from section 5 above.
Terminal invitations will fail with `invitation_insert_failed` until this is done.

### 7b. Terminal email design (Steve)
**File to replace:** `lib/email/templates/terminal-invitation.ts`

Current template: functional but generic HTML email with gold CTA button.
User wants: premium branded page — "a really nice page, your terminal, the whole nine yards."
Steve (external developer) will build the HTML. When done, replace the `html` string in `buildTerminalInvitationEmail()`. Keep the function signature identical — it receives `{ firstName, inviteUrl, slots }`.

The invite link IS real and functional. `inviteUrl` = `https://project-7e87w.vercel.app/invite/{uuid}` which opens a beautiful slot-picker page that auto-confirms + creates Zoom + adds to both calendars.

### 7c. Call button on 718 panel
Currently opens `tel:` link which prompts Windows "pick an app" dialog.
**Best options for user:**
1. Install **Windows Phone Link** (Microsoft Store) → pair with iPhone → `tel:` links ring the phone
2. Use **Microsoft Teams** if Teams calling is configured
Nothing to change in code for now. This is a Windows OS configuration issue.

### 7d. Messages from Timelines — verify working
The webhook fix was deployed. User should send a test WhatsApp message and confirm it arrives in the dashboard. The logs at Vercel (Functions tab, `/api/whatsapp/webhook`) should show `[webhook] message upsert OK`.

---

## 7b. UI Design Principles (Gideon's Preferences)

- **Everything in a single row where possible** — no stacked/vertical card layouts; keep height lean
- **TodayPanel** = one compact horizontal strip. Meeting cards are inline-flex pills: `time · rel | title | Zoom↗ | 🔔 | 🕐 Late | ❌ Can't make it` — all on one line, minimal padding
- **Top control bar** = single row: Import Names | Terminal | divider | 5 concierge buttons | active thread indicator
- **Tabs and buttons should be visually prominent** — small text (10–11px) only for secondary info; primary tabs/actions should be 0.9–1rem+, clear contrast, not washed out
- **BookingsPanel tabs** (Compose / Status) = large tabs 0.92rem, bold when active, good padding
- **BookingsPanel panel** = min-width 600px, generous padding — it's a premium modal, should feel substantial
- **Gideon likes things "a little bit more visual"** — gold accents, visible borders, clear active states

---

## 8. Key Decisions Made (Do Not Re-debate)

- **Panel order is 305 left, 718 center, Investors right** — user confirmed this
- **"Finished Early" / "Early" button removed** — user called it "Office Office", doesn't want it
- **Top bar concierge buttons always visible at full color** — no dimming; clicking without a thread shows inline error nudge
- **`activeThread` = last conversation clicked** — whichever panel, most recent click wins
- **Meeting reminder messages are plain text** (not AI-generated): "Reminder: we have a call in 10 minutes — {title}"
- **vercel.json API exception must stay** — `/api/` paths must not redirect or webhooks break
- **305 calls via Google Voice popup, 718 calls via tel: link** — intentional, by panel
- **TTS only reads inbound messages** (not outbound sent by Gideon)
- **Hebrew auto-detection** via Unicode range `[א-ת]` (Hebrew alphabet block)

---

## 9. Environment Variables Required

See `dashboard/KEYS.md` for the reference index (values in `..\.env`, never committed).

Key vars:
- `ANTHROPIC_API_KEY` — AI drafts, concierge, priority classification
- `ELEVENLABS_API_KEY` — TTS voice
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — webhook dedup
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `PIPEDRIVE_API_TOKEN`
- `TIMELINES_API_KEY` — WhatsApp send/receive
- `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`
- `GOOGLE_CALENDAR_*` — OAuth tokens for calendar
- `NEXT_PUBLIC_APP_URL=https://project-7e87w.vercel.app`

---

## 10. The Timelines Webhook

Timelines sends `POST /api/whatsapp/webhook` for every WhatsApp event.

**Payload shape** (key fields):
```json
{
  "event": "message.received",
  "message": {
    "uid": "abc123",
    "text": "Hello",
    "from_me": false,
    "sender_phone": "+13051234567",
    "recipient_phone": "+13057784861",
    "timestamp": 1714500000,
    "has_attachment": false,
    "message_type": "text",
    "attachment_url": null,
    "attachment_filename": null,
    "status": "delivered"
  },
  "chat": {
    "id": 999,
    "phone": "+13051234567",
    "name": "John Smith",
    "jid": "13051234567@s.whatsapp.net",
    "is_group": false,
    "whatsapp_account_id": undefined  ← OFTEN MISSING
  }
}
```

**Panel detection logic** (in `resolvePanel()`):
- `chat.whatsapp_account_id` ends in `7185505500` → 718
- `chat.whatsapp_account_id` ends in `3057784861` → 305
- Inbound: `message.recipient_phone` is our number → match that
- Outbound: `message.sender_phone` is our number → match that
- Also checks `chat.jid` as last resort

---

## 11. Active Git Log (last 12 commits)
```
699cf33  fix(mic): replace OpenAI Whisper with browser Web Speech API
(latest) fix: correct model IDs and invite page meeting_type branding
           - concierge/route.ts: claude-haiku-4-5 → claude-haiku-4-5-20251001
           - webhook/route.ts: same wrong model in priority classifier
           - invite/[token]/page.tsx: fetch meeting_type; show correct branding
(latest) fix: top bar buttons always visible; remove finished_early dead code
           - TopBarConcierge: removed opacity:0.55 dim when no thread active
           - ConciergeButtons: removed finished_early from type + modal title
4bcaf9e  refactor(template): extract Terminal HTML into swappable TEMPLATE constant
1517184  fix: correct model IDs and invite page meeting_type branding
699cf33  fix(mic): replace OpenAI Whisper with browser Web Speech API
5571477  docs: add UI design principles to HANDOFF
ca1552f  style: compact TodayPanel cards to single row; enlarge BookingsPanel tabs
052fd8d  fix(bookings): accept channels[] array from BookingsPanel multi-select
0e577ef  fix: top bar buttons always visible; remove finished_early dead code
2638b07  fix: remove Early button from meeting cards, fix top bar button visibility
50f3b14  fix: unblock webhook — exclude /api/ from reprime-terminal.com redirect
1c2dc4d  feat: top-bar concierge, panel swap, meeting reminders
```

### Key model ID — all Anthropic calls use:
`claude-haiku-4-5-20251001` — this is the correct versioned ID.
`claude-haiku-4-5` (without date) returns 400 errors. Do not use it.
Files that call Anthropic: `api/ai/concierge/route.ts`, `api/ai/draft/route.ts`, `api/whatsapp/webhook/route.ts`.

---

## 12. How to Start Next Session

Open a new chat. Say:

> "Read HANDOFF.md at C:\reprime-command-center\dashboard\HANDOFF.md first, then read the current state of any file you need before touching it. The project is the RePrime Command Center dashboard."

Then describe what you want to work on. The handoff doc has full context.
