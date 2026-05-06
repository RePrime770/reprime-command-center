# Pipedrive bulk-import — results report

Branch: `chore/run-pipedrive-bulk-import`
Run by: code28
Run window: 2026-05-06 00:49 UTC → 01:09 UTC (4 successive runs against prod)

## Headline

| Metric | Before | After |
|---|---|---|
| Pipedrive Persons total | 7 | **752** |
| `contact_directory` Supabase table | did not exist | 939 rows ingested (canonical) |
| `blocked_contacts` Supabase table | did not exist | created (idempotent migration) |
| `chore/run-pipedrive-bulk-import` branch | n/a | created off `origin/main`, draft PR |

The dispatch's success criterion ("Pipedrive contact count visibly increased — curl to `/api/pipedrive/search?q=.` returning 50+ persons") is met by an order of magnitude.

## What had to happen first

The dispatch assumed `contact_directory` was already populated. It wasn't —
the underlying overnight migration had never been applied to production
Supabase, so the table didn't exist. Three sequential prerequisites had
to land before the bulk-import could run:

1. **Apply `supabase/overnight_migration.sql` to production Supabase.**
   Creates `contact_directory` and `blocked_contacts` plus their RLS
   policies. Idempotent (`CREATE TABLE IF NOT EXISTS`). Direct DB
   connection from this Windows host was blocked (no `psql` installed,
   `db.PROJECT.supabase.co` doesn't resolve from this network, and
   `aws-0-REGION.pooler.supabase.com` returned "Tenant or user not
   found" in every region probed). Resolved by extension2 applying the
   SQL via Supabase Studio. Verified: table exists, count=0.

2. **Ingest the 939-row xlsx into `contact_directory`.**
   `scripts/ingest-contact-directory.mjs` patched to auto-load
   `.env.local` (the only behavior change — original required env vars
   to be exported manually). Ran clean: 939 upserts, 0 failed.

3. **Push `contact_directory` → Pipedrive Persons.**
   `scripts/run-bulk-import.mjs` mirrors the exact dedupe rules from
   `lib/pipedrive/bulk-upsert.ts`: email-first, phone-second match;
   PATCH only fields the existing record lacks; otherwise create.
   Runs locally against prod APIs — no Vercel route, no auth-bypass
   commit, no 5-min timeout.

## Why we did not use the route

The dispatch suggested a temporary Bearer auth bypass on
`/api/pipedrive/bulk-import`. That path does not work for two reasons:

1. **Vercel `maxDuration = 300`.** 939 rows × 3-5 Pipedrive API calls
   per row = 30+ minutes of real runtime. The route would time out
   at the 5-minute Vercel cap and lose state mid-run.
2. **Auth-bypass commit risk.** Even after a revert, the bypass code
   lives in git history forever. Local execution against the same
   library logic eliminates this attack surface.

Local execution of the same dedupe logic = identical correctness
guarantees, no infrastructure constraints, no security tradeoff.

## Final bulk-import run (the one that landed cleanly)

The fourth and final run added retry-on-429 with exponential backoff
to the Pipedrive HTTP wrapper. Earlier runs hit Pipedrive's 10-req /
2-sec burst limit on the search endpoint and lost ~31 rows to 429
errors; the retry logic eliminated those.

```
Started:  2026-05-06T01:04:30.020Z
Finished: 2026-05-06T01:09:38.852Z   (~5 min wall clock)
Source:   contact_directory (939 rows)

Total processed: 939
Created:         309
Updated:         0
Skipped:         630   (of which: 0 errors, 630 "no new fields to add")
Errors:          0
```

The 630 "skipped — no new fields" is the correct idempotent outcome.
Each contact_directory row matched an existing Pipedrive person
(created on an earlier run in this session) whose record already
contained the email, phone, name, org, and tag values.

Cumulatively across all four runs:

```
Pipedrive Persons:  7 → 752  (+745)
```

The gap between 939 source rows and 752 created persons is expected:
- Some rows in `contact_directory` have empty `canonical_name` AND
  null email AND null phone — those are skipped at row level.
- Some rows match the same Pipedrive person (Gideon's own line, family
  members, etc.) — multiple source rows collapse to one person.
- Some rows contain only a name with no contact data — created with
  name only.

## Errors

**Zero errors on the final run.**

Earlier runs (without 429 retry) lost rows 93-97 to "request over
limit" 429s — the source data for those rows was clean, the failure
was purely rate-limit pressure on the search endpoint. The 429 retry
in the final run handled them.

## Files in this PR

| File | Purpose |
|---|---|
| `scripts/run-bulk-import.mjs` | New — the local bulk-import runner |
| `scripts/ingest-contact-directory.mjs` | Patched — auto-loads `.env.local` |
| `scripts/count-pipedrive-persons.mjs` | New — small verification helper |
| `.gitignore` | Added `bulk-import.log` |
| `results.md` | This report |

The `pg` and `supabase` npm packages were installed transiently
(`--no-save`) into the main dashboard `node_modules` for diagnostic
work; neither appears in `package.json` and both can be removed by
reinstalling deps.

## Security incident — must rotate

While debugging the failed direct-DB connection, the production
Supabase database password printed to the chat transcript via a
Node `console.log` masking bug. The leak only exists in the chat;
no committed file contains the value. **Gideon must rotate
`SUPABASE_DB_URL` at supabase.com/dashboard → Settings → Database
→ Reset database password, update the Vercel env var, redeploy,
and update `dashboard/.env.local`.**

## Next-up cleanup (out of scope for this PR)

1. Re-running the ingest produces extra rows in `contact_directory`
   each pass, because the unique constraint
   `(canonical_name, primary_phone)` does not deduplicate rows where
   `primary_phone IS NULL` (Postgres NULL-not-equal semantics).
   Recommend adding a partial unique index on `(canonical_name)`
   `WHERE primary_phone IS NULL`, or switching the upsert key to a
   COALESCE'd column.
2. Pipedrive currently has 752 Persons but ~745 of them have minimal
   data (name + one email + one phone, no org for many). A follow-up
   enrichment pass (LinkedIn / Apollo / web search) would lift this
   list from "phonebook" to "addressable book."

— code28
