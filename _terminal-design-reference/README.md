# Terminal & Invitation Reference Library

Permanent reference store for everything related to the **Terminal invitation flow**, **regular meeting requests**, and **WhatsApp invitation behavior**. Future sessions: read this directory first before touching any invite/meeting code.

## Locked brand tokens (May 3, 2026 migration)

**One gold:** `#FFCC33` (Imperial Gold)
**One navy:** `#0E3470`
**Cream paper:** `#F4EEE0` (with gradient stops `#F8F0DA` → `#EFE2C4` for bubbles/letters)

**Hierarchy comes from opacity, never from a different gold hex.** Anywhere a previous design used a darker gold for "muted" text, that becomes `#FFCC33` at reduced opacity instead.

| Use | Token / value |
|---|---|
| Primary brand gold | `#FFCC33` |
| Mid emphasis text | `rgba(255, 204, 51, 0.85)` |
| Muted footer text | `rgba(255, 204, 51, 0.55)` |
| Surface elevation (deeper navy) | `rgba(14, 52, 112, 0.85)` (replaces old `#0A1F44`) |
| Border on navy surface | `rgba(14, 52, 112, 0.70)` (replaces old `#1A3560`) |
| Cream-bubble label (italic prefix) | `rgba(14, 52, 112, 0.55)` — navy on cream, NOT gold |
| Cream-bubble bold name | `#0E3470` solid |

**Source of truth:**
- TypeScript: `dashboard/lib/design-tokens.ts` — import `{ GOLD, NAVY, gold, navy, REPRIME_BRAND }` everywhere
- React: `_terminal-design-reference/brand/TerminalLogo.jsx` — exports the same `REPRIME_BRAND` shape
- CSS: `dashboard/app/globals.css` — exposes `--rp-gold`, `--rp-navy`, etc.

**Rule going forward: zero new navy or gold hex values in the codebase.** All variations come from the single brand values via opacity.

## Structure

### Root (canonical, locked designs)
The three reference HTML pages — copy/visual must match these exactly when porting to Next.js. Open in a browser to preview the recipient experience.

> ⚠ The three locked HTML pages still contain the legacy gold tokens. They will be migrated to Imperial Gold in a separate pass once the dashboard sweep has been validated in production.

- `Page1_Base_Email.html` — base invitation email / landing page
- `Page2_Confirmation.html` — slot-confirmed confirmation page (cream letter, Add Attendee, calendar buttons, Zoom credentials, reschedule link)
- `Page3_Choose_Time.html` — week-grid free-form scheduling page
- `mockup_investor_profile_slide_in.html` — investor profile slide-in mockup (already on Imperial Gold)

### `brand/` — single source of visual truth
- `TerminalLogo.jsx` — React component with corrected viewBox (the v1 was clipping the L). Exports `REPRIME_BRAND` tokens.
- `terminal-logo-wide.svg` — primary 800×320 wordmark (use for email hero, web hero, broker letterhead, LOI cover, brass plaque artwork)
- `terminal-logo-square.svg` — 1024×1024 medallion (use for WhatsApp avatar, favicon, app icon, social profile)
- `terminal-logo-cream.svg` — paper variant for cream-paper contexts
- `terminal-logo-monochrome.svg` — single-color variant for fax / emboss / monochrome printing
- `preview.html` — visual sign-off file
- `CLAUDE_CODE_MIGRATION_BRIEF.md` — the May 3, 2026 migration spec (authoritative reference)

The active dashboard logo files at `public/icon.svg` and `public/brand/TERMINAL_logo_master.svg` are copies of `terminal-logo-square.svg` and `terminal-logo-wide.svg`. Old versions are preserved at `public/legacy/` — do not delete.

### `briefs/`
Spec docs that define behavior, integration, and copy. The most authoritative is `RePrime_Invitation_Flow_Handoff_Brief.docx` — read that for the locked design system, copy rules, backend integration spec, and edge-state wording. Note: the brief's color palette is the pre-migration palette; the `brand/CLAUDE_CODE_MIGRATION_BRIEF.md` supersedes it for color values only.

### `playbooks/`
Operational playbooks for how the Terminal is used day-to-day.

### `whatsapp/`
- `RePrime_WhatsApp_OG_Developer_Brief.docx` — defines the OpenGraph / link-preview card behavior in WhatsApp
- `whatsapp_invite_preview.html` — visual mockup of how the invite link renders inside iPhone WhatsApp dark mode
- `WhatsApp CRM for a Solo CRE Operator on a Personal Number.md` — research on running a CRE WhatsApp CRM from a personal number

## Key rules (excerpt — full rules in `briefs/RePrime_Invitation_Flow_Handoff_Brief.docx`)

- Two flow variants share this design system: **Terminal Introduction** and **Meeting Request**. Same colors, fonts, spindle header, cream bubble, slot buttons, footer.
- Terminal-specific elements removed for Meeting Request: "Private Introduction" label → "Meeting Request" (placed below the name), "Private Membership · By Invitation Only" block removed entirely.
- Banned words across both: "AI", "booked", "schedule a meeting", "hop on a call", "quick chat", "sync up", em-dash bullets, marketing numbers ("3,000+ transactions", "$15 billion deployed").
- Terminal duration locked at 30 min. Regular Meeting duration variable: chip row `10 / 20 (default) / 30 / 45 / 60 / Custom`.
- Confirm line at bottom uses dynamic duration on regular meetings (e.g., "Twenty minutes" / "One hour").
- Wordmark fonts: Cinzel SemiBold (TERMINAL) + EB Garamond Italic ("by RePrime"). Load via Google Fonts.
- Internal dashboard text uses Poppins (sans-serif regular) only — no italics, no Playfair body, no script fonts. Every AI-generated text block has a Listen button.
