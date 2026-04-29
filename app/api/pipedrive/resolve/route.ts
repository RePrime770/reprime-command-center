import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/timelines/normalize-phone'
import {
  findPersonByPhone,
  getPersonActivities,
  getPersonFieldKeyByName,
  type PipedrivePerson,
  type PipedriveActivity,
} from '@/lib/pipedrive/client'
import type { Panel } from '@/lib/timelines/types'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const CACHE_TTL = 3600

type ResolvePayload = {
  person: PipedrivePerson | null
  activities: PipedriveActivity[]
  fieldKeys: { dashboard: string | null; tag: string | null }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawPhone = searchParams.get('phone')
  const panel = searchParams.get('panel') as Panel | null
  if (!rawPhone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 })
  }

  const phone = normalizePhone(rawPhone)
  if (!phone) {
    return NextResponse.json(
      { person: null, activities: [], fieldKeys: { dashboard: null, tag: null } } satisfies ResolvePayload
    )
  }

  const redis = getRedis()
  const cacheKey = `pipedrive:phone:${phone}`

  if (redis) {
    const cached = await redis.get<ResolvePayload>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  let person: PipedrivePerson | null = null
  let activities: PipedriveActivity[] = []
  let dashboardKey: string | null = null
  let tagKey: string | null = null

  try {
    person = await findPersonByPhone(phone)
    if (person) {
      const [acts, dk, tk] = await Promise.all([
        getPersonActivities(person.id, 3),
        getPersonFieldKeyByName('Notes from Dashboard'),
        getPersonFieldKeyByName('Tag'),
      ])
      activities = acts
      dashboardKey = dk
      tagKey = tk
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'pipedrive_error', message: (err as Error).message },
      { status: 502 }
    )
  }

  const payload: ResolvePayload = {
    person,
    activities,
    fieldKeys: { dashboard: dashboardKey, tag: tagKey },
  }

  if (redis) {
    await redis.set(cacheKey, payload, { ex: CACHE_TTL })
  }

  if (person && panel) {
    const service = createServiceClient()
    await service
      .from('whatsapp_threads')
      .update({ pipedrive_contact_id: person.id })
      .eq('panel', panel)
      .eq('phone', phone)
  }

  return NextResponse.json(payload)
}
