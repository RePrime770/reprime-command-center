import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/timelines/normalize-phone'

export const dynamic = 'force-dynamic'

// ── HMAC verification ─────────────────────────────────────────────────────────
// Quo (formerly OpenPhone) sends: openphone-signature: sha256=<hex>

async function verifySignature(rawBody: string, header: string, secret: string): Promise<boolean> {
  try {
    const sig = header.startsWith('sha256=') ? header.slice(7) : header
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(Buffer.from(sig, 'hex'))
    return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(rawBody))
  } catch {
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function our305(phone: string | undefined | null): boolean {
  if (!phone) return false
  return phone.replace(/\D/g, '').endsWith('3057784861')
}

function contactPhone(from: string, to: string): string {
  return our305(from) ? to : from
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = process.env.QUO_WEBHOOK_SECRET
  if (!secret) {
    console.error('[quo-webhook] QUO_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const sig = request.headers.get('openphone-signature') ?? ''

  if (sig) {
    const valid = await verifySignature(rawBody, sig, secret)
    if (!valid) {
      console.warn('[quo-webhook] signature mismatch')
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const type = payload.type as string
  const obj = payload.object as Record<string, unknown> | undefined
  if (!obj) return NextResponse.json({ ok: true })

  const service = createServiceClient()

  // ── call.completed ─────────────────────────────────────────────────────────
  if (type === 'call.completed') {
    const from = normalizePhone(obj.from as string) || (obj.from as string)
    const to = normalizePhone(obj.to as string) || (obj.to as string)
    const contact = normalizePhone(contactPhone(obj.from as string, obj.to as string))

    const row = {
      external_id: obj.id as string,
      panel: '305',
      direction: obj.direction === 'incoming' ? 'inbound' : 'outbound',
      from_phone: from,
      to_phone: to,
      contact_phone: contact,
      started_at: obj.startedAt as string | null,
      ended_at: obj.endedAt as string | null,
      duration_seconds: typeof obj.duration === 'number' ? obj.duration : null,
      status: (obj.status as string) ?? 'completed',
      channel_type: 'call',
      recording_url: (obj as Record<string, Record<string, string>>).recording?.url ?? null,
    }

    const { error } = await service.from('phone_calls').upsert(row, { onConflict: 'external_id' })
    if (error) console.error('[quo-webhook] call upsert error', error.message)
    console.log('[quo-webhook] call.completed', { from, to, duration: obj.duration })
  }

  // ── recording.completed ────────────────────────────────────────────────────
  if (type === 'recording.completed') {
    const callId = obj.callId as string
    const url = obj.url as string
    const { error } = await service
      .from('phone_calls')
      .update({ recording_url: url })
      .eq('external_id', callId)
    if (error) console.error('[quo-webhook] recording update error', error.message)
    console.log('[quo-webhook] recording.completed for call', callId)
  }

  // ── message.received / message.sent ───────────────────────────────────────
  if (type === 'message.received' || type === 'message.sent') {
    const from = normalizePhone(obj.from as string) || (obj.from as string)
    const to = normalizePhone(obj.to as string) || (obj.to as string)
    const contact = normalizePhone(contactPhone(obj.from as string, obj.to as string))
    const direction = (obj.direction as string) === 'outgoing' ? 'out' : 'in'
    const body = (obj.body as string) ?? null
    const msgId = obj.id as string
    const createdAt = obj.createdAt as string | null

    // Ensure thread exists
    const threadRow = {
      panel: '305',
      channel_type: 'sms',
      phone: contact ?? from,
      last_message_at: createdAt,
      last_message_preview: body ? body.slice(0, 120) : null,
      unread_count: direction === 'in' ? 1 : 0,
    }
    const { data: thread, error: threadErr } = await service
      .from('whatsapp_threads')
      .upsert(threadRow, { onConflict: 'panel,phone,channel_type' })
      .select('id')
      .single()

    if (threadErr || !thread) {
      console.error('[quo-webhook] thread upsert error', threadErr?.message)
      return NextResponse.json({ ok: true })
    }

    // Insert message
    const msgRow = {
      thread_id: thread.id,
      panel: '305',
      channel_type: 'sms',
      direction,
      body,
      timelines_uid: `quo:${msgId}`,
      sent_at: createdAt,
      status: type === 'message.sent' ? 'Sent' : null,
      from_phone: direction === 'in' ? from : to,
    }
    const { error: msgErr } = await service
      .from('whatsapp_messages')
      .upsert(msgRow, { onConflict: 'timelines_uid' })
    if (msgErr) console.error('[quo-webhook] message upsert error', msgErr.message)
    console.log('[quo-webhook]', type, { from, to, body: body?.slice(0, 40) })
  }

  return NextResponse.json({ ok: true })
}
