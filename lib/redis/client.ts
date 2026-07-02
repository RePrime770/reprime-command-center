import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client (architecture §4 spine item).
 *
 * ~10 routes hand-roll `new Redis({ url, token })` today; this module is the
 * single extraction point. Existing call sites are NOT refactored here — they
 * migrate opportunistically as routes are touched (DRY, not a big-bang
 * refactor).
 *
 * Contract: everything degrades gracefully. No UPSTASH env → `getRedis()`
 * returns null and the JSON helpers no-op (get → null, set → false). Redis
 * errors are logged server-side and swallowed — a cache must never take a
 * route down.
 */

const TAG = 'redis/client'

/** Env-gated client. Null when Upstash isn't configured (presence only). */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

/**
 * Read a JSON value. Returns null when Redis is unconfigured, the key is
 * absent, or the read fails — callers treat null as "cache miss".
 */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const value = await redis.get<T>(key)
    return value ?? null
  } catch (err: unknown) {
    // Log full error server-side only (public repo / live cockpit — never
    // echo provider internals to any client; same posture as safeError).
    console.error(`[${TAG}] get failed`, key, err)
    return null
  }
}

/**
 * Write a JSON value, optionally with a TTL in seconds. Returns true on a
 * successful write, false when Redis is unconfigured or the write fails.
 */
export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
      await redis.set(key, value, { ex: Math.floor(ttlSeconds) })
    } else {
      await redis.set(key, value)
    }
    return true
  } catch (err: unknown) {
    console.error(`[${TAG}] set failed`, key, err)
    return false
  }
}
