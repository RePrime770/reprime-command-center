import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getMessageBody, isInsufficientScopeError } from '@/lib/google/gmail'
import { MAX_BODY_CHARS } from '@/lib/google/gmail-body'
import { safeError } from '@/lib/api/safe-error'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

// Gmail message ids are short base64url-ish tokens; anything else is bogus.
// The adapter's synthetic `em-live-*` fallback ids pass this shape check but
// Gmail 404s them, which surfaces as not_found — degrades gracefully.
const MESSAGE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

/**
 * GET /api/email/body?id=<gmailMessageId>&account=<mailboxEmail>
 * Returns the decoded plain-text body of one Gmail message from the mailbox
 * identified by `account` (real email or key; unknown values fall back to the
 * primary mailbox via resolveAccount). HTML bodies are stripped server-side —
 * the client never receives raw HTML.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }
  if (!MESSAGE_ID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  const account = searchParams.get('account') || undefined

  try {
    const { text, source } = await getMessageBody(id, account)
    return NextResponse.json({
      ok: true,
      message_id: id,
      body: text.slice(0, MAX_BODY_CHARS),
      source,
      truncated: text.length > MAX_BODY_CHARS,
    })
  } catch (err) {
    if (isInsufficientScopeError(err)) {
      return safeError('email/body', err, { code: 'needs_consent', status: 403 })
    }
    if ((err as { code?: number })?.code === 404) {
      return safeError('email/body', err, { code: 'not_found', status: 404 })
    }
    return safeError('email/body', err, { code: 'fetch_failed', status: 502 })
  }
}
