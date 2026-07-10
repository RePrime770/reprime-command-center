import OpenAI from 'openai'
import { registerAdapter } from '../registry'
import type { ProviderAdapter } from '../types'

/**
 * SYNTHESIZE_SPEECH adapters (roadmap ZT-3, batch ZT-3.2).
 *
 * ElevenLabs (eleven_flash_v2_5, streamed) is tried first, OpenAI TTS
 * (tts-1, buffered) is the fallback. Importing this module registers both
 * adapters as a side effect — see ./index.ts, the single import point that
 * guarantees this happens exactly once per capability set.
 */

export interface SynthesizeSpeechInput {
  text: string
  language: 'en' | 'he'
}

export interface SynthesizeSpeechOutput {
  stream: ReadableStream<Uint8Array>
  contentType: string
}

export const elevenLabsAdapter: ProviderAdapter<SynthesizeSpeechInput, SynthesizeSpeechOutput> = {
  id: 'elevenlabs-flash',
  provider: 'elevenlabs',
  capability: 'SYNTHESIZE_SPEECH',
  priority: 0,
  enabled: (): boolean => !!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_VOICE_ID,
  execute: async (input: SynthesizeSpeechInput): Promise<SynthesizeSpeechOutput> => {
    const voiceId = process.env.ELEVENLABS_VOICE_ID!
    const apiKey = process.env.ELEVENLABS_API_KEY!

    // eleven_flash_v2_5 is the low-latency multilingual model (~75ms model
    // latency, supports Hebrew) — same choice as the pre-fabric route, kept
    // exactly to preserve the latency profile Gideon relies on.
    const payload: Record<string, unknown> = {
      text: input.text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }
    // flash/turbo v2.5 are multilingual; pass the language hint for Hebrew.
    payload.language_code = input.language

    // /stream + optimize_streaming_latency lets bytes flow as they're
    // synthesized; a lighter mp3 (64kbps) shaves transfer time. Both cut
    // perceived latency. This is the PRIMARY provider's path — it must stay
    // a true stream, never buffered.
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!upstream.ok || !upstream.body) {
      // Throw (rather than returning an error Response) so routeCapability
      // can classify the failure and fail over to the next adapter. The
      // status must be a real `.status` property (not just embedded in the
      // message text) — lib/fabric/errors.ts's classifyError() only reads
      // err.status/err.response?.status/err.statusCode, and a plain Error
      // with the code baked into free text classifies as UNKNOWN, defeating
      // the circuit-breaker's immediate-open-on-auth-failure and
      // never-count-on-validation-failure rules.
      const errText = await upstream.text().catch(() => '')
      const err = new Error(`elevenlabs_upstream_error status=${upstream.status} body=${errText.slice(0, 300)}`) as Error & { status: number }
      err.status = upstream.status
      throw err
    }

    return { stream: upstream.body, contentType: 'audio/mpeg' }
  },
}

export const openaiTtsAdapter: ProviderAdapter<SynthesizeSpeechInput, SynthesizeSpeechOutput> = {
  id: 'openai-tts',
  provider: 'openai',
  capability: 'SYNTHESIZE_SPEECH',
  priority: 10,
  enabled: (): boolean => !!process.env.OPENAI_API_KEY,
  // Fallback only: tts-1/alloy has no per-language voice tuning (no Hebrew-
  // specific voice, no ElevenLabs-style voice_settings) and will sound
  // different from ElevenLabs. Acceptable for a fallback, not for primary.
  execute: async (input: SynthesizeSpeechInput): Promise<SynthesizeSpeechOutput> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const speech = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: input.text,
    })

    // Installed openai SDK (v6.35) returns a fetch-like Response object
    // (APIPromise<Response> — confirmed via node_modules/openai/src/resources/
    // audio/speech.ts, whose own doc example calls `.blob()` on the result).
    // That Response's `.body` is already a ReadableStream<Uint8Array>, so the
    // buffered ArrayBuffer/Blob path below is a defensive fallback only, in
    // case a future SDK upgrade changes the return shape.
    const maybeResponse = speech as unknown as { body?: ReadableStream<Uint8Array> | null }
    if (maybeResponse.body) {
      return { stream: maybeResponse.body, contentType: 'audio/mpeg' }
    }

    const arrayBuffer = await (speech as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
    return { stream, contentType: 'audio/mpeg' }
  },
}

// registerAdapter's public signature takes the type-erased ProviderAdapter
// (default unknown/unknown) since the registry holds adapters for many
// capabilities with different input/output shapes; the cast here is safe
// because routeCapability re-parameterizes with <SynthesizeSpeechInput,
// SynthesizeSpeechOutput> at the call site (see app/api/voice/speak).
registerAdapter(elevenLabsAdapter as ProviderAdapter)
registerAdapter(openaiTtsAdapter as ProviderAdapter)
