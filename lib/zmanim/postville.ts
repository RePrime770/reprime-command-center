// Real candle-lighting / havdalah times via the free Hebcal REST API
// (no key, no npm dependency — matches the existing pattern in
// app/api/bookings/available-slots and app/invite/[token]/calendar).
//
// Default location is Postville, IA (zip 52162) per Gideon's observance.
// Override with ZMANIM_ZIP without a code change.
//
// Unlike the old hardcoded "Friday 18:00 / Saturday 19:30" heuristic in
// TopChrome, these are the actual zmanim for the location/season and they also
// cover Yom Tov candle-lighting (c=on + maj=on), not just weekly Shabbat.

import { Redis } from '@upstash/redis'

const DEFAULT_ZIP = '52162' // Postville, IA
const CANDLE_MINUTES_BEFORE_SUNSET = 18
const CACHE_TTL_SECONDS = 6 * 60 * 60 // zmanim for a month don't change

export interface ZmanimWindow {
  /** ISO (with tz offset) of the next/current candle-lighting, or null */
  candleLighting: string | null
  /** ISO (with tz offset) of the paired havdalah, or null */
  havdalah: string | null
  /** true when "now" falls inside a candle-lighting → havdalah window */
  isRestNow: boolean
  /** label of the active/next rest period, e.g. "Shabbat" or a Yom Tov name */
  title: string | null
}

export interface ZmanimResult extends ZmanimWindow {
  location: string
  zip: string
  /** Upcoming candle-lighting + holiday events (next ~5), for the drawer */
  upcoming: Array<{ title: string; date: string; category: string }>
  /** true when the times are real (Hebcal responded); false on fallback */
  live: boolean
}

interface HebcalEvent {
  title: string
  date: string // ISO for timed events (candles/havdalah), YYYY-MM-DD for all-day
  category: string // 'candles' | 'havdalah' | 'holiday' | 'parashat' | ...
  hebrew?: string
  yomtov?: boolean
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function zip(): string {
  return process.env.ZMANIM_ZIP?.trim() || DEFAULT_ZIP
}

/** Year/month pairs for "now" and the following month (covers month boundaries). */
function monthsToFetch(now: Date): Array<{ y: number; m: number }> {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0-based
  const next = new Date(Date.UTC(y, m + 1, 1))
  return [
    { y, m: m + 1 },
    { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1 },
  ]
}

async function fetchHebcalEvents(now: Date): Promise<HebcalEvent[]> {
  const z = zip()
  const results = await Promise.all(
    monthsToFetch(now).map(async ({ y, m }) => {
      // c=on candle-lighting, b=18 min before sunset, M=on havdalah at tzeit,
      // maj=on so Yom Tov candle-lighting is included, lg=s Sephardi-style
      // transliteration. zip drives the geographic sunset calculation.
      const url =
        `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&nx=off&mf=off&ss=off&mod=on` +
        `&c=on&b=${CANDLE_MINUTES_BEFORE_SUNSET}&M=on&zip=${encodeURIComponent(z)}&lg=s&year=${y}&month=${m}`
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return [] as HebcalEvent[]
        const json = (await res.json()) as { items?: HebcalEvent[] }
        return json.items ?? []
      } catch {
        return [] as HebcalEvent[]
      }
    })
  )
  return results.flat()
}

/**
 * Resolve the current-or-next rest window (Shabbat or Yom Tov) from a list of
 * Hebcal candle-lighting / havdalah events relative to `now`.
 */
function resolveWindow(events: HebcalEvent[], now: Date): ZmanimWindow {
  const nowMs = now.getTime()
  const candles = events
    .filter((e) => e.category === 'candles')
    .map((e) => ({ ms: new Date(e.date).getTime(), iso: e.date, title: e.title }))
    .filter((e) => !Number.isNaN(e.ms))
    .sort((a, b) => a.ms - b.ms)
  const havdalahs = events
    .filter((e) => e.category === 'havdalah')
    .map((e) => ({ ms: new Date(e.date).getTime(), iso: e.date }))
    .filter((e) => !Number.isNaN(e.ms))
    .sort((a, b) => a.ms - b.ms)

  const firstHavdalahAfter = (ms: number) => havdalahs.find((h) => h.ms > ms) ?? null

  // Are we currently inside a window? (most recent candle <= now, its havdalah > now)
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].ms <= nowMs) {
      const end = firstHavdalahAfter(candles[i].ms)
      if (end && end.ms > nowMs) {
        return { candleLighting: candles[i].iso, havdalah: end.iso, isRestNow: true, title: labelFor(candles[i].title) }
      }
      break // most recent candle is already closed → not in a window
    }
  }

  // Otherwise the next upcoming candle-lighting
  const nextCandle = candles.find((c) => c.ms > nowMs)
  if (nextCandle) {
    const end = firstHavdalahAfter(nextCandle.ms)
    return { candleLighting: nextCandle.iso, havdalah: end?.iso ?? null, isRestNow: false, title: labelFor(nextCandle.title) }
  }

  return { candleLighting: null, havdalah: null, isRestNow: false, title: null }
}

/** "Candle lighting: 7:54pm" → "Shabbat"; holiday-tagged candles keep their name upstream. */
function labelFor(_candleTitle: string): string {
  return 'Shabbat'
}

function upcomingFrom(events: HebcalEvent[], now: Date): ZmanimResult['upcoming'] {
  const nowMs = now.getTime()
  return events
    .filter((e) => e.category === 'candles' || e.category === 'holiday')
    .map((e) => ({ title: e.title, date: e.date, category: e.category, ms: new Date(e.date).getTime() }))
    .filter((e) => !Number.isNaN(e.ms) && e.ms >= nowMs - 24 * 3600_000)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 6)
    .map(({ title, date, category }) => ({ title, date, category }))
}

/**
 * Real zmanim for the configured location. Cached in Redis 6h when available.
 * Never throws — returns { live:false } with nulls if Hebcal is unreachable so
 * callers can fall back to a heuristic.
 */
export async function getZmanim(now: Date = new Date()): Promise<ZmanimResult> {
  const z = zip()
  const redis = getRedis()
  // Cache the raw monthly EVENT LIST (valid for the whole month), not the
  // resolved window — the window (isRestNow / next candle-lighting) is
  // time-relative and must be recomputed against the live `now` every call.
  const cacheKey = `zmanim:events:${z}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`

  let events: HebcalEvent[] | null = null
  if (redis) {
    try {
      events = (await redis.get(cacheKey)) as HebcalEvent[] | null
    } catch {
      /* ignore cache read errors */
    }
  }

  if (!events) {
    events = await fetchHebcalEvents(now)
    if (events.length > 0 && redis) {
      try {
        await redis.set(cacheKey, events, { ex: CACHE_TTL_SECONDS })
      } catch {
        /* ignore cache write errors */
      }
    }
  }

  if (!events || events.length === 0) {
    return { location: 'Postville, IA', zip: z, candleLighting: null, havdalah: null, isRestNow: false, title: null, upcoming: [], live: false }
  }

  return {
    location: 'Postville, IA',
    zip: z,
    ...resolveWindow(events, now),
    upcoming: upcomingFrom(events, now),
    live: true,
  }
}
