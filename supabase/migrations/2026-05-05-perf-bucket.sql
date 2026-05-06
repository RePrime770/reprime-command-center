-- ─── 2026-05-05 PERF: bucket_items composite index ──────────────────────────
-- Backs the GET /api/bucket?status=open hot path. The existing
-- bucket_items_status_idx only covers the WHERE; the planner still has to
-- sort the result set by (priority asc, created_at desc), which on a
-- backlog-heavy day means a sort over hundreds of rows on every request.
--
-- This composite index matches the query's ORDER BY exactly so the planner
-- can do an index-only ordered scan, no sort node, return early at the
-- LIMIT 500. Status is the leading column so it also serves single-status
-- IN (...) filters from the column views.
--
-- Idempotent — safe to re-run.

create index if not exists bucket_items_status_priority_created_idx
  on public.bucket_items (status, priority asc, created_at desc);
