import { NextResponse } from 'next/server'
import '@/lib/fabric/adapters'
import { routeCapability } from '@/lib/fabric/router'
import { safeError } from '@/lib/api/safe-error'
import { createServerClient } from '@/lib/supabase/server'
import type { SynthesizeSpeechInput, SynthesizeSpeechOutput } from '@/lib/fabric/adapters/tts'

export const runtime = 'nodejs'

type SpeakBody = {
  text: string
  language: 'en' | 'he'
}

export async function POST(request: Request) {
  try {
    return await handleSpeak(request)
  } catch (err) {
    return safeError('voice/speak', err)
  }
}

async function handleSpeak(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as Partial<SpeakBody>
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const language = body.language === 'he' ? 'he' : 'en'
  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  const result = await routeCapability<SynthesizeSpeechInput, SynthesizeSpeechOutput>(
    'SYNTHESIZE_SPEECH',
    { text, language }
  )

  if (!result.ok) {
    // No adapter is enabled at all (neither ElevenLabs nor OpenAI TTS env
    // vars are set) — same shape as the pre-fabric route's dedicated
    // missing-config check.
    if (result.error === 'VALIDATION' && result.message === 'capability_not_configured') {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'TTS upstream error', message: result.message },
      { status: 502 }
    )
  }

  // TRUE STREAMED response — result.data.stream is the live upstream body
  // when ElevenLabs (the primary) wins, so bytes flow as they're synthesized,
  // matching the pre-fabric route's latency profile exactly.
  return new Response(result.data.stream, {
    status: 200,
    headers: {
      'Content-Type': result.data.contentType,
      'Cache-Control': 'no-store',
    },
  })
}
