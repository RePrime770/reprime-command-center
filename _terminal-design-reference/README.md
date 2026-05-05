# Terminal & Invitation Reference Library

Permanent reference store for everything related to the **Terminal invitation flow**, **regular meeting requests**, and **WhatsApp invitation behavior**. Future sessions: read this directory first before touching any invite/meeting code.

## Locked brand tokens (May 4, 2026 final package)

**One gold:** `#FFCC33` (Imperial Gold)
**One navy:** `#0E3470`
**Cream paper:** `#F4EEE0` (with gradient stops `#F8F0DA` → `#EFE2C4` for bubbles/letters)

**Hierarchy comes from opacity, never from a different gold hex.**

**Authoritative tokens file:** `brand/design-tokens.ts` — exports `REPRIME_BRAND` with named tokens (`navySurfaceDeep`, `navyBorder`, `goldLine22/30/35/18`, `goldFill04/08`, `creamTop/Bottom`, `bronzeBold/Soft`, font and typography tokens, taper-stops). Use these named tokens in code instead of inventing new hexes.

**Codebase tokens file:** `dashboard/lib/design-tokens.ts` — what application code actually imports. Re-exports `GOLD`, `NAVY`, `CREAM`, `gold/navy` opacity scales. Aligned with the authoritative version but adapted to the dashboard's import patterns.

## Structure

### Root — the 5 locked invitation flow screens (the May 4 FINAL package)

These supersede the old Page1/Page2/Page3 naming. Open in a browser to preview the recipient experience.

| File | What it is |
|---|---|
| `00_Email_Page.html` | The email body the recipient sees in their inbox — full Terminal Introduction layout |
| `01_Screen1_OG_Card.html` | The WhatsApp OpenGraph link-preview tile — what shows above the URL when the invite is sent via WhatsApp |
| `02_Screen2_Booking.html` | The booking page — recipient picks a slot from suggested times or a week calendar |
| `03_Screen3_Confirmation.html` | The post-booking confirmation page — cream letter, Add Attendee field, calendar buttons, Zoom credentials, reschedule link |
| `04_Screen4_WhatsApp_Confirmation.html` | The WhatsApp message sent back to the recipient after they confirm — short visual confirmation |

Plus:
- `mockup_investor_profile_slide_in.html` — investor profile slide-in mockup (separate feature, not invitation flow)

### `brand/` — single source of visual truth
- `TerminalLogo.jsx` — React component, exports `REPRIME_BRAND` tokens
- `design-tokens.ts` — authoritative TS tokens file (named tokens, opacity ladder, fonts, taper stops)
- `terminal-logo-wide.svg` — primary 800×320 wordmark
- `terminal-logo-square.svg` — 1024×1024 medallion (favicon, app icon, WhatsApp avatar)
- `terminal-logo-cream.svg` — paper variant
- `terminal-logo-monochrome.svg` — single-color variant
- `preview.html` — visual sign-off file
- `CLAUDE_CODE_MIGRATION_BRIEF.md` — May 3 Imperial Gold migration spec

### `briefs/`
Spec docs that define behavior, integration, and copy. The most authoritative is `RePrime_Invitation_Flow_FINAL_Package.docx` (May 4 final). Earlier briefs (`RePrime_Invitation_Flow_Handoff_Brief.docx`, `RePrime_Invitation_Flow_Continuation_Brief.docx`) are historical and superseded for design/copy purposes; they remain for context.

### `playbooks/`
Operational playbooks for how the Terminal is used day-to-day.

### `whatsapp/`
- `RePrime_WhatsApp_OG_Developer_Brief.docx` — defines the OpenGraph / link-preview card behavior in WhatsApp (now formalized as `01_Screen1_OG_Card.html` at root)
- `whatsapp_invite_preview.html` — earlier visual mockup of how the invite link renders inside iPhone WhatsApp dark mode
- `WhatsApp CRM for a Solo CRE Operator on a Personal Number.md` — research

## Key rules (excerpt — full rules in `briefs/RePrime_Invitation_Flow_FINAL_Package.docx`)

- Two flow variants share this design system: **Terminal Introduction** (default) and **Meeting Request**. Same visual structure, different copy.
- Banned across both: "AI", "booked", "schedule a meeting", "hop on a call", "quick chat", "sync up", em-dash bullets, marketing numbers ("3,000+ transactions", "$15 billion deployed").
- Terminal duration locked at 30 min. Regular Meeting duration variable: chip row `10 / 20 (default) / 30 / 45 / 60 / Custom`.
- Confirm line at bottom uses dynamic duration on regular meetings (e.g., "Twenty minutes" / "One hour").
- Wordmark fonts: **Cinzel SemiBold (TERMINAL)** + **EB Garamond Italic ("by RePrime")**. Load via Google Fonts.
- Internal dashboard text uses Poppins (sans-serif regular) only — no italics, no Playfair body, no script fonts. Every AI-generated text block has a Listen button.
- Per-recipient unique booking link — each `/api/invitations` POST generates a fresh UUID, never reused.
- Cross-channel block — one block hits 305 + 718 + SMS + email for the same person.
