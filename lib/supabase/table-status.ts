import { createServiceClient } from './server'

/**
 * probeTable — does a table exist in the live database?
 *
 * The graceful-degradation contract (docs/COMMAND_CENTER_ARCHITECTURE.md §3.4):
 * features whose tables haven't been migrated yet must render a named
 * "migration required" state instead of crashing, and must flip live with
 * zero deploys once Gideon runs the SQL. This probe is the single source of
 * that answer.
 *
 * Implementation: service-role `select limit 0` (no rows transferred).
 * Postgres error 42P01 ("relation does not exist") — or PostgREST's
 * equivalent message — means migration_required. Anything else is 'error'
 * (connectivity, RLS misconfig) so callers never mistake an outage for a
 * missing migration.
 *
 * Results are module-cached for 5 minutes per table: cheap on hot paths and
 * self-healing after a migration runs (cache expiry ≤5 min, no deploy).
 */
export type TableStatus = 'ready' | 'migration_required' | 'error'

export const TABLE_PROBE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  status: TableStatus
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/** Test hook — clears the module cache (also useful after running a migration in dev). */
export function clearTableStatusCache(): void {
  cache.clear()
}

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42P01') return true
  return typeof err.message === 'string' && err.message.includes('does not exist')
}

type ProbeClient = Pick<ReturnType<typeof createServiceClient>, 'from'>

export async function probeTable(
  name: string,
  opts?: { client?: ProbeClient; now?: number }
): Promise<TableStatus> {
  const now = opts?.now ?? Date.now()
  const cached = cache.get(name)
  if (cached && cached.expiresAt > now) return cached.status

  let status: TableStatus
  try {
    const client = opts?.client ?? createServiceClient()
    const { error } = await client.from(name).select('*', { head: true, count: 'exact' }).limit(0)
    if (!error) status = 'ready'
    else if (isMissingTableError(error)) status = 'migration_required'
    else status = 'error'
  } catch (err) {
    status = isMissingTableError(err as { code?: string; message?: string })
      ? 'migration_required'
      : 'error'
  }

  // Don't cache transient errors — a flapping DB shouldn't stick for 5 min.
  if (status !== 'error') {
    cache.set(name, { status, expiresAt: now + TABLE_PROBE_TTL_MS })
  }
  return status
}

/** Probe several tables concurrently; returns name → status. */
export async function probeTables(
  names: readonly string[],
  opts?: { client?: ProbeClient; now?: number }
): Promise<Record<string, TableStatus>> {
  const statuses = await Promise.all(names.map((n) => probeTable(n, opts)))
  return Object.fromEntries(names.map((n, i) => [n, statuses[i]]))
}

function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703') return true
  return typeof err.message === 'string' && err.message.includes('does not exist')
}

/**
 * Column-level probe — for migrations that only ADD a column to an existing
 * table (e.g. whatsapp_threads.lane_override), where a table probe can't see
 * the pending state. 42703 (undefined column) → migration_required.
 * Cached under "table.column" with the same TTL/error semantics as tables.
 */
export async function probeColumn(
  table: string,
  column: string,
  opts?: { client?: ProbeClient; now?: number }
): Promise<TableStatus> {
  const key = `${table}.${column}`
  const now = opts?.now ?? Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.status

  let status: TableStatus
  try {
    const client = opts?.client ?? createServiceClient()
    const { error } = await client.from(table).select(column).limit(0)
    if (!error) status = 'ready'
    else if (isMissingColumnError(error) || isMissingTableError(error)) status = 'migration_required'
    else status = 'error'
  } catch (err) {
    const e = err as { code?: string; message?: string }
    status = isMissingColumnError(e) || isMissingTableError(e) ? 'migration_required' : 'error'
  }

  if (status !== 'error') {
    cache.set(key, { status, expiresAt: now + TABLE_PROBE_TTL_MS })
  }
  return status
}
