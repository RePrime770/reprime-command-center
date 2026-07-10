import { NextResponse } from 'next/server'
import { safeError } from '@/lib/api/safe-error'
import { createServerClient } from '@/lib/supabase/server'
import '@/lib/fabric/adapters'
import { routeCapability } from '@/lib/fabric/router'
import type { TranscribeInput, TranscribeOutput } from '@/lib/fabric/adapters/stt'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    return await handleTranscribe(request)
  } catch (err) {
    return safeError('voice/transcribe-en', err)
  }
}

async function handleTranscribe(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData()
  const audio = form.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
  }

  // Speech-to-text routed through the integration fabric: Groq Whisper
  // Large v3 (~10x faster than OpenAI Whisper) is tried first, with runtime
  // failover to OpenAI Whisper if Groq is unconfigured or its call throws.
  const result = await routeCapability<TranscribeInput, TranscribeOutput>('TRANSCRIBE_AUDIO', {
    audio,
    language: 'en',
  })

  if (!result.ok) {
    return safeError('voice/transcribe-en', new Error(result.message), {
      code: 'stt_unavailable',
      status: 502,
    })
  }

  return NextResponse.json({ text: result.data.text, language: 'en', rtl: false })
}
