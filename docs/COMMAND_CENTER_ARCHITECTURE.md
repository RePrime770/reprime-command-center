# Command Center Architecture — AI Business Operating System

**Date:** 2026-07-02 · **HEAD:** `f5ab5d3` · **Status:** Approved synthesis of two architecture proposals (conservative + ambitious), every load-bearing claim re-verified against code at HEAD.

This document is the single blueprint for upgrading the RePrime Command Center into the 13-module AI Business Operating System. It supersedes neither `docs/COMMAND_CENTER_AUDIT.md` (the repair inventory) nor `_ops-context/HANDOFF-BRIEF.md` (product identity) — it builds on both.

**Governing synthesis rule applied:** revive and extend existing surfaces wherever they genuinely cover a requested module (conservative default); introduce new structure only where the existing cockpit under-delivers — which is exactly four places: Agent Control (2), Automation Hub (6), Revenue & Analytics (8), and the System Health / Settings pages (11, 12).

---

## 0. Verified Ground Truth (corrections to the mission brief)

Re-verified at HEAD before any design decision:

- `components/cockpit/App.jsx` mounts **8 live surfaces**: CalendarPanel, BriefPanel, EmailPanel, NotesPanel (LEFT zone), CommsPanel, NorasDesk (CENTER zone), TopChrome + RecentlyActiveStrip (chrome), plus SearchPalette (⌘K), 3 Concierge drawers (InviteComposer/Briefing/ReligiousCalendar), ZoomWindow (unreachable), ToastStack (renders nothing in prod), ReminderToast.
- **InvestorsPanel (397 LOC), DealsPanel (129 LOC), BucketPanel (383 LOC), OpsPanel (234 LOC), TerminalActivityPanel (85 LOC) are orphaned** — never imported, mock-fed from `components/cockpit/data/`. Total 1,228 LOC of reusable panel structure. The mission brief's "11 real panels" overstates: three of those "panels" are dead code at HEAD.
- **There is no CrewPanel component.** Crew exists as `/api/crew` + `/api/crew/delegate` and `crew_members` (migrated). Crew UI is scoped into the Tasks deck (Module 5).
- Canvas is a **fixed 4000px two-zone kiosk** (`App.jsx:77`) targeting a 5120×1440 monitor — ~1,100px headroom. Mounting 3–4 revived panels on the canvas would exceed the monitor width and force horizontal scrolling on Gideon's live dashboard. This kills the "append panels to the canvas" option for anything more than one panel.
- `lib/pipedrive/client.ts` already exports `listDeals`, `listStages`, `getStageNameMap`, `getDeal`, person/org/activity CRUD — only consumed server-side today (briefing). A deals API route is a thin wrapper.
- `new Anthropic(...)` is instantiated independently in **6 routes**: `ai/concierge`, `ai/draft`, `ai/summarize`, `email/draft`, `nora/chat`, `whatsapp/webhook`. No shared provider layer; no Nora tool-use.
- Adapter registry (`lib/adapters/registry.ts`) has **16 adapters**; `lib/cockpit/integration-setup-links.ts` + IntegrationStatusPill are live (shipped f5ab5d3).
- `bucket_items.status` already allows `open/doing/done/dropped` (`2026-05-05-center.sql:15-16`) — kanban needs zero schema change.
- `vercel.json` has **10 crons**; 5 never execute (proxy PUBLIC_PATHS gaps + GET/POST mismatches — audit §4). `lib/cron/auth.ts` `cronAuthed()` (fail-closed, timing-safe) exists but is not used by the fail-open crons.
- Upstash Redis: env-probed adapter exists, but there is **no shared Redis client** — ~10 routes hand-roll REST calls. A `lib/redis/client.ts` extraction is a spine item.
- `components/cockpit/lib/buttonStyles.js` has **zero importers** (orphaned); the f5ab5d3 kiosk-grade button sizing lives inline in live components.
- `openInvestorChat` is a demo-state key: dispatched by orphaned InvestorsPanel, listened for by live CommsPanel (`CommsPanel.jsx:153-162`). Demo state is per-page-load — cross-page navigation needs a query-param bridge (§2.4).
- Standalone SQL outside migration control: `investor_reminders_migration.sql`, `overnight_migration.sql` (contact_directory), `phone_calls_migration.sql`. Pending Gideon-run migrations: `2026-06-23-whatsapp-threads-lane-override.sql`, `2026-06-29-schema-drift-recovery.sql`.

---

## 1. Final Module Map

| # | Module | Mapping | Owning surface | Gaps to close |
|---|--------|---------|----------------|---------------|
| 1 | Executive Overview Dashboard | **EXISTS + EXTEND** | BriefPanel + TopChrome (Flight Deck) | Add KPI strip to TopChrome (unread comms/email, open bucket, today's meetings — all already polled by CockpitLiveData; + pipeline total once M4's deals route exists). No separate overview page — BriefPanel narrative + KPI strip + System deck cover it. |
| 2 | AI Agent Control Panel | **NEW (thin)** | `/cockpit/agents` deck + `lib/ai/provider.ts` | No agent runtime exists — the "agents" are Nora + 6 AI routes + 10 crons. v1: code-defined agent registry, adapter statuses, recent Nora turns, manual "run now" for runnable agents (briefs, email sync). Run history / cost ledger gated on `agent_runs` migration. **Cut:** start/stop orchestration, agent-creation UI. |
| 3 | Client CRM | **EXTEND** | `/cockpit/crm` deck wrapping revived InvestorsPanel | Rewire InvestorsPanel (397 LOC) off mocks onto `/api/investors/cadence`, `/api/whatsapp/investor-threads`, `/api/pipedrive/{person,search,notes}`. Fix `/api/investors/reminder` hard-500 → 503 setup state. **[G]** Pipedrive `is_investor` backfill (all 673 threads currently false) + `investor_reminders` SQL. Pipedrive stays source of truth. |
| 4 | Lead Pipeline | **EXTEND** | `/cockpit/pipeline` deck wrapping revived DealsPanel | NEW route `GET /api/pipedrive/deals` (thin wrapper over existing `lib/pipedrive/client.ts`, Redis-cached, `setup_required` when token absent). Rewire DealsPanel (129 LOC) off `data/deals.js`; group by stage. No deal mirroring into Supabase. Stage-move write-through is a later [G] opt-in. |
| 5 | Task & Operations Center | **EXISTS core + EXTEND** | NorasDesk (Flight Deck, mounted) + `/cockpit/tasks` deck wrapping revived BucketPanel | `/api/bucket` CRUD + reminders + `/api/crew` all live. Kanban columns from existing `open/doing/done/dropped`, `assigned_to` (crew), `due_at`. Wire the fake reminder controls (CommsPanel RemindBell/ReminderPicker, EmailPanel RemindButton) to the real API. Prereq: P0 fire-reminders GET fix. |
| 6 | Automation Hub | **NEW** | `/cockpit/automations` deck + `lib/automations/manifest.ts` | Nothing lists/monitors the 10 crons + 6 webhooks + watchers. v1: code-defined manifest + Redis heartbeats (zero migration) + "scheduled but silent" detection. v2: `automation_runs` history (migration-gated). **Cut:** runtime enable/disable toggles, if-this-then-that builder (Vercel 10s limit → [G] Trigger.dev decision first). |
| 7 | Communication Inbox | **EXISTS** | CommsPanel + EmailPanel (Flight Deck) | Gap-closing only: doSend optimistic append/refetch; email full-body fetch on open; unread-badge fallback; contact-name resolution + staff-regex dedup. Deferred [G]: 718 iMessage/SMS outbound (BlueBubbles Mac must be online first); Gmail-API threaded send replacing SendGrid (the one L-sized extension worth doing). |
| 8 | Revenue & Analytics Center | **NEW** | `/cockpit/revenue` deck + `GET /api/analytics/summary` | Server-computed rollups: pipeline value by stage + won/lost (Pipedrive, works day 1), 7/30-day comms volume, bucket/asks throughput, AI spend (once `agent_runs` applied). Big-number tiles + CSS bars — **no chart dependency**. Deferred: `revenue_events` recorded-revenue table, `metrics_snapshots` trends (only on explicit Gideon request). |
| 9 | Project/Delivery Tracker | **EXTEND** | Tasks deck (`/cockpit/tasks`) group-by views | `bucket_items` already carries status lanes, `assigned_to`, `due_at`, `source_type/source_url` (links to deals/threads). Add group-by-assignee / group-by-source views. Deal-stage delivery = Pipeline deck. **Cut:** `projects`/`milestones` tables — pure speculation for a single-operator firm; revisit on explicit request. |
| 10 | File & Knowledge Center | **NEW-lite** | `/cockpit/files` deck + `GET /api/files` | Files already flow into Supabase Storage `attachments` bucket (6 call sites). v1: `storage.list()` + on-demand signed URLs — no migration needed; `setup_required` if bucket missing. Knowledge = NotesPanel (mounted, full CRUD) + SearchPalette. Deferred: `files_index` search/tags table, pgvector (rebuild-blueprint scope). |
| 11 | System Health & Logs | **EXTEND** | `/cockpit/system` deck over `/api/health` + NEW `/api/system/schema` | `/api/health` (16 adapters, env names, DB ping) + IntegrationStatusPill exist. Deck adds: full adapter grid, cron board (manifest × heartbeats), **migration checklist** (live table probe vs required manifest), `/api/messages/failed-recent`, last-24h ingest counts. Logs = link out to Vercel dashboard + Sentry ([G] sets `SENTRY_DSN`). **Cut:** in-app log store. |
| 12 | Settings & Integrations | **EXTEND** | `/cockpit/settings` deck from IntegrationStatusPill | Full page (mission requirement): 16 adapter cards with status + setup links (`getSetupLink` exists), env-presence checklist (**NAMES only, never values**), **MigrationRunbook** (pending SQL files in run order + copy-to-clipboard for the Supabase SQL editor), Gmail identity check (`/api/center/gmail-whoami` exists), secondary-Google OAuth entry (`/api/google/connect-secondary` exists), VoicePrefs (wire `speechifySpeed` → `voiceClient` playbackRate — audit item 26). **Read-only for secrets by design** (public repo). |
| 13 | AI Command Assistant | **EXISTS + EXTEND** | NoraChat + TalkToNoraPtt + SearchPalette (Flight Deck) | P0: PTT stale-closure `sendRef` fix. Then: CommandRegistry turns ⌘K into the OS launcher (nav + actions; event/email rows become actionable — they are display-only `div`s today at `SearchPalette.jsx:~164/175`); expand `buildNoraContext` with Pipedrive deals/persons (closes the deal-question hallucination gap). Deferred [G]: Nora tool-use loop with per-action confirmation (composes the CommandRegistry; lands last). |

**Totals:** EXISTS/EXISTS-core 3 (1, 7, 13) · EXTEND 6 (3, 4, 5, 9, 11, 12) · NEW 4 (2, 6, 8, 10 — two of them "lite").

---

## 2. Information Architecture & Navigation Plan

### 2.1 The pattern: Flight Deck + Decks (one pattern, chosen deliberately)

**The Flight Deck** (`/cockpit`) stays pixel-identical: the 4000px two-zone kiosk canvas Gideon lives in. **Every new module surface is a Deck** — a normal scrollable full-viewport page at `app/cockpit/<deck>/page.tsx` (literal segments: `system`, `settings`, `agents`, `tasks`, `crm`, `pipeline`, `automations`, `revenue`, `files`).

Why decks and not the alternatives:

- **Not more canvas panels.** The canvas has ~1,100px headroom against the 5120px monitor; Modules 2/3/4/5/6/8/10/11/12 need 4,000+px of new surface. Widening the canvas forces horizontal scrolling on the live dashboard and requires a [G] visual-change gate on every mount. Decks require zero canvas changes and zero Gideon gates to ship dark.
- **Not drawers.** Drawers (DemoContext-flag pattern) are for transient tasks over the Flight Deck (compose, briefing). System Health, CRM, and Analytics are destinations with their own data lifecycles — a drawer would cap them at one overlay's worth of content and pile more state into the already-overloaded demo reducer. The three existing drawers stay as they are.
- **Free auth.** Everything under `/cockpit/*` inherits `proxy.ts` session gating (g@reprime.com) with no PUBLIC_PATHS changes and no new auth surface.
- **Always-green.** `app/cockpit/layout.tsx` is added as a **strict passthrough** (a provider component with no visual chrome), so the kiosk page renders byte-identical the day the page system lands. Verified risk: today no layout exists between `app/layout` and `app/cockpit/page.tsx`; the passthrough must be verified against the audit's kiosk expectations (`/qa` + pixel check) in its own batch.

### 2.2 How the revived panels fit (synthesis of both proposals)

The three orphaned business panels (Investors/Deals/Bucket) are **revived, not rebuilt** — but they mount **inside deck pages**, not on the canvas. They are width-parameterized components (`<DealsPanel width={...} />`), so a deck page renders `DeckShell → PanelShell → revived panel` at a generous width with room for deck-only extensions (kanban columns, group-by toolbars, detail rails). This keeps the conservative proposal's economics (1,228 LOC reused, `openInvestorChat` wiring reused) and the ambitious proposal's structure (no canvas fight, no [G] gate to ship). OpsPanel and TerminalActivityPanel are **not revived** — the System/Automations/Revenue decks supersede them; they go in the dead-code deletion batch.

An optional later [G] decision can promote **one** panel (DealsPanel, the narrowest) to the Flight Deck canvas headroom. Not in the base roadmap.

### 2.3 Entry points, staged by risk

1. **⌘K CommandRegistry** (ships first, invisible until invoked): "Go to System Health", "Open Pipeline", "New task", "Run morning brief". Commands whose ModuleStatus is degraded render with a "setup" chip instead of hiding — degraded modules stay discoverable. **Shipping rule: a deck does not exist until it is reachable from ⌘K** — every deck batch includes its palette commands.
2. **DeckRail** — a 56px icon rail rendered inside deck pages only (part of DeckShell), never on the Flight Deck. Back-to-cockpit is always the top item.
3. **TopChrome deck-switcher pill** on the Flight Deck — a visual change to the live dashboard → **[G] gate, sequenced last** (Phase 8).
4. **Voice**: each deck registers its nav phrase in the CommandRegistry; Nora/PTT navigation arrives with the (deferred) tool-use loop.

### 2.4 Cross-surface linking

Deck → Flight Deck deep links use query params, because demo state is per-page-load: e.g. CRM deck "Open chat" navigates to `/cockpit?openThread=<id>`; a small effect in the cockpit page reads the param and dispatches the existing `openInvestorChat`/`openChat` demo-state keys (listener already live in `CommsPanel.jsx:153-162`). One shared helper (`lib/cockpit/deep-links.ts`), no new state system.

---

## 3. Data Model Plan

### 3.1 Existing tables (no changes)

- **Migrated + used (8):** `bucket_items`, `email_scores`, `crew_members`, `reminders`, `inforuptcy_filings`, `outbound_asks`, `blocked_contacts`, `nora_chat_messages`.
- **Recovered by `2026-06-29-schema-drift-recovery.sql` (13):** `invitations`, `whatsapp_threads`, `whatsapp_messages`, `roster`, `roster_emails`, `tags`, `thread_tags`, `approvals`, `gmail_watch_state`, `notes`, `tr_cache`, `zoom_events`, `meeting_summaries`.
- **Storage (not SQL):** `attachments` bucket — must exist in Supabase Storage; `/api/files` returns `setup_required` if absent.
- **External source of truth:** Pipedrive (deals, persons, stages, notes). Never mirrored into Supabase; Redis-cached only.

### 3.2 Migration housekeeping (pre-existing debt, Gideon-run)

In run order, all listed in the Settings deck MigrationRunbook:

1. `2026-06-23-whatsapp-threads-lane-override.sql` (pending — unblocks lane toggle).
2. `2026-06-29-schema-drift-recovery.sql` (pending — fresh-bootstrap correctness + Realtime adds).
3. Fold the 3 standalone files into `supabase/migrations/` (repo-side commit, then Gideon applies any not yet live): `investor_reminders`, `contact_directory` (overnight), `phone_calls`.

### 3.3 The ONE new migration (deferred until its consumers exist)

`supabase/migrations/2026-07-XX-bos-spine.sql` — two tables, both observability ledgers:

```sql
agent_runs(id uuid pk, agent_id text, started_at timestamptz, finished_at timestamptz,
           status text, purpose text, model text, tokens_in int, tokens_out int,
           cost_usd numeric, error text, meta jsonb)          -- + index (agent_id, started_at)
automation_runs(id uuid pk, automation_id text, ts timestamptz, status text,
                duration_ms int, detail jsonb)                 -- + index (automation_id, ts)
```

Consumers: M2 (run history + cost), M6 (cron history), M8 (AI spend card), M11 (cron board depth).

**Graceful degradation until Gideon runs it:** writers are fire-and-forget no-ops on 42P01; readers return `ModuleStatus { ok:false, reason:'migration_required', migrationFile:'2026-07-XX-bos-spine.sql' }`; decks render the SetupRequiredBanner naming the exact file with a copy button. When Gideon runs the SQL, the probe cache (≤5 min) expires and features flip live **with zero deploys**.

### 3.4 The graceful-degradation contract (generalizes the existing patterns)

Two proven patterns exist: `AdapterStatus` env-probe (`lib/adapters/status.ts`) and 42P01-tolerant table access (`lib/contact-directory/client.ts`; 503 `migration_not_applied` in `app/api/whatsapp/threads/[id]/route.ts:62-67`). The OS layer composes them:

- `lib/supabase/table-status.ts` — `probeTable(name)` → `'ready' | 'migration_required' | 'error'` (service-role `select … limit 0`, catch 42P01), module-scope cached 5 min. Unit-tested with a mocked client (keeps the lib/-only Vitest convention).
- `ModuleStatus = { ok:true } | { ok:false, reason:'setup_required'|'migration_required', missingEnv?: string[], missingTables?: string[], migrationFile?: string, setupLink?: SetupLink }` — env-check + table-probe composed per domain.
- `GET /api/system/schema` — required-table manifest vs live probe + pending migration filenames. This single endpoint drives every SetupRequiredBanner AND the Settings MigrationRunbook.
- **Route envelope for all NEW APIs:** `{ ok: boolean, data?, error?, status?: ModuleStatus }` with a shared `safeError()` (never echo `err.message`) and zod validation on every new route boundary — new surface area is born compliant with the audit's error-leakage and no-validation findings even before the P0 sweep reaches old routes.

### 3.5 Explicitly deferred tables (with re-open triggers)

| Table | Deferred because | Re-open when |
|---|---|---|
| `activity_log` (event spine) | Count queries on existing tables cover firm-scale needs; speculative | Two+ decks demonstrably need a unified event stream |
| `revenue_events` | Pipedrive-derived analytics works day 1 | Gideon asks to record non-Pipedrive revenue |
| `metrics_snapshots` | No trend-line requirement yet | Gideon asks for trends over time |
| `projects` / `project_milestones` | `bucket_items` covers single-operator delivery | Gideon asks for multi-step milestone tracking |
| `files_index` | `storage.list()` covers browse/preview | Search/tags/thread-linking demanded |
| `automation_rules` | Needs [G] Trigger.dev decision (runtime limits, recurring cost) | Trigger.dev approved |

---

## 4. Shared Layout & Component Plan

### Reused from the live cockpit

| Asset | Where it is | How it's reused |
|---|---|---|
| `CockpitErrorBoundary` | `components/cockpit/CockpitErrorBoundary.jsx` (wraps the live app) | Wraps every deck page — a deck crash never takes down anything else |
| Color/palette tokens | `components/cockpit/lib/colors.js` (ink ramp, channel palette `CH`, medal ABCD tier palette) + `lib/design-tokens.ts` | Decks import the same tokens; no new color system |
| `buttonStyles.js` | `components/cockpit/lib/buttonStyles.js` — **currently orphaned (zero importers, verified)** | Revived as the canonical kiosk-grade button module for deck components: fold the f5ab5d3 inline 44pt-target button patterns into it, then consume from DeckShell components. If revival proves noisier than value, delete it in the dead-code batch and extract a fresh `components/decks/lib/buttons.js` — decision made in the P2 spine batch, not by default |
| Adapter-status pattern | `lib/adapters/{status,registry}.ts` + `lib/cockpit/integration-setup-links.ts` + IntegrationStatusPill | Generalized to `ModuleStatus` (§3.4); pill stays on TopChrome and gains an "Open Settings" deep link |
| `PanelShell` | `components/cockpit/panels/PanelShell.jsx` | Revived panels keep it; decks wrap it inside DeckShell |
| `ListenButton` / voice | `components/cockpit/lib/voiceClient.js` + voice components | **Hard accessibility rule preserved: every AI-generated text block on any deck gets a Listen button** (Gideon is severely dyslexic, voice-first) |
| `fetchJsonSafe` polling pattern | `components/cockpit/live/CockpitLiveData.jsx:41` | Extracted into the `useDeckData` hook |
| Lexend + kiosk sizing | `_ops-context/kiosk-design-spec-v2.md` | Deck typography/touch targets follow the same spec |

### New shared pieces (`components/decks/` + lib)

- `DeckShell.jsx` — deck header (title, back-to-cockpit, clock, IntegrationStatusPill reuse), DeckRail, content region. One file, every deck uses it.
- `SetupRequiredBanner.jsx` — renders `ModuleStatus`: `setup_required` (missing env NAMES + setup link), `migration_required` (exact SQL filename + copy button), `ok` (nothing). This generalizes audit item §11b-31 into the OS contract.
- `StatCard.jsx`, `DataGrid.jsx` (own `overflow-x:auto` container), `KanbanBoard.jsx`, `TimelineList.jsx`.
- `useDeckData(endpoint, {refreshMs})` — defensive fetch + envelope parsing; decks poll independently and **never join the Flight Deck's 60s CockpitLiveData poll** (zero added load on the kiosk).
- `lib/redis/client.ts` — extracted get/set-with-TTL over Upstash REST (graceful null when env absent); replaces the ~10 hand-rolled call sites opportunistically as routes are touched (DRY, not a big-bang refactor).
- `lib/cockpit/deep-links.ts` — deck ↔ Flight Deck navigation helper (§2.4).

---

## 5. AI Provider & Agent Abstraction Plan

### What exists in `lib/` today (verified)

- Env-probe status adapters only: `lib/anthropic/status.ts`, `lib/openai/status.ts`, `lib/groq/status.ts`, `lib/elevenlabs/status.ts`.
- `new Anthropic(...)` duplicated in 6 routes (§0). No shared model registry, no cost/timing telemetry, no error normalization, no tool-use.
- Nora context builder in `components/cockpit/lib/noraContext.js` + `/api/nora/{chat,history}`; voice via `voiceClient.js`, `/api/voice/*`.

### The seam: `lib/ai/provider.ts`

One chokepoint: `runCompletion({ agentId, purpose, model?, system, messages, maxTokens })` providing:

1. **Model registry with named tiers** (`fast` / `standard` / `deep` → current Claude model IDs) — one place to change models, add fallbacks, or rate-limit later.
2. **Telemetry**: timing, token counts, per-call cost estimate from a pricing table.
3. **Error normalization**: callers get typed failures; raw `err.message` never reaches a client (closes the AI-route leakage class by construction).
4. **Fire-and-forget `agent_runs` ledger write** — graceful no-op pre-migration (§3.3).
5. `getStatus()` folds into the existing 16-adapter registry (no parallel status system).

**Migration is incremental and always-green:** each of the 6 routes swaps its inline client for `runCompletion` in its own one-commit batch — pure delegation, behavior-identical, existing tests untouched, new unit tests on the provider itself.

### Agent registry: `lib/domains/agents/registry.ts`

Code-defined (no table): `nora-chat`, `morning-brief`, `evening-brief`, `email-drafter`, `email-triage-scorer`, `comms-summarizer`, `concierge` — each with `{ id, description, trigger: 'chat'|'cron'|'manual', runRoute? }`. The Agents deck renders from this registry day 1; run history and cost sparklines light up when `agent_runs` is applied. **Cut:** `agent_configs` enable/disable table — agents are code; toggling them is a deploy, and a toggle table is YAGNI for one operator.

### Command bus (Module 13's backbone)

`lib/cockpit/commands.js` — `CommandRegistry: { id, title, keywords, section, run(ctx), deck?, requiresStatus? }`. Consumed by:
1. **SearchPalette** (P2): command matches render above live-data matches; degraded commands show a "setup" chip.
2. **Nora tool-use** (Phase 8, [G]): `lib/ai/tools.ts` maps the same registry to an Anthropic tool schema; `nora/chat` gains a tool-use loop with an **explicit confirm step for every side-effecting tool**. One source of truth for "what the cockpit can do", consumed by keyboard and voice alike.

---

## 6. Mock/Real Data Separation Policy

1. **No mounted component may import from `components/cockpit/data/`.** The mock corpus (~1,700 lines) is deleted in the same batch that deletes its last orphaned importer (P4), after the three revived panels are rewired to live adapters.
2. **New surfaces never ship with fake data.** A deck with an unconfigured integration or missing table renders its SetupRequiredBanner — never sample rows. This is the adapter-status pattern promoted to a hard rule (5 live panels currently can't distinguish "empty" from "unconfigured"; new code must).
3. **Decorative fakes are wired or removed, never left.** The audit's Dead/Fake UI list (§5) is worked down in P1: fake reminder controls → real API; hardcoded "Nora draft" template → real draft route or removed; unreachable demo copy (TopChrome Row3, ZoomWindow, ToastStack samples) → deleted.
4. **DemoContext stays** — it is the load-bearing global UI store (verified) — but demo-only *flags* whose only consumers are deleted mocks are pruned with them.
5. **Seed/test data lives in tests only** (Vitest fixtures in `lib/**/*.test.ts`), never in components.

---

## 7. Explicit Non-Goals

Respecting the product identity (HANDOFF-BRIEF + audit §10):

- **Not multi-tenant.** No `org_id`, no RLS work, no self-serve, no billing. Single tenant, `proxy.ts` hard-gated to g@reprime.com. Multi-tenancy is REBUILD-BLUEPRINT scope.
- **Not investor-facing.** That is RePrime Terminal. Nothing here renders to investors; banned copy/roster rules stand.
- **Not a Pipedrive replacement.** Pipedrive remains the CRM of record. We read (deals, stages, persons, notes) and write only notes/activities; stage-move write-through is a [G] opt-in. No deal mirroring into Supabase.
- **No agent orchestration platform.** No agent creation UI, no start/stop runtime, no `agent_configs` table.
- **No automation builder (v1).** Inventory + monitoring only; a rules engine waits on the [G] Trigger.dev decision.
- **No in-app log store/viewer.** Vercel + Sentry links; Axiom is rebuild scope.
- **No chart library, no new heavy deps.** CSS bars + big numbers match the kiosk aesthetic; react-window (audit item 33) is the only candidate dependency, deferred to a perf follow-up.
- **No pgvector / embeddings / doc ingestion.** Rebuild scope; [G] cost.
- **No secret values anywhere, ever.** Env var NAMES only; Settings deck is read-only for secrets; no secret-entry UI in a public repo.
- **No edits to locked references** (terminal-artifact-v2, public-nu-six-60) and **no deletion of `components/center/*` / `components/chat/*`** (legacy fallback constraint).
- **No unsolicited Flight Deck visual changes.** Anything altering the live canvas (deck-switcher pill, panel promotion) is [G]-gated.

---

## 8. Implementation Priority Roadmap

Every batch = one commit, independently shippable to `main` (which deploys production immediately). **Gate per batch: `tsc` clean + all Vitest suites green (142 tests at HEAD; count only ever grows) + `next build --webpack` succeeds.** New lib code lands with unit tests. `[G]` = Gideon-only action; code batches never block on them — dependent features degrade via §3.4 until Gideon acts.

### Phase 0 — Repair substrate (P0: the audit's repair order §11a)

The OS must not showcase broken machinery: 5 of 10 crons never execute; 3 webhooks unreachable; 4 unauthenticated writes.

| Batch | Scope | Files |
|---|---|---|
| 0.1 | GET exports for `fire-reminders` + `slack-digest` (un-breaks reminders + digest) | `app/api/bucket/fire-reminders/route.ts`, `app/api/cron/slack-digest/route.ts` |
| 0.2 | PUBLIC_PATHS adds (`dispatch-alerts`, `secretary/poll-overdue`, `meeting-verify`, `investor-cadence`) + standardize all fail-open crons on `cronAuthed()` | `proxy.ts`, 6 cron routes, `lib/cron/auth.ts` |
| 0.3 | Webhook auth closes: quo-webhook mandatory signature header; reconcile GET auth; warm-card auth | 3 routes |
| 0.4 | Hygiene: Quo env mismatch (`lib/quo/status.ts` + setup-links → `QUO_API_KEY`), available-slots error leak, `proxy.ts:39` password-comment scrub, `.env.example` missing names, ELEVENLABS_VOICE_ID adapter check | 5 small files |
| 0.5 | NoraChat `sendRef` stale-closure fix (PTT gets real history/context) | `components/cockpit/panels/NoraChat.jsx` |
| 0.6 | CommsPanel `doSend` optimistic append + refetch | `components/cockpit/panels/CommsPanel.jsx` |

**Verification:** gates + hit each fixed cron with/without `CRON_SECRET` (401 vs 200); send a WhatsApp message and see it appear in-thread; PTT a Nora question referencing prior turns.
**Must NOT break:** the vercel.json redirect `api/` exclusion (Timelines regression happened once); existing PUBLIC_PATHS entries; center-drain (the gold-standard cron).
**[G] parallel:** apply 2 pending migrations; mint `GOOGLE_REFRESH_TOKEN_2`; set `AUTH_ACCESS_CODE`/`SENDGRID_FROM_EMAIL`/`GROQ_API_KEY`/`SENTRY_DSN`; power on BlueBubbles Mac; rotate 2026-06-18 exposed secrets + flip repo private.

### Phase 1 — Complete existing partial features (P1: Modules 7, 13-core, 1, 5-wiring)

| Batch | Scope | Files |
|---|---|---|
| 1.1 | EmailPanel: full body fetch on open (Gmail `messages.get`) + unread-badge fallback fix | `EmailPanel.jsx`, email API route |
| 1.2 | Wire reminder controls to real `/api/bucket` + remind (CommsPanel RemindBell/ReminderPicker, EmailPanel RemindButton) — reminders now actually fire (0.1) | `CommsPanel.jsx`, `EmailPanel.jsx` |
| 1.3 | Contact-name resolution through `adaptThreads` + import staff regex from `lib/cockpit/staff-roster.ts` (kill the duplicate in `adapters.js:50`) | `components/cockpit/live/adapters.js` |
| 1.4 | `buildNoraContext` + Pipedrive deals/persons (closes deal-question hallucination) | nora context builder, `app/api/nora/chat` |
| 1.5 | SearchPalette event/email rows actionable (dispatch open-thread/open-email; listeners exist) | `chrome/SearchPalette.jsx` |
| 1.6 | TopChrome KPI strip (unread comms/email, open bucket, today's meetings — from existing CockpitLiveData) — **Module 1 done pending pipeline total** | `chrome/TopChrome.jsx`, `live/adapters.js` |
| 1.7 | InviteComposerDrawer: wire real slots + send, or remove its Concierge entry (decide, one commit); dead-chrome trims (SpeedSelector wiring moves to Settings deck in 3.2) | drawer + `TopChrome.jsx` |

**Verification:** gates + open an email and see full body; set a reminder from CommsPanel and watch it fire; ask Nora a deal question; ⌘K → click an email row.
**Must NOT break:** CockpitLiveData poll shape (7 endpoints); existing thread/email adapters consumed by mounted panels; kiosk layout (KPI strip fits existing TopChrome height).

### Phase 2 — Platform spine (P2 begins: new modules by value; zero user-visible change)

| Batch | Scope | Files |
|---|---|---|
| 2.1 | `probeTable` + `ModuleStatus` types + route envelope + `safeError()` + zod at new boundaries — all unit-tested | `lib/supabase/table-status.ts`, `lib/domains/status.ts` (+tests) |
| 2.2 | `GET /api/system/schema` (required-table manifest vs live probe + pending migration list) | `app/api/system/schema/route.ts` |
| 2.3 | CommandRegistry + palette integration (nav commands ship dark — decks 404 until they land, commands hidden until registered) | `lib/cockpit/commands.js`, `chrome/SearchPalette.jsx` |
| 2.4 | Passthrough `app/cockpit/layout.tsx` + `DeckShell`/`DeckRail`/`SetupRequiredBanner`/`useDeckData` + buttonStyles revival decision + `lib/redis/client.ts` | `app/cockpit/layout.tsx`, `components/decks/*`, `lib/redis/client.ts` |
| 2.5 | `lib/cockpit/deep-links.ts` + cockpit page query-param bridge (`?openThread=`) | helper + `app/cockpit/page.tsx` |

**Verification:** gates + **pixel-identical Flight Deck check after 2.4** (screenshot diff / `/qa` against production) — this is the highest-risk invisible change in the whole roadmap; `/api/system/schema` returns correct probe results against live DB.
**Must NOT break:** `/cockpit` rendering, proxy gating, ⌘K search behavior for threads.

### Phase 3 — Zero-migration decks (Modules 11, 12) — these unblock every later [G] action

| Batch | Scope | Files |
|---|---|---|
| 3.1 | `/cockpit/system` deck: 16-adapter grid, env presence (names), migration checklist (from 2.2), `/api/messages/failed-recent`, last-24h ingest counts, Vercel/Sentry links + palette commands | `app/cockpit/system/page.tsx`, `components/decks/system/*` |
| 3.2 | `/cockpit/settings` deck: adapter cards + setup links, **MigrationRunbook** (run-order + copy button), Gmail whoami, secondary-OAuth entry, VoicePrefs (`speechifySpeed` → `voiceClient` playbackRate — audit item 26) + palette commands | `app/cockpit/settings/page.tsx`, `components/decks/settings/*`, `voiceClient.js` |
| 3.3 | IntegrationStatusPill expanded view gains "Open Settings" link (tiny, additive chrome change) | `chrome/IntegrationStatusPill.jsx` |
| 3.4 | Cron heartbeats v1: `lib/cron/heartbeat.ts` Redis `SET heartbeat:<path> <ts>` inside `cronAuthed`-standardized handlers (one line each; graceful no-op without Upstash); System deck cron board reads them → "scheduled but silent" detection | `lib/cron/heartbeat.ts`, 10 cron routes, system deck |

**Verification:** gates + open both decks logged-in; confirm anonymous request to `/cockpit/system` redirects to /login; MigrationRunbook lists exactly the pending files of §3.2; cron board shows heartbeats appearing within minutes of 0.1/0.2 fixes.
**Must NOT break:** `/api/health` (public, names-only contract); pill behavior on the Flight Deck; **never render an env VALUE**.

### Phase 4 — Business decks on live APIs (Modules 4, 3, 5, 9) + cleanup

| Batch | Scope | Files |
|---|---|---|
| 4.1 | `GET /api/pipedrive/deals` (wraps existing `listDeals`/`listStages`/`getStageNameMap`; Redis-cached ~10 min; `setup_required` sans token) + lib tests | `app/api/pipedrive/deals/route.ts` |
| 4.2 | `/cockpit/pipeline` deck: revive DealsPanel off `data/deals.js` onto the route, group-by-stage board + palette commands | `app/cockpit/pipeline/page.tsx`, `panels/DealsPanel.jsx` |
| 4.3 | `/api/investors/reminder` graceful 503 `migration_required` + fold 3 standalone SQL files into `supabase/migrations/` | route + SQL moves |
| 4.4 | `/cockpit/crm` deck: revive InvestorsPanel onto `/api/investors/cadence` + `/api/whatsapp/investor-threads` + Pipedrive routes; "Open chat" via deep-link bridge; honest empty state until [G] `is_investor` backfill + palette commands | `app/cockpit/crm/page.tsx`, `panels/InvestorsPanel.jsx` |
| 4.5 | `/cockpit/tasks` deck: revive BucketPanel onto `/api/bucket` — kanban (`open/doing/done/dropped`), `assigned_to` crew view (`/api/crew`), `due_at`, asks lane (`/api/secretary/asks`); group-by-assignee/source views (**Module 9 done here**) + palette commands | `app/cockpit/tasks/page.tsx`, `panels/BucketPanel.jsx` |
| 4.6 | Dead-code deletion: OpsPanel, TerminalActivityPanel, pillars/, wideTabs/, unused drawers (InvestorProfile/CallerId/EmailCompose if still unmounted), DemoStatesPanel, ToastStack mocks, `voiceCommands.js`, `components/cockpit/data/` (now import-free). Keep DemoContext/reducer; **never touch `components/center|chat`** | deletion commit |

**Verification:** gates + each deck against live data (deals grouped correctly vs Pipedrive UI; task drag between kanban lanes persists via PATCH; CRM empty-state copy names the [G] backfill); grep proves zero `components/cockpit/data/` imports before 4.6.
**Must NOT break:** NorasDesk (shares `/api/bucket`); CommsPanel `openInvestorChat` listener; `briefing/today`'s server-side Pipedrive usage; DemoContext keys still consumed by live components.
**[G]:** Pipedrive `is_investor` backfill; apply `investor_reminders` migration.

### Phase 5 — AI provider + Agents deck (Module 2)

| Batch | Scope | Files |
|---|---|---|
| 5.1 | `lib/ai/provider.ts` (tiers, pricing, timing, safeError, graceful `agent_runs` write) + tests | `lib/ai/provider.ts` (+tests) |
| 5.2–5.4 | Migrate the 6 `new Anthropic` routes to `runCompletion`, two per batch, behavior-identical | 6 routes |
| 5.5 | `lib/domains/agents/registry.ts` + `GET /api/agents` (registry + statuses + last runs when table ready) + `/cockpit/agents` deck (agent cards, Nora history via `/api/nora/history`, manual run buttons for brief/sync agents, migration-gated run history/cost) + palette commands | lib, route, `app/cockpit/agents/page.tsx` |

**Verification:** gates + Nora chat / email draft / summarize round-trips byte-comparable before vs after each swap; agents deck renders `migration_required` banner naming `bos-spine.sql`; manual "Run morning brief" produces a brief.
**Must NOT break:** Nora voice loop (TTS/STT untouched); whatsapp/webhook ingest summarization; AI route latency (provider adds negligible overhead).
**[G]:** run `2026-07-XX-bos-spine.sql` → run history/cost cards flip live with zero deploys.

### Phase 6 — Automation Hub + Revenue & Analytics (Modules 6, 8)

| Batch | Scope | Files |
|---|---|---|
| 6.1 | `lib/automations/manifest.ts` — typed inventory of 10 crons (path/schedule/purpose, mirrors vercel.json) + 6 inbound webhooks + 2 watchers; unit-tested pure data (test asserts manifest ↔ vercel.json sync) | lib (+tests) |
| 6.2 | `GET /api/automations` (manifest × Redis heartbeats × `automation_runs` when ready × linked adapter status) + `/cockpit/automations` deck (rows, run timeline, webhook cards, "never ran" flags) + palette commands | route, `app/cockpit/automations/page.tsx` |
| 6.3 | Heartbeat v2: `withHeartbeat()` wrapper also writes `automation_runs` (graceful no-op) — duration + status history | `lib/cron/heartbeat.ts`, cron routes |
| 6.4 | `GET /api/analytics/summary` — pipeline value by stage + won/lost (Pipedrive, in-memory at firm scale), 7/30-day comms volume (`whatsapp_messages`, `email_scores` counts), bucket/asks throughput, AI spend (from `agent_runs` if ready); Redis-cached 30 min + rollup helpers with unit tests | route, `lib/domains/revenue/*` (+tests) |
| 6.5 | `/cockpit/revenue` deck — StatCard tiles + CSS bars (no chart dep) + AI-spend card + palette commands; TopChrome KPI strip gains pipeline total (completes Module 1) | `app/cockpit/revenue/page.tsx`, `chrome/TopChrome.jsx` |

**Verification:** gates + automations deck flags any cron with no heartbeat (should be zero after P0 — this deck *proves* P0); analytics numbers spot-checked against Pipedrive UI and SQL counts.
**Must NOT break:** cron execution paths (wrapper is additive); vercel.json (manifest mirrors it, never edits it); Flight Deck poll budget (decks poll independently).

### Phase 7 — Files deck (Module 10)

| Batch | Scope | Files |
|---|---|---|
| 7.1 | `GET /api/files` — service-role `storage.from('attachments').list()` + on-demand signed URLs; `setup_required` if bucket absent | `app/api/files/route.ts` |
| 7.2 | `/cockpit/files` deck — grid, preview pane, source filter + palette commands | `app/cockpit/files/page.tsx`, `components/decks/files/*` |
| 7.3 | NotesPanel + files cross-links in SearchPalette (knowledge story complete: Notes CRUD + ⌘K + files browse) | `chrome/SearchPalette.jsx` |

**Verification:** gates + browse real attachments uploaded via CommsPanel; signed URL opens; bucket-absent path renders banner (test with a bogus bucket name).
**Must NOT break:** existing upload flows (`center/reply-media`, warm-card, CommsPanel uploads); signed-URL expiry hygiene (short-lived, generated on click).

### Phase 8 — Opt-in, [G]-gated finale (Module 13 full + L-items)

All items individually gated on Gideon's explicit go:

- **8.1 [G]** Nora tool-use: `lib/ai/tools.ts` from CommandRegistry → `nora/chat` tool-use loop with per-action confirmation (create task, draft email, navigate deck, run agent). ListenButton on every response preserved.
- **8.2 [G]** Gmail-API threaded send replacing SendGrid for cockpit replies (audit item 30 — replies finally land in Gmail Sent).
- **8.3 [G]** BlueBubbles outbound client for 718 iMessage/SMS — only after the Mac is verifiably online (audit item 36).
- **8.4 [G]** TopChrome deck-switcher pill (Flight Deck visual change) and/or DealsPanel promotion to canvas headroom.
- **8.5 [G]** Trigger.dev worker (InfoRuptcy + heavy crons; recurring cost) → unlocks `automation_rules` v2.
- Deferred tables from §3.5 as their triggers fire.

**Verification:** each behind its own gate + `/qa` browser pass on any Flight Deck change.
**Must NOT break:** SendGrid path stays as fallback until Gmail send is verified; existing Nora chat behavior when tool-use is declined.

---

### Roadmap summary

~38 one-commit batches across 9 phases. Phases 0–3 require **zero new migrations and zero Gideon gates** yet deliver the two decks (System, Settings) that turn every subsequent Gideon action — migrations, env vars, backfills, Mac power-on — into a self-serve, in-product checklist. Business decks (P4) reuse 909 LOC of revived panels on already-live APIs. The single new migration (P5) is optional-until-run, and everything it gates degrades to a named, actionable setup state. Nothing lands on the Flight Deck canvas without a [G] gate; every module is reachable from ⌘K; every batch leaves `main` deployable.
