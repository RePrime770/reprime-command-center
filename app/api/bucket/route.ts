import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import {
  bustBucketCache,
  isFresh,
  readBucketOpenCache,
  writeBucketOpenCache,
} from '@/lib/bucket/cache'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

const VALID_STATUSES = ['open', 'doing', 'done', 'dropped'] as const
type BucketStatus = (typeof VALID_STATUSES)[number]

const QUERY_TIMEOUT_MS = 5000

interface CreateBody {
  title?: string
  body?: string | null
  priority?: number
  due_at?: string | null
  source_url?: string | null
  source_type?: string | null
  assigned_to?: string | null
}

function clampPriority(p: unknown): number {
  const n = typeof p === 'number' ? p : Number(p)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(5, Math.round(n)))
}

/**
 * Race a thenable against a timer. Returns null on timeout. Never throws —
 * the caller decides what to do with null (return cached value, empty array,
 * or surface a degraded payload).
 */
async function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error(`[bucket] ${label} timed out after ${ms}ms`)
      resolve(null)
    }, ms)
  })
  try {
    return await Promise.race([Promise.resolve(p), timeoutPromise])
  } catch (err) {
    console.error(`[bucket] ${label} failed`, err)
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * GET /api/bucket?status=open,doing
 *
 * List bucket items for the column. Default returns open + doing so the
 * "in flight" rows render together; ?status=done|dropped returns the
 * archive view. Order: priority ascending, then created_at descending,
 * matching the column's grouped layout.
 *
 * Hot-path cache: ?status=open is the kiosk's most-hit query and gets a
 * 5-min Upstash cache with a 1-hour stale fallback. Other status combos
 * skip the cache and go straight to Supabase under a 5s timeout.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const raw = request.nextUrl.searchParams.get('status')
  const requested = (raw ? raw.split(',') : ['open', 'doing'])
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is BucketStatus =>
      (VALID_STATUSES as readonly string[]).includes(s)
    )

  const statuses = requested.length > 0 ? requested : ['open', 'doing']
  const isOpenOnly = statuses.length === 1 && statuses[0] === 'open'

  const service = createServiceClient()

  if (isOpenOnly) {
    const cached = await readBucketOpenCache()
    if (isFresh(cached)) {
      return NextResponse.json({ items: cached!.items, cached: true })
    }

    const result = await withTimeout(
      service
        .from('bucket_items')
        .select('*')
        .eq('status', 'open')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(500),
      QUERY_TIMEOUT_MS,
      'list:open'
    )

    if (result === null) {
      if (cached) {
        return NextResponse.json({ items: cached.items, cached: true, stale: true })
      }
      return NextResponse.json({ items: [], degraded: true })
    }
    if (result.error) {
      if (cached) {
        return NextResponse.json({ items: cached.items, cached: true, stale: true })
      }
      return NextResponse.json(
        { error: 'select_failed', message: result.error.message },
        { status: 500 }
      )
    }
    const items = result.data ?? []
    await writeBucketOpenCache(items)
    return NextResponse.json({ items })
  }

  const result = await withTimeout(
    service
      .from('bucket_items')
      .select('*')
      .in('status', statuses)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500),
    QUERY_TIMEOUT_MS,
    `list:${statuses.join(',')}`
  )

  if (result === null) {
    return NextResponse.json({ items: [], degraded: true })
  }
  if (result.error) {
    return NextResponse.json(
      { error: 'select_failed', message: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ items: result.data ?? [] })
}

/**
 * POST /api/bucket
 *
 * Create a new bucket item. Title is the only required field — the
 * inline "+ Add to bucket" input on the column ships title-only adds.
 * Other fields are optional and default at the DB level.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: CreateBody
  try {
    payload = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const title = (payload.title ?? '').trim()
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('bucket_items')
    .insert({
      title,
      body: payload.body ?? null,
      priority: clampPriority(payload.priority ?? 3),
      due_at: payload.due_at ?? null,
      source_url: payload.source_url ?? null,
      source_type: payload.source_type ?? 'manual',
      assigned_to: payload.assigned_to ?? null,
      assigned_by: user.email ?? ALLOWED_EMAIL,
      created_by: user.email ?? ALLOWED_EMAIL,
      status: 'open',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'insert_failed', message: error.message },
      { status: 500 }
    )
  }

  // Fire-and-forget; don't slow the POST if Redis is laggy.
  void bustBucketCache()

  return NextResponse.json(data, { status: 201 })
}
