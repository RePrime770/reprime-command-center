import { describe, it, expect, afterEach } from 'vitest'
import { groqWhisperAdapter, openaiWhisperAdapter } from './stt'

describe('stt adapters', () => {
  afterEach(() => {
    delete process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  it('groq-whisper has the expected id/provider/capability/priority shape', () => {
    expect(groqWhisperAdapter.id).toBe('groq-whisper')
    expect(groqWhisperAdapter.provider).toBe('groq')
    expect(groqWhisperAdapter.capability).toBe('TRANSCRIBE_AUDIO')
    expect(groqWhisperAdapter.priority).toBe(0)
  })

  it('openai-whisper has the expected id/provider/capability/priority shape', () => {
    expect(openaiWhisperAdapter.id).toBe('openai-whisper')
    expect(openaiWhisperAdapter.provider).toBe('openai')
    expect(openaiWhisperAdapter.capability).toBe('TRANSCRIBE_AUDIO')
    expect(openaiWhisperAdapter.priority).toBe(10)
  })

  it('groq-whisper is enabled only when GROQ_API_KEY is set', () => {
    delete process.env.GROQ_API_KEY
    expect(groqWhisperAdapter.enabled()).toBe(false)

    process.env.GROQ_API_KEY = 'test-value'
    expect(groqWhisperAdapter.enabled()).toBe(true)
  })

  it('openai-whisper is enabled only when OPENAI_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY
    expect(openaiWhisperAdapter.enabled()).toBe(false)

    process.env.OPENAI_API_KEY = 'test-value'
    expect(openaiWhisperAdapter.enabled()).toBe(true)
  })

  it('groq is prioritized before openai (lower priority value = tried first)', () => {
    expect(groqWhisperAdapter.priority).toBeLessThan(openaiWhisperAdapter.priority)
  })
})
