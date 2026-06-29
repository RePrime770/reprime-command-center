# TEST_RESULTS.md

Run date: 2026-06-29
Branch state: working tree at session HEAD (does not yet include the in-flight
`lib/adapters/status.ts` + `lib/adapters/registry.ts` + `lib/adapters/status.test.ts`
work being added in parallel by another agent — those files are not in the
inventory below).

## Commands run

```bash
npx tsc --noEmit 2>&1 | tail -40
npm test 2>&1 | tail -60
npx next build --webpack 2>&1 | tail -60
find . -name "*.test.*" -not -path "*/node_modules/*" -not -path "*/.next/*" \
  | xargs wc -l 2>/dev/null
```

### `npx tsc --noEmit`

```
(no output)
```

Exit code 0. No diagnostics emitted.

### `npm test`

```
> dashboard@0.1.0 test
> vitest run

 RUN  v2.1.9 /Users/mkazi/Command Center/reprime-command-center

 ✓ lib/bucket/cache.test.ts (4 tests) 3ms
 ✓ lib/scoring/email.test.ts (36 tests) 12ms
 ✓ lib/scoring/investor-cadence.test.ts (29 tests) 24ms
 ✓ lib/voice/parser.test.ts (33 tests) 16ms

 Test Files  4 passed (4)
      Tests  102 passed (102)
   Start at  23:33:43
   Duration  668ms
```

### `npx next build --webpack`

```
▲ Next.js 16.2.4 (webpack)
- Environments: .env.local
- Experiments (use with caution):
  · clientTraceMetadata

  Creating an optimized production build ...
✓ Compiled successfully in 15.7s
  Running TypeScript ...
  Finished TypeScript in 25.5s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/12) ...
✓ Generating static pages using 9 workers (12/12) in 902ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)
  (full route table emitted — pages + ~60 API routes, all compiled)

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

(Build also emitted benign warnings about the `@next/swc-darwin-arm64`
native binding missing on this machine — Next falls back to the WASM SWC
binding and the build proceeds normally. No secret values were echoed.)

## tsc result

**PASS.** Zero type errors across the entire app + lib + scripts. The
`tsconfig.tsbuildinfo` is current.

## npm test result

**PASS — 4 suites / 102 tests / 102 passed / 0 failed.**

| Suite | Tests |
|-------|-------|
| `lib/bucket/cache.test.ts` | 4 |
| `lib/scoring/email.test.ts` | 36 |
| `lib/scoring/investor-cadence.test.ts` | 29 |
| `lib/voice/parser.test.ts` | 33 |

No failing tests, no skipped tests. Total runtime under one second — the
suite is small enough that we can grow it significantly before runtime
becomes a constraint.

## Build result (`next build --webpack`)

**PASS.** Webpack production build completed successfully in roughly 42s
end-to-end (15.7s compile + 25.5s TypeScript + ~1s static page generation
across 12 prerenderable routes). All ~60 API routes registered as dynamic
server functions. Middleware (`proxy.ts`) compiled. No build-time errors;
warnings limited to the missing `@next/swc-darwin-arm64` native binding,
which Next handles by falling back to WASM SWC.

Note: `next build` (Turbopack default in Next 16) fails on this machine
because the darwin-arm64 SWC native binding is not installed; we used the
`--webpack` flag as the runbook prescribes. CI (Vercel) installs the
native binding and uses the default code path.

## Test files inventory

| Path | LOC | Covers |
|------|-----|--------|
| `lib/bucket/cache.test.ts` | 29 | In-memory bucket cache TTL/get/set semantics. |
| `lib/scoring/email.test.ts` | 243 | Inbound email scoring — investor cadence inputs, subject-mentions-deal heuristics, priority bands. |
| `lib/scoring/investor-cadence.test.ts` | 288 | Investor-cadence scoring math separately from `email.ts` — staleness windows, weight curves. |
| `lib/voice/parser.test.ts` | 226 | Voice-command parser — intent matching, slot extraction, fallback paths. |
| **Total** | **786** | |

## Coverage estimate

- Test code: **786 LOC** across 4 files.
- Production code (`app/` + `lib/`, excluding `.test.*`): **25,341 LOC**.
- Naive ratio: **~3.1%** of source LOC is test LOC.

Even allowing that a single unit test typically exercises 5–10× its own
LOC of production code, a generous upper bound on effective behavioural
coverage is roughly **15–30% of `lib/` pure logic and ~0% of `app/api/*`
route handlers**. The four tested modules (`bucket/cache`, `scoring/email`,
`scoring/investor-cadence`, `voice/parser`) are precisely the modules
where parsing/scoring math is most clearly isolated — they are well
covered. Everything outside those four is untested.

**Verdict: critically thin.** The codebase has 25k+ lines of production
TypeScript and 786 lines of tests. Every Gmail/Pipedrive/Hebcal/Slack/
WhatsApp/Zoom adapter, every cron handler, and every `/api/*` route is
exercised only via manual smoke testing today.

## Untested critical paths

The five highest-leverage gaps, in priority order:

1. **`lib/google/gmail.ts` (227 LOC).** Multi-account Gmail wrapper:
   `configuredAccounts()`, `listRecent()`, `getMessage()`,
   `parseFromHeader()`, `isInsufficientScopeError()`. Powers all inbound
   email ingest + Nora's email context. A regression here silently breaks
   the entire investor-comms pipeline.
   *Suggested test:* fixture-driven unit tests for `parseFromHeader` (RFC
   5322 edge cases — quoted display names, encoded-words, name-less
   addresses) and `isInsufficientScopeError` (matches against shape of
   googleapis 403 payloads). Mock the Gmail client for `listRecent`.

2. **`lib/zmanim/postville.ts` (191 LOC).** Hebcal REST client +
   Upstash-cached candle-lighting / havdalah window computation. Drives
   the Shabbat/Yom-Tov "do not disturb" gate that suppresses outbound SMS
   and notifications. Wrong answer here = either nuisance pings during
   Shabbat or missed sends after havdalah.
   *Suggested test:* unit-test the `ZmanimWindow` computation against
   recorded Hebcal API JSON fixtures for a known Friday and a known
   Yom-Tov, and assert candle/havdalah ISO strings are within ±1 minute.
   Mock Redis with an in-memory shim.

3. **`app/api/email/sync/route.ts` (324 LOC).** The triage cron: pulls
   from Gmail across configured accounts, scores each message with
   `lib/scoring/email.ts`, joins to Pipedrive investors, and writes
   sync-state to Supabase. Highest-LOC route handler in the codebase and
   the single point of failure for "did Nora see this email yet?"
   *Suggested test:* integration test with `gmail`, `pipedrive`, and
   `supabase` modules mocked at the boundary — feed in a stitched
   conversation thread and assert the scored output + the per-account
   cursor advance. Verifies the join logic (`investor tag → score
   weight`) end-to-end.

4. **`app/api/nora/chat/route.ts` (154 LOC) and the prompt-building helpers
   it pulls in.** Nora's chat endpoint composes the Anthropic prompt from
   recent Gmail summaries, Pipedrive deals, calendar windows, and zmanim
   state. Even though the underlying LLM call is non-deterministic, the
   pre-call **prompt assembly** is pure and currently has no tests — a
   silent regression that drops, say, the investor context block will
   degrade answers without surfacing any error.
   *Suggested test:* extract the prompt builder into a pure function and
   snapshot-test the assembled prompt against fixture inputs; assert
   each required context section is present and ordered.

5. **`lib/secretary/outbound-asks.ts` (131 LOC).** Composes outbound
   investor "asks" (the secretary follow-up workflow) and coordinates
   with the `secretary/poll-overdue` cron. Side-effecting code that
   touches Supabase + WhatsApp/SMS — easy to silently double-send or
   skip if the overdue-window math drifts.
   *Suggested test:* unit-test the overdue-window selector (given an
   array of asks with timestamps, returns exactly the ones eligible to
   send right now), plus a contract test that asserts the outbound
   payload shape matches what `lib/whatsapp` / `lib/quo` expect.

## Highest-priority test additions

Ranked by leverage (likelihood of catching a real regression × blast
radius of that regression):

1. `lib/google/gmail.ts` — header parsing + scope-error detection.
2. `lib/zmanim/postville.ts` — Hebcal window math with fixtures.
3. `app/api/email/sync/route.ts` — cron integration test with mocked
   adapters.
4. Nora prompt assembly (extract pure builder out of
   `app/api/nora/chat/route.ts`).
5. `lib/pipedrive/client.ts` — `parseInvestorTag`,
   `findPersonByEmail`, `listInvestorTaggedPersons` (referenced by
   email-sync but currently untested).
6. `lib/secretary/outbound-asks.ts` — overdue-window selector.
7. `lib/adapters/*` — once the in-flight `getStatus()` work lands, lock
   the registry shape and per-adapter health-check behaviour with the
   other agent's `lib/adapters/status.test.ts`.
8. `app/api/email/triage/route.ts` (165 LOC) — triage classification
   thresholds.
9. `app/api/phone/quo-webhook/route.ts` and
   `app/api/whatsapp/webhook/route.ts` — webhook signature verification
   and idempotency.
10. `app/api/secretary/poll-overdue/route.ts` — cron determinism +
    locking semantics (it must be safe to invoke concurrently from
    overlapping Vercel cron runs).

## Constraints honoured

- Doc-only + the four command invocations. No source files modified.
- No secret values were echoed from the build output; only environment
  *file names* (`.env.local`) appeared and are reproduced as-is.
- Word count under 2,500.
