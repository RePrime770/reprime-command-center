import OpenAI, { toFile } from 'openai'
import { createServiceClient } from '@/lib/supabase/server'

// WhatsApp voice notes arrive as audio (.oga) with NO text and a TEMPORARY
// Timelines S3 link that expires. This helper makes a voice note usable on the
// secretary board: it downloads the bytes, stores a DURABLE copy in Supabase
// Storage (so the ▶ player keeps working), and transcribes it with Whisper
// (auto-detects Hebrew/English) so the board shows real words instead of a dead
// "📎 document". Every step is best-effort — a failure in one returns whatever
// succeeded, never throws.

const BUCKET = 'attachments' // existing public bucket

export type VoiceNoteResult = { durableUrl: string | null; transcript: string }

export async function processVoiceNote(opts: {
  srcUrl: string
  uid: string
  filename?: string | null
}): Promise<VoiceNoteResult> {
  let durableUrl: string | null = null
  let transcript = ''

  // 1. Download the audio from the (temporary) Timelines URL.
  let buf: Buffer | null = null
  try {
    const r = await fetch(opts.srcUrl)
    if (r.ok) buf = Buffer.from(await r.arrayBuffer())
  } catch { /* leave buf null */ }
  if (!buf || !buf.length) return { durableUrl: null, transcript: '' }

  const ext = ((opts.filename || '').split('.').pop() || 'oga').toLowerCase().replace(/[^a-z0-9]/g, '') || 'oga'

  // 2. Persist a durable copy (the Timelines link expires).
  try {
    const service = createServiceClient()
    const path = `voice/${(opts.uid || String(Date.now())).replace(/[^A-Za-z0-9_-]/g, '')}.${ext}`
    const { error } = await service.storage.from(BUCKET).upload(path, buf, {
      contentType: 'audio/ogg',
      upsert: true,
    })
    if (!error) {
      const { data } = service.storage.from(BUCKET).getPublicUrl(path)
      durableUrl = data?.publicUrl || null
    }
  } catch { /* keep durableUrl null → caller falls back to the temp URL */ }

  // 3. Transcribe (Whisper auto-detects the language — Hebrew or English).
  const key = process.env.OPENAI_API_KEY
  if (key) {
    try {
      const openai = new OpenAI({ apiKey: key })
      const file = await toFile(buf, opts.filename || 'voice.oga')
      const out = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'json',
      })
      transcript = (out.text || '').trim()
    } catch { /* leave transcript '' */ }
  }

  return { durableUrl, transcript }
}
