import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'
const LIMIT_PER_BUCKET = 50

type OutboundAsk = {
  id: string
  sender_identity: string
  recipient_identifier: string
  channel: 'email' | 'whatsapp' | 'imessage' | 'sms'
  body: string | null
  sent_at: string
  expected_reply_by: string
  status: 'open' | 'replied' | 'closed_no_reply' | 'snoozed'
  response_message_id: string | null
  closed_at: string | null
  related_thread_id: string | null
  reminded_at: string | null
}

/**
 * GET /api/secretary/asks
 *
 * Returns three buckets the SecretaryTab renders directly:
 *   awaiting        — status='open', expected_reply_by in the future
 *   overdue         — status='open', expected_reply_by has passed
 *   replied_recent  — status='replied', closed within 7d
 *
 * Each bucket is capped at LIMIT_PER_BUCKET. Pipedrive name resolution is
 * left to the client (it already has caching via /api/pipedrive/resolve).
 */
export async function GET(_request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [awaitingRes, overdueRes, repliedRes] = await Promise.all([
    service
      .from('outbound_asks')
      .select('*')
      .eq('status', 'open')
      .gte('expected_reply_by', now)
      .order('expected_reply_by', { ascending: true })
      .limit(LIMIT_PER_BUCKET),
    service
      .from('outbound_asks')
      .select('*')
      .eq('status', 'open')
      .lt('expected_reply_by', now)
      .order('expected_reply_by', { ascending: true })
      .limit(LIMIT_PER_BUCKET),
    service
      .from('outbound_asks')
      .select('*')
      .eq('status', 'replied')
      .gte('closed_at', sevenDaysAgo)
      .order('closed_at', { ascending: false })
      .limit(LIMIT_PER_BUCKET),
  ])

  const firstErr = awaitingRes.error || overdueRes.error || repliedRes.error
  if (firstErr) {
    return NextResponse.json(
      { error: 'select_failed', message: firstErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    awaiting: (awaitingRes.data ?? []) as OutboundAsk[],
    overdue: (overdueRes.data ?? []) as OutboundAsk[],
    replied_recent: (repliedRes.data ?? []) as OutboundAsk[],
  })
}
