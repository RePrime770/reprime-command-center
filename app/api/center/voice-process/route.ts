import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { centerAuthed } from '@/lib/center/auth'
import { processVoiceNote } from '@/lib/center/voice-note'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Backfill + safety net for inbound WhatsApp voice notes. The webhook transcribes
// new notes inline; this catches (a) notes that arrived BEFORE the feature and
// (b) any live transcription that timed out. For each un-transcribed inbound
// audio message from a ROSTER contact: download + store a durable copy, run
// Whisper, write the transcript back, and refresh the board row (which rings the
// realtime bell). Roster-only — the board tracks exactly those ~200 people.

const dig9 = (s: string | null | undefined) => (s || '').replace(/\D/g, '').slice(-9)
const PLACEHOLDER = /^(📎|🎤)/
const AUDIO_EXT = /\.(oga|ogg|opus|amr|m4a|mka|aac|wav|mp3)$/i

export async function POST(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let limit = 25
  try { const b = await request.json(); if (b && typeof b.limit === 'number') limit = Math.min(50, Math.max(1, b.limit)) } catch { /* default */ }

  const service = createServiceClient()

  const { data: roster } = await service.from('roster').select('source_row, phone, board_stage, thread_json')
  const byL9 = new Map<string, { source_row: number; board_stage: string | null; thread_json: string | null }>()
  for (const r of (roster || []) as Array<{ source_row: number; phone: string | null; board_stage: string | null; thread_json: string | null }>) {
    const l9 = dig9(r.phone); if (l9) byL9.set(l9, r)
  }

  const { data: msgs } = await service
    .from('whatsapp_messages')
    .select('id, timelines_uid, media_url, media_filename, media_type, from_phone, sent_at, body, is_group_message')
    .eq('direction', 'in')
    .order('sent_at', { ascending: false })
    .limit(400)

  const candidates = ((msgs || []) as Array<{ id: string; timelines_uid: string | null; media_url: string | null; media_filename: string | null; media_type: string | null; from_phone: string | null; sent_at: string | null; body: string | null; is_group_message: boolean | null }>)
    .filter((m) => !m.is_group_message && m.media_url
      && (m.media_type === 'audio' || AUDIO_EXT.test(m.media_filename || ''))
      && !(m.body && m.body.trim())
      && dig9(m.from_phone) && byL9.has(dig9(m.from_phone)))
    .slice(0, limit)

  const results: Array<{ uid: string | null; hasTranscript: boolean; durable: boolean }> = []
  for (const m of candidates) {
    const vn = await processVoiceNote({ srcUrl: m.media_url as string, uid: m.timelines_uid || m.id, filename: m.media_filename })
    const durable = vn.durableUrl || (m.media_url as string)
    const transcript = vn.transcript

    await service.from('whatsapp_messages').update({ body: transcript || null, media_url: durable, media_type: 'audio' }).eq('id', m.id)

    const r = byL9.get(dig9(m.from_phone)) as { source_row: number; board_stage: string | null; thread_json: string | null }
    let arr: Array<{ who: string; date: string; text: string; via?: string; audio?: string }> = []
    try { arr = r.thread_json ? JSON.parse(r.thread_json) : [] } catch { arr = [] }
    // Drop stale content-free media placeholders from this contact, then append
    // the corrected voice-note entry (transcript + durable ▶ audio).
    arr = arr.filter((e) => !(e.who === 'them' && PLACEHOLDER.test((e.text || '').trim())))
    let date = ''
    try { date = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(m.sent_at || Date.now())) } catch { /* keep '' */ }
    const text = transcript || '🎤'
    arr.push({ who: 'them', date, text: text.slice(0, 400), via: 'wa', audio: durable })
    if (arr.length > 40) arr = arr.slice(-40)

    const upd: Record<string, unknown> = {
      thread_json: JSON.stringify(arr),
      last_reply_text: text.slice(0, 500),
      last_from: 'them',
      awaiting_us: true,
      last_reply_at: new Date(m.sent_at || Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (r.board_stage !== 'booked' && r.board_stage !== 'declined') upd.board_stage = 'replied'
    await service.from('roster').update(upd).eq('source_row', r.source_row)
    r.thread_json = upd.thread_json as string // keep fresh if same contact has 2 notes this run

    results.push({ uid: m.timelines_uid, hasTranscript: !!transcript, durable: !!vn.durableUrl })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
