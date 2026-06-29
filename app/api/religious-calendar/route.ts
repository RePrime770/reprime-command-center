import { NextResponse } from 'next/server'
import { getZmanim } from '@/lib/zmanim/postville'

export const dynamic = 'force-dynamic'

// Real candle-lighting / havdalah + upcoming Yom Tov for Gideon's location
// (Postville, IA — override with ZMANIM_ZIP). Backed by the free Hebcal REST
// API; cached 6h in Redis when available. Behind the dashboard auth gate
// (proxy.ts) since the cockpit calls it with the session cookie.
//
// Replaces the hardcoded Fri-18:00 / Sat-19:30 heuristic that previously lived
// in TopChrome — that was wrong by up to ~1.5h and ignored season/location/Yom Tov.
export async function GET() {
  try {
    const zmanim = await getZmanim(new Date())
    return NextResponse.json(zmanim)
  } catch {
    // Never 500 the cockpit chrome — return a quiet non-live payload so the
    // client falls back to its local heuristic.
    return NextResponse.json({
      location: 'Postville, IA',
      zip: process.env.ZMANIM_ZIP?.trim() || '52162',
      candleLighting: null,
      havdalah: null,
      isRestNow: false,
      title: null,
      upcoming: [],
      live: false,
    })
  }
}
