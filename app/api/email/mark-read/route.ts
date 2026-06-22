import { NextResponse, type NextRequest } from 'next/server'
import { google } from 'googleapis'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

/**
 * POST /api/email/mark-read  { message_id, read: boolean }
 * Toggles Gmail's UNREAD label. Requires the GOOGLE_REFRESH_TOKEN to carry the
 * gmail.modify scope (granted via scripts/get-gmail-token.mjs). If the token
 * lacks the scope, Gmail returns 403 insufficient_scope → surfaced as needs_consent.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { message_id?: string; read?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const messageId = body.message_id
  if (!messageId || typeof messageId !== 'string') {
    return NextResponse.json({ error: 'message_id_required' }, { status: 400 })
  }
  const markRead = body.read !== false // default true

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: markRead
        ? { removeLabelIds: ['UNREAD'] }
        : { addLabelIds: ['UNREAD'] },
    })
    return NextResponse.json({ ok: true, message_id: messageId, read: markRead })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    const needsConsent = /insufficient|scope|403|PERMISSION_DENIED/i.test(msg)
    return NextResponse.json(
      {
        error: needsConsent ? 'needs_consent' : 'modify_failed',
        message: needsConsent
          ? 'Gmail token lacks gmail.modify — run scripts/get-gmail-token.mjs and update GOOGLE_REFRESH_TOKEN.'
          : msg,
      },
      { status: needsConsent ? 403 : 502 }
    )
  }
}
