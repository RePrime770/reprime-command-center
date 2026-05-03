# RePrime Brand Color Migration — Claude Code Execution Brief

**Status:** Approved by Gideon Gratsiani · ready to execute on his confirmation
**Date approved:** May 3, 2026
**Owner:** Claude Code (handed off from co-founder Claude conversation)

---

## CRITICAL — READ FIRST

**You must NOT make any file edits until Gideon has explicitly confirmed.** Gideon's instruction to me, verbatim: *"Ask him to confirm and tell me what he's going to do before he does it so we're aligned."*

Your first action when picking this brief up:

1. Read this entire brief.
2. Run a dry-run scan of the file list in §4 below (use grep / ripgrep — do NOT edit anything).
3. Produce a numbered summary report showing exactly which files contain which legacy hex values, line counts per file, and your proposed change list.
4. Present the report to Gideon and wait for an explicit `"approve"` (or equivalent confirmation like `"go"`, `"yes execute"`, `"proceed"`).
5. Only after explicit approval, begin Phase 1.
6. After each phase completes, report back and wait for confirmation before starting the next phase.

If anything in the file list is missing or your scan finds additional files with legacy hex values that aren't in this brief, list them in your report and ask Gideon how to handle them. Do not assume.

---

## 1. The Decision

**New brand gold: `#FFCC33` — Imperial Gold.** Single solid hex. Replaces every previous gold value in the entire RePrime brand system.

Why this hex: chosen by Gideon after a six-round expert-grounded design process. It is the maximum-saturation gold that still reads as gold (rather than pure yellow), warm-shifted slightly into orange territory like real photographed metal, bright enough to read luminous on navy without gradient effects, distinctive enough to claim a category position no CRE incumbent occupies.

**Brand navy stays `#0E3470`.** Unchanged.

**One gold rule.** Hierarchy is created via opacity (0.7, 0.85, 0.92), never by switching to a different gold hex. Anywhere a previous design used a darker gold for "muted" text, that becomes `#FFCC33` at reduced opacity instead.

---

## 2. Color Migration Map

Search for these legacy hex values and replace with the new spec. **Match in any case (`#ffcc33` / `#FFCC33` / `#FFcc33` are all the same value).**

### Gold values → `#FFCC33`

| Legacy hex | Source | Replacement |
|---|---|---|
| `#BC9C45` | Brand skill antique gold | `#FFCC33` |
| `#FFD700` | Email primary gold | `#FFCC33` |
| `#FFEC8A` | Email spindle peak | `#FFCC33` |
| `#E8B840` | Email secondary, dot, confirm text | `#FFCC33` at opacity 0.85 |
| `#A88B40` | Email footer muted | `#FFCC33` at opacity 0.55 |
| `#7A5A30` | Email bubble label italic | `#0E3470` at opacity 0.55 (this is on cream — should be navy not gold) |
| `#5A3F18` | Email bubble label name | `#0E3470` (navy on cream) |
| `#E8C96D` | WhatsApp primary | `#FFCC33` |
| `#C4A84E` | WhatsApp mid | `#FFCC33` at opacity 0.85 |
| `#B09040` | WhatsApp warm | `#FFCC33` at opacity 0.70 |
| `#A08A3E` | WhatsApp muted | `#FFCC33` at opacity 0.55 |
| `#5A4822`, `#4A3820` | WhatsApp dark dividers | leave as-is (not gold, structural dark) |
| `#D4AF37` | (Aureus reference, may not be deployed) | `#FFCC33` if found |
| `#E5C158`, `#EAC74C`, `#F2C84B` | (Earlier iterations, may not be deployed) | `#FFCC33` if found |

### Navy unification

| Legacy hex | Source | Replacement |
|---|---|---|
| `#07101E` | WhatsApp OG card very-dark navy | `#0E3470` |
| `#091E3F` | Some older homepage gradient stops | `#0E3470` |
| `#091d42` | Older gateway gradient stops | `#0E3470` |

All other navy variants (`#0E3470` itself, `#1D5FB8` secondary blue, etc.) stay as they are.

### Specific exceptions (do NOT change)

- `#1D5FB8` — secondary blue, stays
- `#00A1FF` — bright blue accent, stays
- `#009080` — teal, stays
- `#00A980` — success green, stays
- `#FF7474`, `#F70000` — alert red, stays
- `#FFBC7D` — amber accent, stays
- `#C8C8C8` — gray, stays
- All shades of cream (`#F4EEE0`, `#F5EFE2`, `#F8F0DA`, `#EFE2C4`) — stay
- All shades of black/white — stay

---

## 3. Logo File Replacement

**Old logo files (in `/mnt/project/` and any deployed assets):**
- `TERMINAL_logo_256px.png`
- `TERMINAL_logo_512px.png`
- `TERMINAL_logo_640px_whatsapp.png`
- `TERMINAL_logo_1024px.png`
- `TERMINAL_logo_2048px.png`
- `TERMINAL_logo_4096px.png`

These show TERMINAL as a circular medallion in old gold (#BC9C45-ish). They must be regenerated using the new `TerminalLogo` and `TerminalLogoSquare` components.

**New logo source files (delivered with this brief):**
- `terminal-logo-wide.svg` — primary wide format (680×320)
- `terminal-logo-square.svg` — circular medallion (1024×1024) for WhatsApp/favicon/app icon
- `terminal-logo-cream.svg` — cream paper variant
- `terminal-logo-monochrome.svg` — single-color for fax/emboss
- `TerminalLogo.jsx` — React component (single source of truth)

Generate PNG exports of `terminal-logo-square.svg` at: 256, 512, 640 (WhatsApp), 1024, 2048, 4096. Write to the same paths as the old files so any code referencing those paths continues to work. **Verify the old PNGs are renamed/moved to a `legacy/` subfolder before overwrite — do not delete them.**

Use a tool like `rsvg-convert`, `inkscape --export-type=png`, or `sharp` (Node) for SVG→PNG. Whatever the build pipeline already uses.

---

## 4. Files to Update — The Scan List

Run a dry-run scan against this list first. Report findings to Gideon. Wait for approval.

### Phase 1 — Brand foundation (do first, blocks everything else)

```
/mnt/skills/user/reprime-brand/SKILL.md
```

Change the brand-gold table row from:
```
| Brand Gold | Gold | `#BC9C45` | (188, 156, 69) | Primary accent — section dividers, key metrics, emphasis |
```
to:
```
| Brand Gold | Imperial Gold | `#FFCC33` | (255, 204, 51) | Primary accent — section dividers, key metrics, emphasis. Single gold across all surfaces; hierarchy via opacity, never via additional gold hexes. |
```

Also update the CSS custom properties block — change `--rp-gold: #BC9C45;` to `--rp-gold: #FFCC33;`.

### Phase 2 — Member-facing surfaces (highest priority after brand foundation)

```
RePrime_Base_Email.html
```

This file uses the most legacy gold values. Apply the migration map to every gold hex in the CSS and inline SVG gradient stops. The two `<linearGradient id="g1">` and `<linearGradient id="g2">` spindle gradients at the top of the file currently go `navy → #FFD700 → #FFEC8A → #FFD700 → navy`. Update both to `navy → #FFCC33 → #FFCC33 → #FFCC33 → navy` (uniform gold body, structural fade to navy at endpoints — NO peak hotspot, per Gideon's "one gold" rule).

```
WhatsApp OG card source files (per RePrime_WhatsApp_OG_Developer_Brief.docx)
```

Find the JSX/React file the brief instructs deployment from. Apply the migration map. Replace `#07101E` background with `#0E3470` (unify navy across surfaces).

### Phase 3 — Platform components

Run `grep -rn -i -E "#(bc9c45|ffd700|ffec8a|e8b840|a88b40|e8c96d|c4a84e|b09040|a08a3e|d4af37|e5c158|eac74c|f2c84b|07101e|091e3f|091d42)" /mnt/project/` to find every JSX file that needs updating. Expected files include but are not limited to:

```
/mnt/project/2_Code1_Investor_Terminal.jsx
/mnt/project/3_Code2_Broker_Portal.jsx
/mnt/project/terminal-vision-v4.jsx
/mnt/project/reprime-v3.jsx
/mnt/project/investor_terminal_v2_final.jsx
/mnt/project/data_room_tab.jsx
/mnt/project/deal_lock_mechanism.jsx
/mnt/project/seller-financing-flow.jsx
/mnt/project/broker-deal-timeline.jsx
/mnt/project/reprime-homepage.jsx
/mnt/project/investor-gateway.jsx
/mnt/project/investor-gateway-v2.jsx
/mnt/project/reprime_decision_tool.jsx
/mnt/project/reprime_readable_three.jsx
```

For each, replace legacy gold hex values according to the migration map. **Most files should also be updated to import `{ REPRIME_BRAND }` from the new `TerminalLogo.jsx` and reference `REPRIME_BRAND.gold` rather than hard-coding the hex.** This protects against future drift.

### Phase 4 — Documentation and briefs

Update the .docx briefs only if Gideon explicitly approves. These are reference documents; updating them is optional cleanup. Files:

```
/mnt/project/RePrime_WhatsApp_OG_Developer_Brief.docx
/mnt/project/RePrime_Invitation_Flow_Continuation_Brief.docx
/mnt/project/RePrime_Invitation_Flow_Handoff_Brief.docx
/mnt/project/RePrime_WhatsApp_OG_Final_Brief.docx
/mnt/project/RePrime_WhatsApp_Flow_Developer_Brief.docx
/mnt/project/RePrime_WhatsApp_Screen2_Booking.html
/mnt/project/RePrime_WhatsApp_Screen3_Confirmation.html
```

These describe the OLD color system. After implementation, they become misleading. Recommend updating the live HTML files (`Screen2_Booking.html`, `Screen3_Confirmation.html`) to the new spec. The .docx briefs can stay as historical record; flag with a banner at top: *"Color spec superseded May 3, 2026 — see brand skill for current."*

---

## 5. Verification Steps (After Each Phase)

After each phase, run:

```bash
grep -rn -i -E "#(bc9c45|ffd700|ffec8a|e8b840|a88b40|e8c96d|c4a84e|b09040|a08a3e|d4af37|07101e)" \
  /mnt/project/ \
  /mnt/skills/user/reprime-brand/ \
  ./src/ 2>/dev/null
```

Expected result after Phase 4 complete: **zero matches** in any source file (matches in legacy/ archive folder are fine; matches in .docx historical briefs are acceptable if banner-marked).

Visual check: render the email locally and the WhatsApp OG card preview, screenshot them, send to Gideon for visual confirmation that the new gold reads correctly. Specifically check:
- Does TERMINAL in the email header read as bold gold against navy? (Should: yes, more vivid than before.)
- Does the spindle gradient still look like a graceful fade or has it become flat? (Should: still graceful fade — only the peak color changed, the structure didn't.)
- Does the WhatsApp avatar at 64px still read clearly? (Should: yes — the high saturation of `#FFCC33` actually improves small-size legibility over the previous muted gold.)

---

## 6. Mandatory Confirmation Protocol

**Before any edit:** present a dry-run summary to Gideon:

```
Hi Gideon — here's what I'm about to change. Confirm before I proceed.

PHASE 1 — Brand foundation (1 file)
  /mnt/skills/user/reprime-brand/SKILL.md
    line 21: replace `#BC9C45` → `#FFCC33`
    line 21: rename "Gold" → "Imperial Gold"
    line 132: replace `--rp-gold: #BC9C45` → `--rp-gold: #FFCC33`

PHASE 2 — Email & WhatsApp (2 files)
  RePrime_Base_Email.html
    14 instances of `#FFD700` → `#FFCC33`
    2 instances of `#FFEC8A` → `#FFCC33`
    [...etc with line numbers...]

PHASE 3 — Platform JSX (N files, M instances)
  [list each file with hex counts]

Reply 'approve' to execute Phase 1 only. I'll report back and wait for next approval.
```

Do not batch all phases into one approval. Phase-by-phase confirmation. This protects against any unintended scope expansion mid-edit.

---

## 7. Final Logo Specification (For Reference)

**Wordmark:** TERMINAL · Cinzel SemiBold (weight 600) · 100px · letter-spacing 14.5px (~0.145em) · solid fill `#FFCC33`

**Cartouche rules:** two horizontal rules above and below the wordmark · 540px wide × 2px tall · solid `#FFCC33` body with structural fade to transparent at the last 6% of each end (linearGradient: stop 0% opacity 0, stop 6% opacity 1, stop 94% opacity 1, stop 100% opacity 0)

**Attribution:** "by RePrime" · EB Garamond Italic · 27px · letter-spacing 1.4 · fill `#FFCC33` · opacity 0.9

**Field:** navy `#0E3470`

**No closing dot. No gradient on letters. No shadows. One solid color throughout.**

Cinzel and EB Garamond load via Google Fonts:
```
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=EB+Garamond:ital,wght@1,400&display=swap" rel="stylesheet">
```

Cinzel is Trajan-derivative — Roman inscriptional capitals from 113 AD. EB Garamond is Claude Garamond's Renaissance face from the 1530s, the typeface of the first printed balance sheets in institutional finance history.

---

## End of Brief

Confirm receipt with Gideon. Run the dry-run scan. Present findings. Await approval. Begin Phase 1 only after explicit approval.
