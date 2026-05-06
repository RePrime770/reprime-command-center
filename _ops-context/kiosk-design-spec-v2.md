# Kiosk Design Spec v2 — Research-Driven Rebuild of `/center`

**Author:** code37 (Wave 9 — KIOSK DESIGN-DRIVEN REBUILD)
**Date:** 2026-05-05
**Branch:** `feat/kiosk-design-rebuild`
**Status:** PHASE 1 — Brief for Gideon's review. Implementation does not start until he approves.

---

## TL;DR (Speechify-friendly prose)

The current `/center` is four equal text columns. It is correct as a data list, wrong as a command surface. A command surface must have one obvious thing the operator does next. A list does not.

The rebuild keeps everything that already works (the same Pipeline, Inbox, Bucket, Crew, Investors data) and changes only the visual layer. The new layer is a top HUD strip with KPI cards plus six big action buttons, a tile grid in the upper canvas where each active deal and each top investor and each live thread is its own large clickable square, a centered voice mic as the hero of the screen, four colored WhatsApp panels pinned across the bottom, and an embedded browser strip below that for opening Perplexity, Pipedrive, Gmail, CoStar, and Inforuptcy without leaving the kiosk. Reading panels switch from pure dark navy to a cream-tinted reading background. Type switches from the current Poppins to Lexend (a font built specifically for dyslexic readers, published by Google, evidence-backed). Brand chrome stays Imperial Gold and Brand Navy. Channel and status colors stay exactly as the meaning-based palette already locked in `globals.css`.

The rebuild ships first to `/center/v2` so the live kiosk at `/center` stays usable during review. Once Gideon approves the visuals on `/center/v2`, the route is swapped.

---

## 1. The research and what it actually says (cited, not hand-waved)

### 1.1 Bloomberg Terminal — the right shape, not the right density

> "The longstanding four-panel maximum in the desktop layout has gone away, and the Terminal has moved toward a tabbed panel model where users can fully customize their workflow by displaying an arbitrary number of tabs or windows on their screen(s)."
> — Wikipedia, *Bloomberg Terminal*

Bloomberg's classic four-panel grid is the closest visual analogue to what `/center` already is. But two facts matter for the rebuild:

1. Bloomberg is a *trader's* interface — every cell is dense data because the operator is reading numbers, not deciding actions. Gideon's `/center` is the inverse — he is deciding actions on a relatively small set of named entities (eight to fifteen active deals, fifty-ish active investors, four WhatsApp inboxes). Bloomberg's micro-fonts and grids would be wrong here.
2. Bloomberg itself moved away from the four-panel maximum. It is a tabbed-window model now. The lesson is: the four equal columns are not load-bearing — what's load-bearing is the dense-information surface plus a command line.

**Take:** Keep Bloomberg's pattern of "everything visible in one frame, no nav clicks to get to data." Drop Bloomberg's micro-density. Replace text rows with tiles where each tile is a known entity Gideon already has a relationship with.

Source: [Bloomberg Terminal — Wikipedia](https://en.wikipedia.org/wiki/Bloomberg_Terminal); [Bloomberg UX — Designing the Terminal for Color Accessibility](https://www.bloomberg.com/ux/2021/10/14/designing-the-terminal-for-color-accessibility/); [Hacker News — "A great example of a really nice information dense app is the Bloomberg terminal"](https://news.ycombinator.com/item?id=19153875).

### 1.2 Apple Human Interface Guidelines — the iPhone home screen as a precedent

The iPhone home screen is the most-used tile-grid in the world. The HIG locks two numbers worth carrying:

> "Touch targets require minimum dimensions of 44×44 points as research demonstrates that smaller interactive elements result in 25% or higher tap error rates."
> — Apple HIG, *Layout*

> "Spacing uses 8pt grid increments consistent with HIG layout guidance."
> — Apple HIG, *Layout*

The iPhone tile grid uses 60×60 pt icons on an 8pt rhythm. Translated to a 1440-px-tall kiosk row, this means each tile in the upper canvas should be ~140 px on its short axis with 16-px gutters — comfortably above the 44-pt minimum, and large enough that Gideon (53 years old, big screen, reads with eyes for tile labels and ears for prose) can identify each tile at a glance.

**Take:** Build the upper canvas as a 6-column tile grid at 1280-px column width. Each tile ~150–200 px tall. Big rounded squares with the deal/investor/thread name in Lexend bold, a one-line status under it, a colored top bar for the channel or category. iPhone-home-screen rhythm.

Source: [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout); [iOS 26 Design Guidelines: Illustrated Patterns](https://www.learnui.design/blog/ios-design-guidelines-templates.html).

### 1.3 IBM Carbon Design System — fluid columns over fixed counts

> "Fluid column structures are ideal for editorial content, dashboards, images, video, data visualizations, etc. In each case, scaling the size of things is more useful to the user than scaling the number of visible things."
> — Carbon Design System, *2x Grid*

Carbon's specific guidance: when the screen gets wider, make the cells bigger; do not add more cells. Gideon runs a 5120 × 1440 right monitor. The current four-column 1fr layout follows this rule for the column count but gives every cell the same priority — there is no visual hierarchy, so everything looks equally important, which is the same as everything looking unimportant.

**Take:** Keep Carbon's fluid-scale principle. Add Carbon's missing piece — a hierarchy of cell sizes. The voice mic hero is 320 px. Tiles are ~180 px. WhatsApp panel cards are ~280 px tall. KPI cards in the HUD are ~120 px. The eye learns the hierarchy in two seconds and never has to re-scan.

Source: [IBM Carbon — 2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/); [IBM Design Language — 2x Grid](https://www.ibm.com/design/language/2x-grid/).

### 1.4 Dyslexia research — the strongest argument against pure dark navy reading panels

The British Dyslexia Association style guide is unambiguous:

> "Avoid white backgrounds as they can appear too dazzling, and use cream or a soft pastel colour instead. Use dark coloured text on a light (not white) background."
> — BDA Style Guide 2023

> "Line spacing of 1.5 is preferable. Use a plain, evenly spaced sans serif font … Font size should be 12–14 point. Use left-justified text with ragged right edge, and lines should not be too long: 60 to 70 characters."
> — BDA Style Guide 2023

The current kiosk uses:
- Pure `#0E3470` navy for reading surfaces with white text — high contrast (good) but dark mode for body text creates halation for some users, and there is published evidence that warm-tinted backgrounds raise reading speed for the dyslexic population. Gideon is dyslexic.
- Mixed font sizes from 11–22 px. Below the 14 px BDA floor in places.
- No standard line-height — most blocks are 1.4 or 1.45, BDA wants 1.5.

**Take:** Reading panels (anything with sentences — briefing summaries, AI recommendations, profile summaries, chat messages) get a cream-tinted background (`#F4EEE0` family — already a brand-locked token). Body type stays at 14 px floor, line-height 1.55. Brand chrome (top HUD strip, footer dock, tile borders, brand wordmarks) stays navy and gold — Gideon reads chrome by shape and color, not by parsing words, so brand colors are fine there.

Source: [British Dyslexia Association Style Guide 2023 (PDF)](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf); [Dyslexia-Friendly Style Guide — Worcester](https://www2.worc.ac.uk/disabilityanddyslexia/documents/British%20Dyslexia%20Association%20Style%20Guide.pdf); [Accessibility Tip — Dyslexia-Friendly Style Guide: Typeface (UBC)](https://ctl.ok.ubc.ca/2025/08/05/accessibility-tip-dyslexia-friendly-style-guide-typeface/).

### 1.5 Lexend — measured improvement over the current font

> "In one controlled experiment, students reading text in Lexend fonts achieved significantly higher words-correct-per-minute (WCPM) scores than when reading the same material in Times New Roman, with the improvement being statistically significant (p = 0.014)."
> — Teleprompter.com summary of the Shaver-Troup research

> "90% of readers had better fluency scores with Lexend font than Times New Roman, with reading fluency performance improved by 19.8%."
> — Artha Learning summary

Lexend was created specifically for dyslexic readers. Google publishes it on Google Fonts, free, with the full weight axis. Gideon's settings panel already exposes a "letter-spacing" preference (per `code30`'s Settings work), which means Lexend's variable axis (Lexend / Lexend Deca / Lexend Mega / Lexend Giga / Lexend Tera) plugs in cleanly — bigger letter-spacing variants for dense lists, the standard variant for reading prose.

The current dashboard uses Poppins. Poppins is a neutral geometric sans — fine, but not optimized for dyslexia. The published evidence on Lexend is stronger than the published evidence on Poppins for this audience.

**Take:** Switch internal-dashboard body type from Poppins to Lexend. Keep the brand wordmark fonts (Cinzel for "TERMINAL", EB Garamond for "by RePrime") — those are the locked Terminal-recipient brand fonts and are not body text. Keep Playfair Display only on Terminal-recipient pages, never in the kiosk. **Memory `font_and_tts_standard.md` says "Poppins regular only" for the kiosk** — this is the one rule I am proposing to revise, with citation. I am flagging it for Gideon to override or affirm.

Source: [Google Design — Struggling to Read? A Font May Help (Lexend)](https://design.google/library/lexend-readability); [Lexend.com — Change the way the world reads](https://www.lexend.com/); [Teleprompter — Effectiveness of Lexend and OpenDyslexic Fonts](https://www.teleprompter.com/blog/effectiveness-of-lexend-and-opendyslexic-fonts); [Eulexia — The Power of Lexend Font to Unlock Reading Potential for Dyslexics](https://eulexia.org/power-lexend-font-unlock-reading-potential-dyslexics/).

### 1.6 Color overlays and the warm-tint argument

> "Results using a double-blind protocol were consistent and measurable, proving objectively that reading through a correctly selected colored overlay can significantly improve reading speed and comprehension over an extended time period."
> — Wilkins / Cerium / Crossbow Education research

The mixed evidence on colored overlays for dyslexia generally favors **warm tints over cool tints, and warm tints over pure white** — but does not produce a single magic color. Cream is the safest empirical choice. Gideon's brand already includes a cream paper token (`#F4EEE0`, with gradient stops `#F8F0DA` and `#EFE2C4`). Using it as the reading-panel background lines up the dyslexia evidence with the existing brand system — no new color introduced.

**Take:** Reading-panel cream tint = brand cream. Zero new tokens.

Source: [PMC — The Effect of Colored Overlays on Reading Fluency in Individuals with Dyslexia](https://pmc.ncbi.nlm.nih.gov/articles/PMC4999357/); [Crossbow Education — Coloured Overlays and Visual Dyslexia](https://www.crossboweducation.com/dyslexia-coloured-overlays-and-visual-stress); [Frontiers — Effect of overlay but not electronic blue filters on reading time and eye movements of children with developmental dyslexia](https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2025.1508098/full).

### 1.7 Dark mode and long-session focus — the counter-evidence

> "Muted accent colours — softer highlights rather than high-saturation reds and whites reduce the contrast load on the eyes."
> — *How Dark Mode Interfaces Reduce Eye Strain*

> "For people with astigmatism, light text on dark backgrounds can cause halation … dark mode can actually increase strain rather than reduce it."

This is the case for keeping dark navy on the *chrome* (top HUD, footer dock, tile borders, voice mic ring, action buttons) — they aren't read as sentences, so halation is a non-issue, and the dark navy gives Gideon's brand the trader-grade feel he's after. The case *against* pure dark navy is only for sentence-length reading panels.

**Take:** Hybrid. Dark navy chrome + cream reading panels. This is the same pattern Bloomberg's accessibility-redesign team landed on for high-contrast reading-data display, and it matches the BDA guidance for dyslexia.

Source: [How Dark Mode Interfaces Reduce Eye Strain During Long Sessions](https://thiswaytoparadise.com/dark-mode-interfaces/); [Bloomberg UX — Designing the Terminal for Color Accessibility](https://www.bloomberg.com/ux/2021/10/14/designing-the-terminal-for-color-accessibility/) (referenced via Bloomberg's published accessibility post — direct fetch was 403; cited via the search engine excerpt).

---

## 2. Memory and constitution constraints — the hard rules I cannot override

These come from `~/.claude/CLAUDE.md` and the `memory/` directory and **win** over any research finding that disagrees.

| Rule | Source | How v2 honors it |
|---|---|---|
| Imperial Gold `#FFCC33` + Brand Navy `#0E3470` only; cream `#F4EEE0` allowed | `imperial_gold_tokens.md` | Cream reading panels are existing brand cream. Zero new hexes. |
| Channel/status colors per the meaning palette | `meaning_based_color_palette.md` | Tile top-bars and WhatsApp panel frames consume `--c-channel-305`, `--c-channel-718`, `--c-channel-imsg`, `--c-channel-sms`, `--c-investor`, `--c-live-now`, `--c-warn`, `--c-fail`. No new color decisions. |
| Listen button on every AI text block | `font_and_tts_standard.md` | Every reading-panel block (briefing prose, AI summary, recommendation, transcript) ships with `<SpeakerButton text={…} />`. Tiles do not — they are entity labels, not AI prose. |
| Investor row click opens chat, not profile; profile only via dedicated "★ Open Profile" button | `investor_panel_chat_first.md` | Investor tile in upper canvas opens the WhatsApp chat in the dock. Tile expands to a window that has the chat *plus* a `★ Open Profile` button, never auto-profile. |
| Investor profile: last comm + AI summary + recommended next step are headline; timeline collapsed | `investor_profile_priority.md` | The `InvestorProfileWindow` already follows this. v2 does not change the profile internals. |
| Plain English in all internal text | `plain_english_standard.md` | All v2 chrome copy is plain English (verified — see mockup). |
| Many big buttons over toggles/dropdowns | `ui_density_preference.md` | Six big square action buttons in the HUD instead of one dropdown. KPI cards stand alone instead of stacking into a list. |
| One question at a time; no widget popups | `gideon_profile.md` | v2 does not add any modal that asks more than one question. |
| Edit, never rebuild | constitution | This rebuild is keeping the existing `slots.tsx`/`Canvas`/`PipelineColumn`/`BucketColumn`/`InboxColumn`/`CrewColumn`/`InvestorChatPanel` data + behavior intact. The visual chassis (`Canvas` → `CanvasV2`, `TopStrip` → `TopStripV2`, `VoiceShellFooter` → `VoiceMicHero`) is what changes. Existing column components mount inside the new chassis with prop changes, not internal rewrites. |
| Killed lines stay dead | constitution | I checked the read-list — no killed phrases are about to come back. |
| Banned numbers / banned positioning | constitution | No `$15B`, `3,000+`, `distressed` anywhere in v2 chrome. |
| Settings honored: TTS speed, Lexend font, letter-spacing | task instruction (code30 settings) | v2 reads `STORAGE_KEY` (`center:settings:v1`) and applies. New settings extend, not replace, code30's structure. |

---

## 3. The new visual model — plain English

Imagine sitting at the kiosk and looking at the screen as four bands stacked top to bottom.

**Band 1 — HUD strip (64–96 px tall, sticky to top.)** Navy background. On the far left, the color-meaning legend (already there). Center-left, four KPI cards — `Meetings today`, `Unread investor`, `Expiring invitations`, `Active deals`. Each card is one big number in gold and one tiny label in cream-on-navy beneath it. Center-right, six big square action buttons — `Briefing`, `Cadence`, `Secretary`, `Settings`, `New Deal`, `New Note`. Each is 48 × 48 px with an icon and a one-word Lexend label below. Far right, identity picker plus health pill plus settings gear. The HUD is 100% width.

**Band 2 — Tile canvas (the iPhone-home-screen part, fills the upper half of the canvas, ~480 px tall).** Six columns wide. First two rows are deal tiles — Watermills, Bay Valley, IGA, Magna, Freeport, Rochelle, 500 Monroe, etc. — each tile a navy square with a colored top bar (gold for active, amber for at-risk, red for blocked), the deal name in Lexend Bold 18 px, the dollar amount on the second line, the stage on the third line. Click a tile, the WindowManager opens a deal-folder window with everything related (bucket items, reminders, related investors, related WhatsApp threads, files, deal docs, Pipedrive deep link). Third row is investor tiles — top eight cold investors from the cadence query, gold top bar, name in Lexend Bold, "last reply 12d ago" in cream. Click → opens the investor chat in the dock + the `★ Open Profile` button is in the chat header. Fourth row, if space, is "live thread" tiles — anyone with an unread message in the last 30 min, channel color top bar.

**Band 3 — Voice mic hero (sits centered between the tile canvas and the WhatsApp dock, ~200–240 px tall).** A single 160 × 160 px circle. Idle = navy fill, gold rim, 1 px gold ring, label below in Lexend says "Hold space to talk". Recording = pulsing gold rim, live transcript text below at 16 px. Stopped = brief amplitude bar replay then back to idle. The mic is always visible — never hides — because Gideon dictates everything. Around the mic, four small chips: TTS speed, mic key, language (EN / HE), and "Read briefing now" (which fires `SpeakerButton` over the briefing narrative). Replaces today's `VoiceShellFooter`.

**Band 4 — WhatsApp dock (pinned at the bottom, 280–320 px tall, full width).** Four cards side by side. `305` (amber top bar — color from `--c-channel-305`), `718` (green top bar), `iMessage` (blue top bar), `Investors` (gold top bar). Each card has the unread count in the top right, the most recent thread headline in Lexend, and a 1-line preview. Click the card → expands to a full WhatsApp chat in a window. Click a thread inside the card → opens that thread directly in chat. Investor card click goes to the `InvestorChatPanel` exactly per the existing rule.

**Band 5 — Embedded browser strip (collapsible, default collapsed, 40 px tall when collapsed, expands inline to 600 px when active).** A row of five tabs: `Perplexity`, `Pipedrive`, `Gmail`, `CoStar`, `Inforuptcy`. Click a tab → the strip expands above (pushing the WhatsApp dock down out of view) and renders an iframe of that tool inline. A `–` button on the right collapses it back. Re-uses the existing `WindowManager` + iframe code (the bucket-item and investor-profile windows already render iframes). This means Gideon never leaves the kiosk for a quick Pipedrive lookup or Perplexity search.

The point: **everything Gideon needs is on one screen, no back-and-forth, with a single hero (the mic) at the center.**

---

## 4. Color system v2

| Token | Hex | Where it appears |
|---|---|---|
| Brand Navy | `#0E3470` | Top HUD, footer dock, tile borders, voice mic ring, identity chip — the chrome |
| Imperial Gold | `#FFCC33` | Brand wordmark, KPI numbers, primary action buttons, mic ring rim, tile colored top bars where the entity is "investor / meeting" |
| Cream paper | `#F4EEE0` | Background of any reading panel — briefing prose, AI summary, recommendation card, profile summary, chat message bubbles in 718 panel, deal-folder window inner |
| Cream-top / Cream-bottom | `#F8F0DA` / `#EFE2C4` | Gradient inside cream panels (already used on Terminal recipient pages) |
| `--c-channel-305` | `#F0B400` | 305 panel top bar, 305 thread chips |
| `--c-channel-718` | `#25D366` | 718 panel top bar |
| `--c-channel-imsg` | `#0A84FF` | iMessage panel top bar |
| `--c-channel-sms` | `#FF9500` | SMS panel top bar |
| `--c-investor` | `#FFCC33` (alias of gold) | Investor panel + investor tiles |
| `--c-live-now` | `#A855F7` | Meeting starting / mic recording animation |
| `--c-warn` | `#F59E0B` | At-risk deal tiles, expiring invitations |
| `--c-fail` | `#EF4444` | Blocked deals, failed delivery, cold investor critical |

**Zero new tokens.** Every color above is already in `globals.css` or `lib/design-tokens.ts`.

---

## 5. Type system v2

Proposed:

| Use | Family | Weight | Size | Line-height |
|---|---|---|---|---|
| Reading prose (briefing, AI summary, chat messages) | **Lexend** (proposed change from Poppins) | 400 | 16 px floor | 1.55 |
| Reading prose — emphasis | Lexend | 600 | 16 px | 1.55 |
| Tile labels | Lexend | 600 | 18 px | 1.2 |
| KPI big numbers | Lexend | 700 | 36 px | 1.0 |
| HUD small caps labels | Lexend | 600 | 11 px | tracked +0.16em |
| Brand wordmark "TERMINAL" | Cinzel | 600 | varies | locked, tracking 0.145em |
| Brand wordmark "by RePrime" | EB Garamond Italic | 400 | varies | locked |
| Hebrew prose | Lexend (supports HE via Google Fonts subset) or fallback to system-ui-Hebrew | 400 | 16 px | 1.55 |

**Pushback:** memory `font_and_tts_standard.md` locks Poppins for the kiosk. I'm proposing Lexend instead because the published evidence specifically for dyslexia is stronger for Lexend, and Gideon's instruction in that memory was written before the Lexend evidence was surfaced. **This is the one decision I am explicitly flagging for Gideon's call.** If he affirms Poppins, v2 ships with Poppins — same layout, same everything else.

---

## 6. Voice mic as the hero — exact behavior

- **Idle:** 160 × 160 px circle, navy fill, gold 2-px rim, gold microphone glyph 56 px tall in center. Label below in Lexend 14 px cream-on-navy: `Hold space to talk`. Tooltip on hover: `Or click the mic. Or press Ctrl + Shift + V. Whichever is fastest.` (key choice obeys the existing `voice.micKey` setting).
- **Recording:** Rim pulses gold 2 px → 4 px → 2 px on a 1.4-s loop. Amplitude bars (8 vertical bars) appear under the label, live-driven by Web Audio API analyser node. Label changes to a live transcript: "you are saying: …".
- **Processing:** Rim is solid `--c-live-now` (violet). Label: `Thinking…`.
- **Done:** 800 ms flash of `--c-channel-718` (green) on the rim, then back to idle. The result is dispatched to the existing `VoiceModalsHost`.
- **Always visible.** Never collapses. Never hides behind a window. Never moves position. Always centered.
- **Around the mic:** four small Lexend chips at the corners — top-left `1.0× / 1.5× / 2.0× / 2.5×` TTS speed, top-right `EN / HE`, bottom-left `Read briefing` (fires SpeakerButton), bottom-right `Settings`.

---

## 7. Embedded browser surface — exact behavior

- **Strip closed:** 40 px tall row at the very bottom, above nothing (it is the lowest band when expanded, tucks under the dock when collapsed). Five chips left to right: `Perplexity`, `Pipedrive`, `Gmail`, `CoStar`, `Inforuptcy`. Each chip is Lexend 12 px, gold-on-navy, 32-px high, 16-px horizontal padding.
- **Strip open:** Tap chip → iframe of that URL slides up over the WhatsApp dock to ~600 px tall. Title bar at top says e.g. `Perplexity — research`. `–` button collapses it back. `↗` button opens the page in a new tab.
- **Re-uses existing code:** `WindowManager`'s registry pattern. New window key: `embedded-browser`. Single window — only one iframe at a time.
- **No auth handled here** — it is up to Gideon's existing browser session in those tabs. The kiosk itself is passwordless.
- **Cookies/login note:** Pipedrive, Gmail, CoStar require an existing logged-in session in the parent browser. If the iframe shows a login wall, the chip displays `↗ open in tab` instead of expanding.

---

## 8. Deal-folder tile — what clicking a deal tile does

Each deal in `briefing.active_deals` becomes a 200 × 200 px tile in band 2. Click → opens a `deal-folder` window via `WindowManager`. Window contents:

- **Header:** Deal name in Lexend Bold 22 px, value, stage, days-since-stage-change.
- **Tabs across top:** `Bucket items` (filtered by `assigned_to_deal=<id>` or tag), `Reminders` (filtered by deal), `Related investors` (Pipedrive contacts on this deal), `Threads` (WhatsApp threads tagged to this deal), `Files` (deal-room blobs), `Notes` (Gideon's free-form notes textarea).
- **Footer:** `↗ Open in Pipedrive` button.

This is a new component — `DealFolderWindow` — but it composes existing components (`BucketItemDetail`, `InvestorProfileWindow` mini, etc.) rather than reimplementing them.

The `useDealFolder(dealId)` hook: pulls related items by `deal_id` from existing tables. If the relation isn't tagged yet, the folder ships with empty tabs and a `link items to this deal` affordance — does not block the tile from being usable.

---

## 9. What stays exactly the same

To honor *edit, never rebuild*:

- `lib/center/slots.tsx` — same export shape. New chassis reads from it.
- `app/center/page.tsx` (current) — left untouched. v2 ships at `app/center/v2/page.tsx`.
- `PipelineColumn`, `InboxColumn`, `BucketColumn`, `CrewColumn` — same components, mounted inside the new chassis. The new chassis flows them into smaller side rails or the dock area, depending on Gideon's call after he sees the mockup.
- `InvestorChatPanel`, `InvestorProfileWindow`, `BucketItemDetail`, `SecretaryWindow`, `InvestorCadenceWindow`, `SettingsWindow` — same.
- `WindowManager`, `WindowTaskbar`, `ReminderToast`, `VoiceModalsHost` — same.
- All API routes (`/api/briefing/today`, `/api/calendar/today`, `/api/investors/cadence`, etc.) — same.
- All settings persisted under `center:settings:v1` — same key, additive new fields only.
- Color tokens — same. No new hexes anywhere.

---

## 10. What the rebuild adds (exhaustive list of new files)

```
app/center/v2/page.tsx                                  — v2 entry route
components/center/v2/TopStripV2.tsx                     — new HUD strip
components/center/v2/KpiCard.tsx                        — KPI tile component
components/center/v2/ActionButton.tsx                   — big square action button
components/center/v2/CanvasV2.tsx                       — band 2 + 3 + 4 layout shell
components/center/v2/TileGrid.tsx                       — band 2 grid container
components/center/v2/DealTile.tsx                       — single deal tile
components/center/v2/InvestorTile.tsx                   — single investor tile
components/center/v2/LiveThreadTile.tsx                 — single live-thread tile
components/center/v2/VoiceMicHero.tsx                   — band 3 mic hero
components/center/v2/MicAmplitudeBars.tsx               — Web Audio amplitude visual
components/center/v2/WhatsAppDock.tsx                   — band 4 dock layout
components/center/v2/WhatsAppPanelV2.tsx                — single WhatsApp panel card
components/center/v2/BrowserSurface.tsx                 — band 5 embedded browser
components/center/v2/BrowserChip.tsx                    — single browser chip
components/center/v2/DealFolderWindow.tsx               — deal-folder window content
hooks/useDealFolder.ts                                  — related-items query
lib/center/v2/tiles.ts                                  — tile data shape
lib/center/v2/embeds.ts                                 — embedded-browser registry
public/mockup-v2-after.html                             — Gideon's preview HTML (Phase 1)
public/mockup-v2-before.html                            — current state captured (Phase 1)
```

Every file is small and single-purpose. None of them rewrite existing logic. None of them touch the data layer.

---

## 11. Settings additions

Extend `CenterSettings` (additive):

```ts
display: {
  theme: ThemeMode
  font: 'lexend' | 'poppins'                  // NEW — default 'lexend'
  letterSpacing: 'normal' | 'wide' | 'wider'  // NEW — Lexend axis
  readingPanelTint: 'cream' | 'navy'          // NEW — default 'cream'
}
canvas: {
  showLiveThreads: boolean                    // NEW — default true
  embedTabs: ('perplexity'|'pipedrive'|'gmail'|'costar'|'inforuptcy')[]
}
```

Gideon can roll back to Poppins / pure-navy reading at any moment from Settings.

---

## 12. The hard rules I am observing in the rebuild

- **tsc clean** before push. Will run `pnpm tsc --noEmit` and `pnpm lint` before every commit.
- **Push to `feat/kiosk-design-rebuild`.** Shirel direct-merges.
- **Do not break `/center` for users mid-rebuild.** Ship to `/center/v2` first; switch `/center` over after Gideon approves visuals.
- **Settings honored.** Lexend / letter-spacing / TTS speed all wired through `STORAGE_KEY`.
- **Cream tinted reading.** Warm undertone, not pure white. Brand cream `#F4EEE0`.
- **Channel colors only for status.** 305 amber, 718 green, iMessage blue, SMS orange, Investor gold, Live violet, Warn amber, Fail red. Unchanged.

---

## 13. The two open questions I need Gideon's call on

These are the only two decisions I cannot make for him. Everything else is determined by the research + memory + spec.

> **Q1.** Lexend versus Poppins for kiosk body type. Lexend has stronger published evidence for dyslexia readability. Memory `font_and_tts_standard.md` currently locks Poppins. Do you want v2 on Lexend, or stay on Poppins?

> **Q2.** Reading-panel cream tint versus pure dark navy. Cream wins on the BDA dyslexia evidence and matches your brand cream. Pure navy is what `/center` looks like today. Do you want v2 on cream, or stay on navy?

I have a recommendation on both: **Lexend + cream** for the reading panels, **navy + gold** for the chrome. But I'm not shipping the change without you saying yes.

---

## 14. After Gideon approves — Phase 2 implementation order

1. Create `app/center/v2/page.tsx` mounting the same `slots.tsx` registry.
2. Build `TopStripV2` + `KpiCard` + `ActionButton` (chrome only — no behavior change).
3. Build `CanvasV2` shell with three bands (tile / mic / dock).
4. Build `DealTile` + `InvestorTile` + `LiveThreadTile` against existing `briefing.active_deals` / cadence / unread queries.
5. Build `VoiceMicHero` against existing `VoiceShell`.
6. Build `WhatsAppDock` + `WhatsAppPanelV2` mounting existing `InvestorChatPanel` / `Panel305` / `Panel718` content.
7. Build `BrowserSurface` + chip registry.
8. Build `DealFolderWindow` and register it in `WINDOW_REGISTRY`.
9. Settings additions.
10. tsc + lint clean. Push. Open PR. Gideon reviews. After approval, rename `/center` → `/center/v1` and `/center/v2` → `/center` in a single commit.

Estimate: 3–4 hours of focused implementation after the brief is approved.

---

## 15. Sources

Apple HIG. [Layout](https://developer.apple.com/design/human-interface-guidelines/layout). [Typography](https://developer.apple.com/design/human-interface-guidelines/typography). [Foundations](https://developer.apple.com/design/human-interface-guidelines/foundations).

IBM Carbon. [2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/). [IBM Design Language — 2x Grid](https://www.ibm.com/design/language/2x-grid/).

Bloomberg Terminal. [How Bloomberg Terminal UX designers conceal complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/). [Designing the Terminal for Color Accessibility](https://www.bloomberg.com/ux/2021/10/14/designing-the-terminal-for-color-accessibility/). [Wikipedia — Bloomberg Terminal](https://en.wikipedia.org/wiki/Bloomberg_Terminal).

Dyslexia. [British Dyslexia Association — Dyslexia Style Guide 2023 (PDF)](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf). [British Dyslexia Association Style Guide (Worcester PDF)](https://www2.worc.ac.uk/disabilityanddyslexia/documents/British%20Dyslexia%20Association%20Style%20Guide.pdf). [Accessibility Tip — Dyslexia-Friendly Style Guide: Typeface (UBC)](https://ctl.ok.ubc.ca/2025/08/05/accessibility-tip-dyslexia-friendly-style-guide-typeface/). [The Dyslexia-Friendly Style Guide (NZ)](https://ako.ac.nz/assets/Knowledge-centre/ALNACC-Resources/Dyslexia-resources/230907-Dyslexia-Friendly-Style-Guide.pdf). [A Comparative Study of Dyslexia Style Guides (ResearchGate)](https://www.researchgate.net/publication/347481260_A_Comparative_Study_of_Dyslexia_Style_Guides_in_Improving_Readability_for_People_With_Dyslexia).

Lexend / Shaver-Troup. [Google Design — Lexend Readability](https://design.google/library/lexend-readability). [Lexend.com](https://www.lexend.com/). [Teleprompter — Effectiveness of Lexend and OpenDyslexic Fonts](https://www.teleprompter.com/blog/effectiveness-of-lexend-and-opendyslexic-fonts). [Eulexia — The Power of Lexend Font](https://eulexia.org/power-lexend-font-unlock-reading-potential-dyslexics/). [The One Club — Let's End Dyslexia Through Lexend](https://www.oneclub.org/awards/adcawards/-award/43158/lets-end-dyslexia-through-lexend/).

Color overlays. [PMC — The Effect of Colored Overlays on Reading Fluency in Individuals with Dyslexia](https://pmc.ncbi.nlm.nih.gov/articles/PMC4999357/). [PMC — Physiological Parameters and Colour Modifications](https://pmc.ncbi.nlm.nih.gov/articles/PMC8146078/). [PMC — Colors, colored overlays, and reading skills](https://pmc.ncbi.nlm.nih.gov/articles/PMC4114255/). [Crossbow Education — Coloured Overlays and Visual Dyslexia](https://www.crossboweducation.com/dyslexia-coloured-overlays-and-visual-stress). [Frontiers — Effect of overlay but not electronic blue filters on reading time and eye movements of children with developmental dyslexia](https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2025.1508098/full).

Dark mode and eye strain. [How Dark Mode Interfaces Reduce Eye Strain During Long Sessions](https://thiswaytoparadise.com/dark-mode-interfaces/). [TradingView Dark Mode (Night Eye)](https://nighteye.app/tradingview-dark-mode/).

— code37
