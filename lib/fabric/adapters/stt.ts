import OpenAI from 'openai'
import { registerAdapter } from '../registry'
import type { ProviderAdapter } from '../types'

/**
 * TRANSCRIBE_AUDIO adapters (roadmap ZT-2, batch ZT-2.2).
 *
 * Groq is tried first (whisper-large-v3, ~10x faster than OpenAI Whisper),
 * OpenAI is the fallback. Importing this module registers both adapters as
 * a side effect — see ./index.ts, the single import point that guarantees
 * this happens exactly once per capability set.
 */

export interface TranscribeInput {
  audio: File
  language: 'en' | 'he'
}

export interface TranscribeOutput {
  text: string
}

export const groqWhisperAdapter: ProviderAdapter<TranscribeInput, TranscribeOutput> = {
  id: 'groq-whisper',
  provider: 'groq',
  capability: 'TRANSCRIBE_AUDIO',
  priority: 0,
  enabled: (): boolean => !!process.env.GROQ_API_KEY,
  execute: async (input: TranscribeInput): Promise<TranscribeOutput> => {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    const result = await client.audio.transcriptions.create({
      file: input.audio,
      model: 'whisper-large-v3',
      language: input.language,
      response_format: 'json',
    })
    return { text: result.text }
  },
}

export const openaiWhisperAdapter: ProviderAdapter<TranscribeInput, TranscribeOutput> = {
  id: 'openai-whisper',
  provider: 'openai',
  capability: 'TRANSCRIBE_AUDIO',
  priority: 10,
  enabled: (): boolean => !!process.env.OPENAI_API_KEY,
  execute: async (input: TranscribeInput): Promise<TranscribeOutput> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const result = await client.audio.transcriptions.create({
      file: input.audio,
      model: 'whisper-1',
      language: input.language,
      response_format: 'json',
    })
    return { text: result.text }
  },
}

// registerAdapter's public signature takes the type-erased ProviderAdapter
// (default unknown/unknown) since the registry holds adapters for many
// capabilities with different input/output shapes; the cast here is safe
// because routeCapability re-parameterizes with <TranscribeInput,
// TranscribeOutput> at the call site (see app/api/voice/transcribe-*).
registerAdapter(groqWhisperAdapter as ProviderAdapter)
registerAdapter(openaiWhisperAdapter as ProviderAdapter)
