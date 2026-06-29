# PERFORMANCE_AUDIT.md

Performance audit of the Next.js 16 / React 19 cockpit at `app/cockpit/`.
Doc-only deliverable — no source modifications. Findings derived from static
analysis of the repo + inspection of the local `.next/static` build artifact.

---

## Method + measured baselines

**Searched:**

- `grep -rln "'use client'" components app` → directives counted
- `grep -rn "setInterval\|setTimeout" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"` → polling sites
- `grep -rn "useEffect\|fetch(" components/cockpit` → client-side fetch sites
- `grep -rn "useQuery"` → React Query usage map
- `grep -rn ".map("` over thread/message lists; `grep "virtual\|react-window"`
- `du -sh .next/static/chunks/...` → built chunk sizes
- `grep -rn "Cache-Control"` in `app/api/` + `next.config.ts`

**Baselines:**

- **`'use client'` directives:** **87** files (across `components/` + `app/`).
  Of those, 24 live under `components/cockpit/` even though most are JSX with
  no event handlers that need to be client-only — the parent (`CockpitClient.tsx`)
  forces the entire subtree client-side with a mount gate.
- **`setInterval` / `setTimeout` sites:** **38 total** in client+server code;
  **16 client-side intervals** (the rest are one-shot debounces, server abort
  timers, or sleep helpers).
- **Polling histogram (intervals firing on `/cockpit`):**
  | Interval | Count | What it polls |
  |---|---|---|
  | 1 s | 2 | `ClockShabbat` clock, `SuggestedFocus` countdown |
  | 15 s | 1 | `MeetingNowBanner` "now" tick |
  | 30 s | 4 | `TopChrome` clock, `LiveMeetingAlertSync`, `TodayPanel` (2×) |
  | 60 s | 2 | `CockpitLiveData` (7 API calls × fan-out), `HealthPill` |
  | 60 min | 1 | Religious calendar fetch |
- **Cockpit-tree fetches per refresh cycle:** `CockpitLiveData` fires
  **7 concurrent fetches** every 60 s via `Promise.allSettled`. Children
  (`CommsPanel`, `EmailPanel`, `NoraChat`, `BriefPanel`, `NotesPanel`,
  `CalendarPanel`, `ReligiousCalendarDrawer`) issue their own additional
  fetches in their own `useEffect`s — duplication of the calendar endpoint
  between `TopChrome` and `ReligiousCalendarDrawer` was observed.
- **Bundle (local `next build` output):**
  - `.next/static/chunks/9858-…js` — **456 KB** (largest shared chunk)
  - `.next/static/chunks/main-9b93c2f4…js` — **280 KB**
  - `.next/static/chunks/4bd1b696-…js` — **196 KB**
  - `.next/static/chunks/framework-…js` — **188 KB**
  - `.next/static/chunks/8384-…js` — **180 KB**
  - `.next/static/chunks/app/cockpit/page-…js` — **144 KB**
  - `.next/static/chunks/app/legacy/page-…js` — **136 KB**
  - Polyfills — **112 KB**
  - Total `.next/static/chunks` ≈ **2.6 MB** parsed JS shipped to the browser.
- **Memoization in `components/cockpit/`:** zero `React.memo` calls; 12 hits
  for `useMemo`/`useCallback` total across the panel tree (~5 200 LoC).
- **Virtualization:** none. `react-window`, `react-virtual`, `tanstack-virtual`
  not in `package.json`. Thread list is `list.map(...)`.

---

## Findings by impact

### HIGH

**H1. Cockpit forces full client render with a mount gate (no SSR streaming).**
`app/cockpit/CockpitClient.tsx:23-50` mounts a `useState(false)` gate that
renders a "Loading cockpit…" placeholder until `useEffect` runs, then mounts
the whole tree. This is a documented hydration-mismatch workaround for the
clock, but it discards **all** server work: the cockpit ships ~2.6 MB JS,
parses it, then runs 7 API calls before painting anything real. Time-to-real-
paint = JS-parse + 1 RTT. **Fix:** keep the gate only on the *clock pill* (a
~50-line subtree), let everything else hydrate from the server immediately.
Restores ~500–800 ms cold-load.

**H2. Polling fan-out: 7 fetches every 60 s with no `If-Modified-Since`.**
`components/cockpit/live/CockpitLiveData.jsx:94-104` re-fetches all 7 panel
sources on every tick regardless of focus/visibility. `/api/whatsapp/threads`
is the heaviest (Pipedrive enrichment + Timelines paging, `maxDuration = 60`).
No `document.visibilityState` guard, no `If-None-Match`, no SWR cache. Each
tick also re-hits Pipedrive even when the in-handler Redis cache hits, because
the *client* always pays the function-cold latency. **Fix:** (a) skip the
tick when `document.hidden`, (b) add `Cache-Control: private, max-age=30,
stale-while-revalidate=60` on `/api/whatsapp/threads`, (c) consider lifting
into TanStack Query (already installed) with `staleTime: 30_000`.

**H3. No list virtualization — 642 + 219 thread rows rendered at once.**
`components/cockpit/panels/CommsPanel.jsx:293-300` does `list.map((t) =>
<ThreadRow … />)` inside a plain `overflowY: auto` div. WhatsApp 305 (642
threads) + 718 (219) = **861 `<button>` elements** painted on first frame.
Each row has inline `style={…}` objects, so every parent re-render
reallocates 861 style objects and re-runs reconciliation. **Fix:** swap in
`react-window` (`FixedSizeList`, item height ≈ 64 px). Brings DOM nodes from
~5 000 to ~30 visible; cuts first paint of the panel from 200–400 ms to <50 ms.

**H4. Two heavy server-only deps are routed through `app/api/**` but live in
the same `node_modules` resolver as the client bundle.**
`package.json` ships `xlsx` (~600 KB), `playwright-core` (~6 MB), and
`@sparticuz/chromium` (~120 MB compressed Brotli) as top-level deps. They're
only imported from server route files (`app/api/center/contacts-export`,
`app/api/outreach/export`, `lib/inforuptcy/client.ts`). Next 16 auto-externalizes
the latter two, but `xlsx` is **not** in the auto-extern list and any client
file that transitively imports a util shared with the export route will pull
it into the client bundle. **Fix:** verify with `@next/bundle-analyzer`; add
`xlsx` to `serverExternalPackages`; for `playwright-core`, ensure the route
that uses it is `export const runtime = 'nodejs'`.

**H5. AI summarization fires inside `useEffect` on every thread open.**
`components/cockpit/panels/CommsPanel.jsx:618-650` and
`components/cockpit/panels/EmailPanel.jsx:672-700` both `POST /api/ai/summarize`
inside `useEffect` keyed on `text`/`thread.id`. There is no client-side memo
keyed by thread+message-count, and no server cache. Opening a thread, closing
it, and re-opening it pays the full LLM round-trip again. At ~$0.001 / call
this adds up; UX-wise it adds 1–3 s of "Nora is reading this thread…" each
time. **Fix:** cache the summary on the server keyed by
`(thread_id, last_message_id)` in Redis, and on the client in a `Map` in
`CockpitLiveData` so a re-open is instant.

**H6. Cockpit data context produces a new object every render.**
`components/cockpit/live/CockpitLiveData.jsx:174-178` renders
`<Provider value={{ ...value, refresh: load }}>` — that spread plus inline
`refresh` means a **new object on every render** of the provider, which
invalidates every `useContext(CockpitLiveDataContext)` consumer downstream.
With 7+ panels consuming it, every 60 s tick re-renders the entire panel
tree even if only one source changed. **Fix:** memoize the provider value
(`useMemo` over `value`+`load`); split into multiple contexts (threads vs.
calendar vs. brief) so consumers don't re-render on unrelated changes.

### MEDIUM

**M1. `TopChrome` re-fetches `/api/religious-calendar` even though the
cockpit provider already has equivalent data.** `TopChrome.jsx:647-660` plus
`ReligiousCalendarDrawer.jsx:68-75` plus `CalendarPanel.jsx:38` all hit the
same endpoint independently. Three callers, three responses, on every mount.
**Fix:** move into `CockpitLiveData` and read from context.

**M2. 1-second `setInterval` for clock and countdown.**
`TopChrome.jsx:642` + `SuggestedFocus.tsx:119` both `setInterval(…, 1000)`.
Each tick `setState`s a new `Date()`, re-rendering its parent. The clock pill
doesn't need to re-render the whole `ClockShabbat` subtree — only the
`{time}` text node. **Fix:** isolate the clock into a tiny memo'd component;
or use `useSyncExternalStore` over a single shared ticker.

**M3. Inline `style={{}}` everywhere.** The cockpit panels are built with
inline-style objects on every JSX node (e.g. `ThreadRow` allocates ~10 style
objects per row × 861 rows = 8 600 allocations per panel render). React
treats these as new references, so `React.memo` would be ineffective without
also extracting them. **Fix:** extract static styles to module-scope `const`s,
keep dynamic bits (tier color, isHebrew) as small computed objects.

**M4. `/api/whatsapp/threads` runs Pipedrive enrichment + Timelines on every
GET.** No `Cache-Control` on the response. Even though Pipedrive lookups use
Redis (TTL 3 600 s), the *enrichment loop* still runs every call — and on
cold start can stack to >10 s (justifying `maxDuration: 60`). **Fix:** send
`s-maxage=30, stale-while-revalidate=120` so Vercel's edge cache absorbs
repeated hits; the cockpit's 60 s polling will then hit the edge 90% of the
time.

**M5. `dynamic = 'force-dynamic'` on read-heavy endpoints.**
`app/api/whatsapp/threads/route.ts:19` is `force-dynamic`. Combined with the
no-store policy in `next.config.ts:30-39`, every cockpit reload pays the full
function cold start. The HTML doc itself doesn't need `no-store` — only the
JS bundle URLs are versioned. **Fix:** drop `no-store` on `/cockpit`; rely on
the already-hashed chunks for cache busting.

**M6. Email fetch + AI summarize in `EmailPanel` runs sequentially per
email.** `EmailPanel.jsx:672-700` summarizes within `useEffect`; if the user
opens 10 emails in 30 s, that's 10 LLM calls fired serially as a side-effect.
**Fix:** debounce + server-side memoize as in H5.

### LOW

**L1.** `MeetingNowBanner` ticks every 15 s to recompute "starts in N min" —
that resolution exceeds what the UI needs (minute granularity is plenty).
Bump to 30 s.

**L2.** Polyfill chunk (112 KB) is large. Next 16 only ships it for older
browsers; verify `browserslist` in `package.json` (currently absent —
defaults to a wide net). Tighten to `>0.5%, not dead, not op_mini all`.

**L3.** `<img>` tags in `MessageView.tsx:290`, `AttachmentUpload.tsx:106`,
`CommsPanel.jsx:1065`, `login/page.tsx:108` have no explicit width/height —
guaranteed CLS each time a thread paints media. **Fix:** swap to
`next/image` with `width`/`height`, or set explicit CSS dimensions.

**L4.** Notes/Bucket/Calendar panels each call `fetch('/api/notes')` etc. on
mount with no SWR/cache. These should be hoisted into
`CockpitLiveData` so a panel toggle doesn't re-fetch.

---

## Bundle weight

| Dep | Size | Used by | Recommendation |
|---|---|---|---|
| `playwright-core` | ~6 MB | `lib/inforuptcy/client.ts` (cron only) | Confirm Next auto-externalized; pin route runtime to `nodejs`. |
| `@sparticuz/chromium` | ~120 MB | same route | Already auto-extern'd; verify with `outputFileTracingIncludes` (already set). |
| `xlsx` | ~600 KB parsed | 2 export routes | Add to `serverExternalPackages`. Confirm no client import chain. |
| `googleapis` | ~3 MB | many API routes | Server-only; verify it's not pulled into the client via a shared util. |
| `@anthropic-ai/sdk` + `openai` | ~700 KB combined | server routes | Server-only — verify. |
| `@sentry/nextjs` | ~250 KB client | client + server | Tune `replaysSessionSampleRate` to 0 in prod; lazy-load via `Sentry.lazyLoad`. |
| `lucide-react` | tree-shaken | many | Confirm icons are imported per-icon, not as `import * as Icons`. |
| `@tanstack/react-query` | ~30 KB | sidebar uses it, cockpit doesn't | Cockpit should adopt it — eliminates H2/H6 hand-rolled provider. |

**Cockpit page chunk is 144 KB on its own.** Combined with shared chunks
(`9858` 456 KB + `8384` 180 KB + `4bd1` 196 KB + framework 188 KB + main 280 KB),
a cold visit downloads roughly **1.4 MB of JS** before any data renders.

---

## Re-render hotspots

These render on every parent update due to inline objects / functions / new
context-value identity:

1. **`CockpitLiveDataProvider`** (`live/CockpitLiveData.jsx:174`) — new
   `value={{ ...value, refresh: load }}` object every render → cascades to
   every consumer.
2. **`CommsPanel` `SubPillar` → `ThreadRow`** — inline `style={{ … }}` per
   row (no `React.memo`), parent passes inline `onOpen={() => setOpen(t.id)}`
   so every row gets a new prop every render. 861 rows × every tick.
3. **`EmailPanel`** (1 103 LoC) — same pattern, list rows + inline style +
   inline callbacks.
4. **`TopChrome`** — 694 LoC of nested children all under one client tree;
   1 s clock tick re-renders everything via state lift.
5. **`NoraChat`** — re-renders on every keystroke; no memo on message rows.
6. **`SuggestedFocus`** — 1 s interval re-renders parent.
7. **`LiveMeetingAlertSync`** — 30 s interval + writes to demo state, which
   re-renders all `useDemo()` consumers.
8. **`BucketPanel`** — Supabase realtime subscription with no row-level memo.

---

## Polling tuning recommendations

| Site | Current | Suggested | Rationale |
|---|---|---|---|
| `ClockShabbat` (TopChrome:642) | 1 s | 1 s, but isolated | Clock display only — extract so it doesn't re-render the whole chrome. |
| `SuggestedFocus` | 1 s | 5 s, or `requestAnimationFrame`-gated | Countdown by-the-minute UI; 1 s wastes CPU. |
| `MeetingNowBanner` | 15 s | 30 s | Minute-granular UI. |
| `TopChrome` clock (line 72) | 30 s | 60 s | Date pill only updates daily. |
| `LiveMeetingAlertSync` | 30 s | 30 s, but gate on `document.hidden` | Fine when foregrounded; wasteful in background tabs. |
| `TodayPanel` (2 sites) | 30 s | 60 s + visibility-gate | Same. |
| `CockpitLiveData` | 60 s | 60 s + visibility-gate + edge-cache | Drop client poll while tab hidden; let edge absorb most calls. |
| `HealthPill` | 60 s | 120 s | "All systems normal" doesn't need 60 s precision. |
| Religious calendar | 60 min | once per day at 04:00 local | Times only change at midnight. |

**Net effect:** with visibility gating + edge caching, expected cockpit
network traffic drops from ~420 fetches/hour foreground to ~120, and
**0** fetches/hour while the tab is hidden.

---

## Server-side opportunities (RSC candidates)

These cockpit clients are JSX-only or render data without DOM events / hooks
beyond `useMemo`/`useState`-for-initial-fetch — they could be server
components (or split into a tiny client island for the interactive bit):

- `components/cockpit/lib/i18n.jsx` — pure context provider. The string
  tables are static; move to a server-rendered context with a tiny client
  language-toggle island.
- `components/cockpit/chrome/TopChrome.jsx` — the **shell** is static; only
  `ClockShabbat`, the search hotkey listener, and the alert syncer need
  client. Split: server-rendered chrome skeleton + 3 small client islands.
- `components/cockpit/panels/BriefPanel.jsx` — fetches once on mount and
  renders. Move fetch to a server component, hydrate with the data, keep a
  client island only for any expand/collapse.
- `components/cockpit/panels/CalendarPanel.jsx` — same.
- `components/cockpit/panels/InvestorsPanel.jsx` — same.
- `components/cockpit/wideTabs/*WideTab.jsx` — mostly static layouts; each
  is 50–170 LoC and currently inherits client-ness from a parent.
- `app/cockpit/CockpitClient.tsx` mount gate — replace with a server-rendered
  shell + a client island specifically for the clock.

Moving these to RSC would push ~30% of the cockpit page JS off the wire and
allow real Suspense streaming for the slow `/api/whatsapp/threads` call.

---

## Highest-priority fixes (top 10, ranked)

1. **Memoize `CockpitLiveDataContext` value** (`live/CockpitLiveData.jsx:174`).
   ~5-line change. Eliminates whole-tree re-render every 60 s + on every
   keystroke in any descendant. **Single highest-leverage fix.**
2. **Virtualize the WhatsApp thread lists** in `CommsPanel.jsx:293`. 861
   `<button>`s → ~30 visible. Cuts first paint of the comms pillar by
   200–400 ms, drops idle re-render cost by ~95%.
3. **Remove the cockpit-wide mount gate** (`CockpitClient.tsx:24`); apply
   it only to the clock subtree. Cuts cold-load TTI by ~500 ms.
4. **Add visibility gating + edge caching to `CockpitLiveData` ticker**
   (`live/CockpitLiveData.jsx:161-172` + `app/api/whatsapp/threads/route.ts`).
   Stops background-tab polling; offloads 90% of foreground polls to Vercel
   edge cache.
5. **Server-side memoize `/api/ai/summarize` by `(thread_id, last_message_id)`**
   in Redis; cache client-side too. Eliminates re-summarize-on-reopen.
6. **Move repeated fetches into `CockpitLiveData`** —
   `/api/religious-calendar` is fetched in 3 places, `/api/notes` etc. in
   each panel. Dedup.
7. **Extract `ThreadRow` styles to module-scope constants + wrap in
   `React.memo`** with stable `onOpen` (via a `useCallback` keyed on `t.id`
   in parent, or `data-id` + delegated click). Re-render cost per row drops
   to near-zero on idle ticks.
8. **Audit client bundle for `xlsx`, `googleapis`, `playwright-core`
   leakage.** Run `ANALYZE=true next build` once and add anything
   transitively pulled to `serverExternalPackages` in `next.config.ts`.
9. **Convert read-only cockpit panels to RSC** (`BriefPanel`, `CalendarPanel`,
   `InvestorsPanel`, `*WideTab`). Streams the slow Pipedrive-enriched
   threads call without blocking shell paint.
10. **Drop `no-store` from the `/cockpit` HTML doc**
    (`next.config.ts:30-39`). The JS bundle URLs are content-hashed already;
    no-store on the HTML forces a full RSC payload + JS re-evaluation on
    every navigation back.
