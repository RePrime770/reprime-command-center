import { describe, it, expect, afterEach, vi } from 'vitest'
import { elevenLabsAdapter, openaiTtsAdapter } from './tts'
import { classifyError } from '../errors'

describe('tts adapters', () => {
  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.ELEVENLABS_VOICE_ID
    delete process.env.OPENAI_API_KEY
  })

  it('elevenlabs-flash has the expected id/provider/capability/priority shape', () => {
    expect(elevenLabsAdapter.id).toBe('elevenlabs-flash')
    expect(elevenLabsAdapter.provider).toBe('elevenlabs')
    expect(elevenLabsAdapter.capability).toBe('SYNTHESIZE_SPEECH')
    expect(elevenLabsAdapter.priority).toBe(0)
  })

  it('openai-tts has the expected id/provider/capability/priority shape', () => {
    expect(openaiTtsAdapter.id).toBe('openai-tts')
    expect(openaiTtsAdapter.provider).toBe('openai')
    expect(openaiTtsAdapter.capability).toBe('SYNTHESIZE_SPEECH')
    expect(openaiTtsAdapter.priority).toBe(10)
  })

  it('elevenlabs-flash is enabled only when both ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are set', () => {
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.ELEVENLABS_VOICE_ID
    expect(elevenLabsAdapter.enabled()).toBe(false)

    process.env.ELEVENLABS_API_KEY = 'test-value'
    expect(elevenLabsAdapter.enabled()).toBe(false)

    process.env.ELEVENLABS_VOICE_ID = 'test-voice'
    expect(elevenLabsAdapter.enabled()).toBe(true)

    delete process.env.ELEVENLABS_API_KEY
    expect(elevenLabsAdapter.enabled()).toBe(false)
  })

  it('openai-tts is enabled only when OPENAI_API_KEY is set', () => {
    delete process.env.OPENAI_API_KEY
    expect(openaiTtsAdapter.enabled()).toBe(false)

    process.env.OPENAI_API_KEY = 'test-value'
    expect(openaiTtsAdapter.enabled()).toBe(true)
  })

  it('elevenlabs is prioritized before openai (lower priority value = tried first)', () => {
    expect(elevenLabsAdapter.priority).toBeLessThan(openaiTtsAdapter.priority)
  })

  it('elevenlabs upstream failure throws an error whose .status classifyError can read (not just embedded in the message text)', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-value'
    process.env.ELEVENLABS_VOICE_ID = 'test-voice'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad credential', { status: 401 })
    )

    try {
      await elevenLabsAdapter.execute({ text: 'hi', language: 'en' })
      expect.unreachable('execute() should have thrown on a non-ok upstream response')
    } catch (err) {
      expect((err as { status?: number }).status).toBe(401)
      // The real regression this guards: classifyError must see AUTHENTICATION
      // via the structured .status, not fall through to UNKNOWN because the
      // code was only ever embedded in the free-text message.
      expect(classifyError(err)).toBe('AUTHENTICATION')
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
