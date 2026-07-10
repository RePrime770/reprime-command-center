import type { CronManifestEntry } from '../cron/manifest'
import type { Heartbeat } from '../cron/heartbeat'
import type { HealthIntegration, HealthSnapshot } from './settings-view'

/**
 * System Health deck view-model — pure derivations for /cockpit/system
 * (roadmap Phase 3). Same convention as settings-view.ts: data in, display
 * facts out, zero I/O, unit-tested (lib/-only Vitest include).
 *
 * Sources it derives from:
 *   - GET /api/system/crons  → CRON_MANIFEST entries joined with heartbeats
 *   - GET /api/system/schema → requirements[] + pendingMigrations[]
 *   - GET /api/health        → PLAIN JSON, names + booleans ONLY (never values)
 */

/** One row of /api/system/crons `data.crons`. */
export interface CronRunView extends CronManifestEntry {
  lastRun: Heartbeat | null
}

/** Badge state for one cron row — the deck's four-color legend. */
export type CronHealth = 'ok' | 'error' | 'overdue' | 'never'

const MS_PER_MINUTE = 60_000
const MS_PER_SECOND = 1_000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY

/** A cron is overdue past `OVERDUE_MULTIPLIER × cadence` … */
export const OVERDUE_MULTIPLIER = 2
/** … but never sooner than this floor, so minute-crons don't flap amber. */
export const OVERDUE_FLOOR_MINUTES = 5

/** "Just now" cutoff for relative timestamps. */
const JUST_NOW_MAX_SECONDS = 60

/**
 * Classify one cron's heartbeat into the badge legend:
 *   never   → no heartbeat recorded (or an unparseable one — never fake green)
 *   error   → the last run itself failed (lastRun.ok false), regardless of age
 *   overdue → last success is older than max(2 × cadence, 5 min)
 *   ok      → fresh successful run
 */
export function cronHealth(
  cron: Pick<CronRunView, 'expectedEveryMinutes' | 'lastRun'>,
  nowMs: number
): CronHealth {
  const { lastRun } = cron
  if (!lastRun) return 'never'
  if (lastRun.ok === false) return 'error'

  const atMs = Date.parse(lastRun.at)
  if (!Number.isFinite(atMs)) return 'never'

  const thresholdMs =
    Math.max(OVERDUE_MULTIPLIER * cron.expectedEveryMinutes, OVERDUE_FLOOR_MINUTES) *
    MS_PER_MINUTE
  return nowMs - atMs > thresholdMs ? 'overdue' : 'ok'
}

/** Short human cadence label from the manifest's expectedEveryMinutes. */
export function cadenceLabel(expectedEveryMinutes: number): string {
  if (expectedEveryMinutes <= 1) return 'every minute'
  if (expectedEveryMinutes === MINUTES_PER_HOUR) return 'hourly'
  if (expectedEveryMinutes === MINUTES_PER_DAY) return 'daily'
  if (expectedEveryMinutes < MINUTES_PER_HOUR) return `every ${expectedEveryMinutes} min`
  if (expectedEveryMinutes % MINUTES_PER_HOUR === 0) {
    return `every ${expectedEveryMinutes / MINUTES_PER_HOUR} hr`
  }
  return `every ${expectedEveryMinutes} min`
}

/**
 * Small local relative-time label (no dependency): "just now", "5 min ago",
 * "3 hr ago", "2 days ago". Clock skew clamps to "just now"; junk input
 * degrades to a stable placeholder.
 */
export function relativeTimeLabel(iso: string, nowMs: number): string {
  const atMs = Date.parse(iso)
  if (!Number.isFinite(atMs)) return 'unknown'

  const seconds = Math.max(0, Math.floor((nowMs - atMs) / MS_PER_SECOND))
  if (seconds < JUST_NOW_MAX_SECONDS) return 'just now'

  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min ago`

  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  if (hours < HOURS_PER_DAY) return `${hours} hr ago`

  const days = Math.floor(hours / HOURS_PER_DAY)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Run duration for the grid: "812 ms" / "1.2 s" / "2 min". Junk → em dash. */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`

  const seconds = ms / MS_PER_SECOND
  if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds * 10) / 10} s`

  return `${Math.round(seconds / SECONDS_PER_MINUTE)} min`
}

/** Ready-vs-total pair for the StatCard strip ("x/y"). */
export interface Tally {
  ready: number
  total: number
}

const EMPTY_TALLY: Tally = { ready: 0, total: 0 }

/** Crons whose health reads 'ok' right now. */
export function cronTally(
  crons: readonly Pick<CronRunView, 'expectedEveryMinutes' | 'lastRun'>[] | null | undefined,
  nowMs: number
): Tally {
  if (!Array.isArray(crons)) return EMPTY_TALLY
  return {
    ready: crons.filter((c) => cronHealth(c, nowMs) === 'ok').length,
    total: crons.length,
  }
}

/** Schema requirements probing 'ready' (see /api/system/schema). */
export function schemaTally(
  requirements: readonly { status?: string }[] | null | undefined
): Tally {
  if (!Array.isArray(requirements)) return EMPTY_TALLY
  return {
    ready: requirements.filter((r) => r && r.status === 'ready').length,
    total: requirements.length,
  }
}

/** Integrations reporting ok:true in /api/health. */
export function integrationTally(
  integrations: readonly Pick<HealthIntegration, 'ok'>[] | null | undefined
): Tally {
  if (!Array.isArray(integrations)) return EMPTY_TALLY
  return {
    ready: integrations.filter((it) => it && it.ok === true).length,
    total: integrations.length,
  }
}

/** /api/health payload fields the System deck consumes (superset of settings'). */
export interface SystemHealthSnapshot extends HealthSnapshot {
  sha?: string
  db?: { reachable?: boolean; latencyMs?: number }
}

/** Stable display name for the DB reachability check. */
const DB_CHECK_NAME = 'database'

/**
 * Flatten /api/health into name/ok rows for the deploy card: the DB ping
 * first, then every env-presence flag. NAMES AND BOOLEANS ONLY — /api/health
 * never returns values, and neither does this.
 */
export function healthCheckFlags(
  health: SystemHealthSnapshot | null | undefined
): { name: string; ok: boolean }[] {
  if (!health || typeof health !== 'object') return []

  const rows: { name: string; ok: boolean }[] = []
  if (typeof health.db?.reachable === 'boolean') {
    rows.push({ name: DB_CHECK_NAME, ok: health.db.reachable })
  }

  const env = health.env && typeof health.env === 'object' ? health.env : {}
  for (const [name, present] of Object.entries(env)) {
    if (typeof present === 'boolean') rows.push({ name, ok: present })
  }

  return rows
}
