import { NextResponse } from 'next/server'
import { safeError } from '@/lib/api/safe-error'
import { createServiceClient } from '@/lib/supabase/server'
import { client as gmailClient } from '@/lib/google/gmail'
import { centerAuthed } from '@/lib/center/auth'
import { stampCronRun } from '@/lib/cron/heartbeat'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// (Re-)arm the Gmail watch on g@reprime.com (the DEFAULT GOOGLE_REFRESH_TOKEN —
// verified). A watch expires in 7 days, so the daily cron renews it. Saves the
// returned historyId as the baseline so the first push computes a clean delta.
const WATCH_EMAIL = 'g@reprime.com'
const TOPIC = 'projects/reprime-command-center/topics/gmail-push'
// Heartbeat name (lib/cron/manifest.ts). Stamped only after the auth gate —
// stampCronRun never throws, so it can't break the cron.
const CRON_NAME = 'gmail-watch-arm'

export async function GET(request: Request) {
  // Vercel cron sends Authorization: Bearer ${CRON_SECRET}; a manual run can use
  // the board password (x-center-pass) instead.
  const expected = process.env.CRON_SECRET
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const cronOk = expected ? got === expected : true
  if (!cronOk && !centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const startedAt = Date.now()
  try {
    const gmail = gmailClient() // default = GOOGLE_REFRESH_TOKEN = g@reprime.com
    const res = await gmail.users.watch({ userId: 'me', requestBody: { topicName: TOPIC, labelIds: ['INBOX', 'SENT'], labelFilterBehavior: 'include' } })
    const historyId = res.data.historyId ? String(res.data.historyId) : null
    const expiration = res.data.expiration ? Number(res.data.expiration) : null
    const service = createServiceClient()
    await service.from('gmail_watch_state').upsert({ email: WATCH_EMAIL, history_id: historyId, expiration, updated_at: new Date().toISOString() }, { onConflict: 'email' })
    await stampCronRun(CRON_NAME, { ok: true, ms: Date.now() - startedAt })
    return NextResponse.json({ ok: true, email: WATCH_EMAIL, historyId, expiration })
  } catch (e) {
    await stampCronRun(CRON_NAME, { ok: false, ms: Date.now() - startedAt })
    return safeError('cron/gmail-watch-arm', e, { code: 'watch_arm_failed', status: 502 })
  }
}
