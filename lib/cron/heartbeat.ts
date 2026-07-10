import { redisGetJson, redisSetJson } from '../redis/client'

/**
 * Cron heartbeats (architecture §8 Phase 3).
 *
 * Every cron-scheduled route stamps `cron:heartbeat:<name>` after its real
 * work so GET /api/system/crons can render "last ran / took / ok". Names come
 * from lib/cron/manifest.ts.
 *
 * Contract: a heartbeat failure can NEVER break a cron. `stampCronRun` never
 * throws and never rejects — errors are logged server-side only. When Upstash
 * is unconfigured, lib/redis/client already degrades to a silent no-op
 * (set → false, get → null), so both helpers no-op cleanly.
 */

export interface Heartbeat {
  /** ISO timestamp of when the run finished. */
  at: string
  /** Did the run complete without a handled or unhandled error? */
  ok: boolean
  /** Wall-clock duration of the run in milliseconds. */
  ms: number
  /** Optional short annotation (stable text only — never raw error messages). */
  note?: string
}

const HEARTBEAT_KEY_PREFIX = 'cron:heartbeat:'
const HEARTBEAT_TTL_SECONDS = 7 * 24 * 3600 // 7 days — outlives any daily cadence

const TAG = 'cron/heartbeat'

/**
 * Record the outcome of one cron run. Fire-and-forget safe: resolves
 * (undefined) no matter what — Redis down, unconfigured, or throwing.
 */
export async function stampCronRun(
  name: string,
  result: { ok: boolean; ms: number; note?: string }
): Promise<void> {
  try {
    const value: Heartbeat = {
      at: new Date().toISOString(),
      ok: result.ok,
      ms: result.ms,
      ...(result.note ? { note: result.note } : {}),
    }
    await redisSetJson(HEARTBEAT_KEY_PREFIX + name, value, HEARTBEAT_TTL_SECONDS)
  } catch (err: unknown) {
    // Log server-side only — never let a heartbeat break the cron that ran.
    console.error(`[${TAG}] stamp failed`, name, err)
  }
}

/**
 * Read heartbeats for a set of cron names. Misses (never ran, expired, or
 * Redis unconfigured) map to null — callers render "no run recorded".
 */
export async function readHeartbeats(
  names: string[]
): Promise<Record<string, Heartbeat | null>> {
  const values = await Promise.all(
    names.map((name) => redisGetJson<Heartbeat>(HEARTBEAT_KEY_PREFIX + name))
  )
  return Object.fromEntries(names.map((name, i) => [name, values[i] ?? null]))
}
