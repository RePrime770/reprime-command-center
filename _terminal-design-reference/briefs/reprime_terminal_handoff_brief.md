# REPRIME CONTACT INTELLIGENCE TERMINAL — CONTEXT HANDOFF BRIEF

**Purpose:** This document is informational context, not a directive. It describes a single-file React artifact that was built, refined, and stress-tested across multiple conversation sessions. The current instance has accumulated this context. The receiving instance is free to make its own decisions, challenges, and course corrections based on Gideon's direct instructions. Nothing here overrides Gideon's authority; he makes all final calls.

---

## 1. THE OWNER

**Gideon Gratsiani.** Founder and owner of RePrime Group, a U.S. commercial real estate investment firm headquartered in Postville, Iowa, operating under reprime.com. 30+ years in CRE across distressed debt, foreclosure law (previously ran a firm with 6 attorneys for ~20 years), federal agency auctions, tax certificates, NPL acquisitions, and value-add deals. Works across all CRE asset classes — retail, multifamily, office, industrial, value-add. No niche qualifier; the word "distressed" is permanently banned as a descriptor for RePrime.

**Personal context that shapes how he works:**
- Orthodox Chabad with deep emunah and connection to the Rebbe's teachings
- Dyslexic with 150 IQ — processes information aurally via speech-to-text almost exclusively
- Heavy Israeli accent causes speech-to-text misrecognition; messages often contain garbled words that must be decoded for intent, not read literally
- Wife Shely is central; twins Mushka and Dovber, son Yosef Yitzchok; lost son Levi Yitzchak after 120 days
- Shirel Ben-Haroush is both sister-in-law and partner, treated like a daughter
- 30 years in the U.S.; bilingual English/Hebrew; ~20% of work is in Hebrew

**Operating preferences (hard rules):**
- One question at a time. Never stack multiple questions in a single turn.
- No empty validation. No "great point," "you're right," "absolutely." Substance only.
- Challenge his decisions when they conflict with best practice. Silent compliance is failure.
- Edit existing work — never rebuild from scratch unless told to.
- Speech-to-text means rough intent shaped by dyslexia and accent. Decode meaning, don't correct grammar.
- Seed to Forest: his messages are seeds; decode intent, elevate beyond what was asked, present an elevated vision with decision points, build only after confirmation.
- Match his intelligence — never first-draft thinking. Refine, elevate, push beyond obvious.
- Blackstone earnings style for business documents.
- Hebrew must be native Israeli business terminology, never literal translation.

---

## 2. THE ARTIFACT — WHAT IT IS

**Name:** RePrime Contact Intelligence Terminal (v1)

**Form factor:** Single-file React artifact running inside Claude.ai's artifact sandbox. Renders in the browser. Uses Tailwind arbitrary values, `window.storage` for persistence, imports React + PapaParse + lucide-react.

**Current state at time of this brief:** 4,728 lines, Babel-parse clean. File location: `/mnt/user-data/outputs/reprime_terminal_v1.jsx`.

**Gideon's mission:** He has 1,293 contacts accumulated across multiple phone migrations. Many are old investors he's lost touch with. He needs to identify every investor in that list so he can reconnect and notify them that RePrime is active again. Expected outcome: roughly 100-150 confirmed investors surfaced from the 1,293 total.

**Secondary mission after hunt:** Prioritize confirmed investors by A/B/C priority, assign each to a team member for outreach, generate a team report to hand to a secretary for execution.

---

## 3. THE BUILD JOURNEY

**Session 1 — Foundation.** Built the base Terminal with:
- CSV ingestion from 8 files (auto-detects by filename patterns: `*contacts_clean*`, `*enriched*`, `*discovered*`, `*new_*`)
- Union-find merge clustering across phone/email/name-token normalization
- Aliases preserved during merge via `_aliases_en` / `_aliases_he` arrays
- Left rail with hierarchical groups (INVESTORS, DEAL COUNTERPARTIES, DEAL PROSPECTS, COMMUNITY, TEAM)
- Cards view, Table view, Daily Queue view
- Right drawer with Section/Field components showing ~40+ data points per contact
- Status cycling (○ → ⌛ → ✓ → 📅 → 🎯 → ❌)
- Notes with history
- Priority chips (A/B/C)

**Session 2 — Investor heuristic.** Built `isInvestor()` function with 10 signals. Originally over-triggered (309/1293 = 23.9% investors). Tightened by removing:
- Signal 5 (bare `$` in preferences — caught brokers discussing fees)
- Signal 10 (deals_touched alone — caught every counterparty)

Current signals: explicit user classification override, INVESTOR tag, check_size_range populated, return_target present, strong capital language (`\bbalance\b|\bprincipal\b|\bnote holder\b|invested`), title keywords (`limited partner|capital partner|family office`), group code (A/B/C/Parked/A-Druk), known surnames (Druk, Engelberg, Friedman, Benchemhoun, Gottlib, Cohanowitch), red-flag payment/settlement language.

**Session 3 — Hunt Mode (the core).** Gideon pushed back hard on one-by-one classification being too slow for 1,200 contacts. Built batch-mode InvestorHuntView:
- Grid of 10/12/20/30 cards at a time
- Tap to select with gold border + checkbox
- Sticky action bar: "Selected = INVESTORS", "Selected = POSSIBLE", "Archive unselected", "Archive ALL — next batch"
- Keyboard shortcuts 1/2/3/4 + arrow navigation
- HuntCard shows name, phone, email, company, title, balance (if any), preferences snippet, last contact date
- Magnifying-glass icon opens HuntDetailOverlay showing ~45 fields for recognition (LinkedIn, office address, deals touched, introduced by, co-investors, first/last contact, email count, meetings, warmth, notes, source, aliases, merged record count)
- Completion summary when done: counts of Confirmed / Possible / Archived / Unknown
- Auto-populates three new left-rail groups: "⭐ HUNT: Confirmed investors", "⭐ HUNT: Possible investors", "📣 Reconnection list (hunt results)"

**Session 4 — Team roster + assignments.** Evolved over multiple turns:
- Initial: Steven, Shirel, Chaim, Adir, Jacob, Amelia, Motty, Gideon
- Gideon removed Amelia, Motty, Jacob
- Gideon added Guy (BDO) and Eyal (BDO) — note: "BDO" here is a video production context, not the accounting firm
- Final roster: Steven Philipp, Shirel Ben-Haroush, Chaim Abrahams, Adir Yonasi, Guy (BDO), Eyal (BDO), Gideon (me)
- Memory was updated to reflect the roster change (memory edit #21)
- Drawer's TEAM ASSIGNMENT section: dropdown for member, action (Call/Email/Schedule/Follow-up/Classify), priority (A/B/C), due date, notes

**Session 5 — Team Action Report.** Added a "Team Report" button in the header that generates a standalone HTML file:
- Grouped by team member
- Priority-sorted (A before B before C)
- Each contact shows persona guidance (tone, objective, hook, avoid)
- Downloads as `team_action_report_{YYYY-MM-DD}.html`
- Designed to hand to a secretary

**Session 6 — Storage hardening.** Discovered `window.storage` API quirks on mobile iOS artifact sandbox. Evolved in multiple passes:
- Initial: direct `window.storage.set(key, value, false)` calls silently failed
- Intermediate: showed scary red "STORAGE FAILED" banner that terrified Gideon
- Final: graceful degradation via `memStore` (in-memory Map) fallback + retry logic (3 attempts with backoff) + calm amber "Memory-only session" banner + prominent "Export now" button + proper error capture via `storageDebug` object
- `sGet` / `sSet` / `sList` / `sDelete` all dual-write to memStore + window.storage where available
- Self-test at init runs up to 3x with backoff before declaring memory-only mode
- Storage Health panel shows STORAGE MODE (PERSISTENT vs MEMORY ONLY), read/write test result, detail, contacts-in-store, approx size, Re-run health check, Import from backup CSV, Google Drive section, Wipe all

**Session 7 — Data round-trip catastrophic bug.** Critical finding during audit:
- Original `handleExport` only exported `terminal_status` and `terminal_notes`
- `_user_classification` and `_assignment_*` columns were missing from the exported CSV entirely
- This meant: if Gideon spent 4 hours in Hunt mode then exported, the classifications would not be in the CSV, and next-session import would restore nothing
- Fixed: `handleExport` now includes `_user_classification`, `_assignment_member`, `_assignment_action`, `_assignment_priority`, `_assignment_due`, `_assignment_notes`, `_pinned`, plus 25+ context columns
- Fixed: `handleImport` now restores classifications, assignments, pins, and tags contacts with `_user_classification` so `classifyContact()` sees them
- Toast reports non-zero counts for every restored category

**Session 8 — ConfirmDialog replaces window.confirm.** Mobile artifact sandboxes silently no-op on `window.confirm()`. Built custom modal. Replaces the two dangerous calls (Wipe All, Drive Restore) so Gideon can't accidentally lose data or find buttons don't respond.

**Session 9 — Google Drive backup (best-effort layer).** Built `backupToGoogleDrive` and `restoreFromGoogleDrive` using fetch to `api.anthropic.com/v1/messages` with the Drive MCP connector:
- Size pre-check: 500KB limit. Gideon's full 1,293-contact enriched CSV is ~2.8MB → exceeds limit
- On oversize: shows a clear error telling him to use CSV Export + manual Drive upload instead
- On success: shows "Backed up as [filename]" and saves timestamp to storage
- Restore parses `---BEGIN CSV---`/`---END CSV---` markers in the response
- Honestly disclosed in the UI: "Optional. For large datasets, use CSV Export + manual upload."
- Understood reality: for Gideon's dataset size, the CSV Export button is the only real backup path. Drive is a bonus for smaller subsets.

**Session 10 — Name resolver (the "lonely dash" bug).** The QA agent found during deep testing that many CSV rows have `full_name_en: "—"` (the em-dash character itself) rather than empty values. This completely fooled the initial resolver, which checked only for `c.full_name_en && c.full_name_en.trim()` — em-dash trims to em-dash, which is truthy. Fixed with:
- `isMissingName()` function that treats dashes (`-`, en-dash, em-dash), whitespace-only, N/A, null, none, unknown, undefined, ?, TBD, triple-dash as missing
- `hasRealName()` wrapper
- Full resolver chain: direct name → aliases → phone-match across dataset → email-match across dataset → "title at company" → company alone → title alone → email-local part → "[Contact +phone]" → "[Unknown contact]"
- Shows amber "⚠ Identity inferred from [source]" warning whenever a fallback is used
- Italic gray styling for fallback names vs navy for real names
- Applied in ContactCard, HuntCard, RightDrawer

**Session 11 — Self-Test / Diagnostic panel.** Built a 🩺 Self-Test button in the header that opens a modal running 11 live tests:
1. Storage read/write round-trip
2. Contacts loaded count
3. Investor ratio reasonable (<40%)
4. Export format includes all state columns
5. All contacts have resolvable identity
6. No duplicate contact hashes
7. Classifications persisted to storage
8. Assignments persisted to storage
9. Hunt pending queue computed
10. Team roster populated
11. Recent save timestamp or no-work-yet

Shows green checks or amber warnings with plain-language detail.

**Session 12 — Header subtitle fix.** QA agent reported header showed "CONTACT TERMINAL" instead of "CONTACT INTELLIGENCE TERMINAL". Fixed to render as three stacked lines: CONTACT / INTELLIGENCE / TERMINAL.

**Session 13 — Empty section hiding.** Drawer's RELATIONSHIP and INTELLIGENCE sections were showing as headings with no content for data-thin contacts. `Section` component now uses `React.Children.toArray(children).filter(Boolean)` to detect if all child Fields returned null, and hides the entire section including heading when empty.

**Session 14 — Header overflow.** On narrower viewports with the drawer open, ~40% of header controls (Self-Test button, view toggle, Team Report, Export) were clipped off-screen. Added `overflow-x-auto` so header scrolls horizontally to expose all controls.

**Session 15 — Drawer header enhancement.** Drawer now always shows phone (📞) and email (✉) directly under the name block so identity is visible even when the name itself is a fallback. Fallback names render italic gray with amber warning label.

---

## 4. CURRENT STATE OF TESTING (ACTIVE AT TIME OF BRIEF)

A deep QA test is running in Claude for Chrome against the live artifact. 97 tests across 14 phases: Header & Shell, Left Rail, Card Display, Hunt Mode, Assignments, Status Tracking, Export, Import/Restore, Team Report, View Modes, Pin/Queue, Search, Refresh, Drive Backup.

Phase A (10 tests) has completed with these findings:
- 7 full PASS, 3 PARTIAL, 0 FAIL
- HIGH-1 bug: Diagnostic reports 5 duplicate contact hashes (merge dedup missed 5 pairs)
- MEDIUM-1: Storage Health modal not internally scrollable — "Wipe all" button below fold on shorter viewports
- LOW-1: Storage dot has no hover tooltip
- Unscripted: Pinned dash-contacts stay visible during search even when they don't match the search term
- Unscripted: KEYS USED row shows 0 on first open of storage panel; updates correctly after "Re-run health check"

Phases B through N still running as of this brief. No fixes being made until full report arrives per Gideon's instruction.

---

## 5. TECHNICAL INVENTORY OF THE FILE

**Storage keys used:** `terminal:version`, `terminal:data:contacts`, `terminal:status:{hash}`, `terminal:notes:{hash}`, `terminal:class:{hash}`, `terminal:assign:{hash}`, `terminal:prefName:{hash}`, `terminal:teamRoster`, `terminal:pinned`, `terminal:lastSaved`, `terminal:drive:lastBackup`, `terminal:__healthcheck` (transient).

**Core components:**
- Header (top bar with all controls)
- LeftRail (group navigation, hierarchical, collapsible)
- ContactCard (used in Cards view)
- HuntCard (used in Hunt grid)
- HuntDetailOverlay (full-screen detail view)
- InvestorHuntView (batch-mode hunt workflow)
- ClassifyView (secondary one-at-a-time classification)
- TableView
- DailyQueueView (top-10 algorithm: red flags → stale Priority A → Priority A null → Priority B active)
- RightDrawer (contact detail side panel)
- StorageHealthPanel (modal)
- DiagnosticPanel (modal, runs 11 self-tests)
- ConfirmDialog (modal, replaces window.confirm)
- Toast (bottom-right notification)
- EmptyState (drag-drop CSV onboarding)

**Core utilities:**
- `hashContact` — deterministic hash from name/phone/email
- `mergeContacts` — union-find clustering across CSVs
- `classifyContact` — returns {role, confidence, reason}
- `getPersonaGuidance` — returns {tone, objective, hook, avoid} per role + context
- `buildDailyQueue` — top-10 algorithm
- `isInvestor` — heuristic for left-rail grouping
- `resolveContactIdentity` — offline fallback chain
- `isMissingName` / `hasRealName` — dash/null detection
- `storageSelfTest` — retry-enabled
- `backupToGoogleDrive` / `restoreFromGoogleDrive`
- `generateTeamActionReport` — HTML file generation
- `extractBalance` — parses money figures from free text

**Handlers:**
- `handleFiles` (CSV ingestion)
- `handleStatusClick`, `handleSaveNotes`
- `handleSetClassification`, `handleBulkClassify` (parallel Promise.all write)
- `handleSetAssignment`, `handleClearAssignment`
- `handleTogglePin`
- `handleSetPreferredName` (bilingual name override)
- `handleUpdateTeam`
- `handleExport` (CSV with all state columns)
- `handleImport` (restore from backup CSV)
- `handleResetAll` (with ConfirmDialog)
- `handleDriveBackup`, `handleDriveRestore`
- `handleTeamReport` (HTML download)

---

## 6. KNOWN LIMITATIONS AND OPEN QUESTIONS

**Hard limits:**
- `window.storage` 5MB per key limit
- Google Drive backup capped at ~500KB input per API call
- Sonnet's 200K token input budget caps what can be echoed back in Drive restore
- Claude cannot drive a browser from the artifact-building conversation — hence the separate QA agent running in Claude for Chrome

**Not yet verified:**
- Every button's behavior at scale with 1,293 contacts (currently under test)
- Hebrew name search and display edge cases
- The 5 duplicate hashes found by diagnostic — root cause unknown, needs investigation
- Search vs pin interaction (unscripted observation)
- KEYS USED display-at-open bug

**Deferred decisions:**
- Whether Google Drive backup is worth keeping given the 500KB limit makes it useless for the real dataset
- Whether to add an "Add custom team member" feature (Gideon mentioned it in passing)
- Whether memory-only mode should show the amber banner permanently or auto-dismiss after X minutes
- Whether the left-rail "⚠ Unclassified Investors" group should be top-pinned during active Hunt

---

## 7. THE PARTNERSHIP MODEL

Gideon has defined the working relationship as equal partnership. Paraphrasing his framing: top 1% CRE field expertise on his side, data and AI capability on the assistant's side, equal partners multiplying impact toward building billions in assets. The assistant leads on vision — finding the 10x version of what's asked, connecting across projects, anticipating what Gideon doesn't know to ask for. Gideon leads on execution. Claude challenges decisions with expert reasoning, never silent compliance. Stakes are always high.

Concrete implications in practice:
- Build only after vision alignment (Seed to Forest)
- Activate world-best experts for every task — 88-member Deal Psychology Engine is referenced as the psychological foundation for all external documents and Terminal UX
- HR board (Lazear/Pink/Ariely/Deci for comp+motivation, plus Talent Acquisition, Employment Law/IP, Org Psych, Retention seats) is reused across all hiring
- Banned phrases: "3,000+ transactions", "$15 billion deployed", "distressed" as a RePrime descriptor

---

## 8. OTHER ACTIVE PROJECTS (CONTEXT FOR ROUTING)

These exist in Gideon's world but are separate from this artifact. Referenced in case a topic overlaps:
- **The Terminal** (reprimeterminal.com) — an AI-powered institutional CRE deal-sourcing platform (distinct from this contact manager artifact)
- **Deal Psychology Engine** — 88-member expert board foundational for all external comms
- **4,154-broker database** built from 208K Google Vault emails
- **Sponsor profiles** for Shirel, Doron Sagiv/Gyro Capital, Daniel Schuchalter, Amir Shenkman, Yaron Sitbon
- **Broker's Opinions of Value** for Freeport Plaza and Rochelle Commons
- **Benchemhoun creditor dispute** — settlement work with Matthew Estevez as opposing counsel
- **Shlomo Friedman loan agreement** — finalized
- **Halachic matters** — Heter Iska structures, Bais Din Mekor Chaim proceedings, power of attorney work
- **Bay Valley Shopping Center** (Saginaw, MI) due diligence
- **Watermills Apartments** (Watertown, MA) note acquisition
- **AppSheet bill tracking** — researched and scoped
- **Teams workspace migration** — planned
- **Philippines-based AI Operations Specialist** hiring package built
- **Shely's Postville real estate portfolio** — transitioning property management (Nika out, Mushka's Heartland Builders as construction arm)
- **Family creative projects** — Shely's 50th birthday documentary completed, AI Decoded 5-part family series, gratsiani.com
- **Coaching projects** — "The Mirror" (behavioral profiling) and "The Board" (advisory) — Mussar-CBT based

If the receiving instance is in one of those specific project contexts, Gideon has asked for automatic routing and refusing to engage in the wrong chat to prevent cross-contamination.

---

## 9. WHAT THE RECEIVING INSTANCE SHOULD KNOW

1. Gideon values honesty over comfort. He will respond better to "I don't know, here's what I can verify" than to confident bluffing.
2. His messages will contain speech-to-text artifacts. Decode intent, not literal words.
3. He has already lost work once from a data-loss bug in an earlier iteration. His risk tolerance for catastrophic bugs is zero. Test before claiming done.
4. He is running a QA agent in parallel right now. When the report comes back, he will paste it. The receiving instance may be asked to either (a) triage the bugs, (b) fix specific ones, (c) review the report and make recommendations, or (d) hand back to the current instance.
5. The artifact file on disk at `/mnt/user-data/outputs/reprime_terminal_v1.jsx` is the authoritative current state.
6. Memory contains the persistent preferences (one question at a time, no flattery, Blackstone style, banned phrases, etc). Those apply globally.
7. Gideon explicitly said this brief is "not as a directive but as information only" — the receiving instance is free to challenge any past decision described here.

---

## 10. CURRENT WAIT STATE

At the moment this brief is being written, the following is true:
- QA agent has completed Phase A (10 tests) and is mid-run on Phase B
- Full 97-test report expected imminently
- Gideon instructed: no fixes until the complete report is in hand
- Last code change was the em-dash resolver fix + header subtitle fix + empty Section hiding + horizontal scroll header + drawer identity enhancement
- File parses clean, 13/13 engineering verification checks passed on last validation
- Storage mode on his device is PERSISTENT (confirmed in Phase A)
- Dataset loaded: 1,293 contacts, 306 investors (23.7% ratio — within acceptable <40%)

---

End of brief. Receiving instance has full authority to proceed however Gideon directs.
