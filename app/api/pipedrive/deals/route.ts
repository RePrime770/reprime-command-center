import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServerClient } from '@/lib/supabase/server'
import { getStatus, listDeals, listStages } from '@/lib/pipedrive/client'
import {
  buildDealsPayload,
  EMPTY_DEALS_PAYLOAD,
  type DealsPayload,
} from '@/lib/pipedrive/deals-payload'
import { safeError } from '@/lib/api/safe-error'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const CACHE_KEY = 'pipedrive:deals:open:v1'
const CACHE_TTL = 600 // seconds — ~10 min per roadmap batch 4.1

// listDeals is single-page: if open deals ever exceed this limit the payload
// (and totals) undercount. Acceptable for a single-operator pipeline.
const DEALS_LIMIT = 200

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const status = getStatus()
  if (!status.ok) {
    // 200, NOT 5xx: CockpitLiveData.fetchJsonSafe returns null on non-OK
    // responses, which would erase the setup_required signal. Matches the
    // email/triage `secondary` setup convention.
    return NextResponse.json({
      ...EMPTY_DEALS_PAYLOAD,
      status: 'setup_required',
    } satisfies DealsPayload)
  }

  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get<DealsPayload>(CACHE_KEY)
      if (cached) return NextResponse.json(cached)
    } catch (err) {
      // Cache read failure is non-fatal — fall through to the live fetch.
      console.error('[pipedrive/deals] redis get failed', err)
    }
  }

  try {
    const [deals, stages] = await Promise.all([
      listDeals({ status: 'open', limit: DEALS_LIMIT }),
      listStages(),
    ])
    const payload = buildDealsPayload(deals, stages)
    if (redis) {
      try {
        await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL })
      } catch (err) {
        // Cache write failure is non-fatal — still return the live payload.
        console.error('[pipedrive/deals] redis set failed', err)
      }
    }
    return NextResponse.json(payload)
  } catch (err) {
    return safeError('pipedrive/deals', err, { code: 'pipedrive_error', status: 502 })
  }
}
