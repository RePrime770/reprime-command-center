import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  redisGetJson: vi.fn(),
  redisSetJson: vi.fn(),
}))

vi.mock('../redis/client', () => ({
  redisGetJson: mocks.redisGetJson,
  redisSetJson: mocks.redisSetJson,
}))

import { recordWebhookReceipt, deriveZoomEventId } from './inbox'

describe('recordWebhookReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns isNew:true on the first call for a given source+externalEventId', async () => {
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockResolvedValueOnce(true)

    const result = await recordWebhookReceipt('zoom', 'evt-1')

    expect(result).toEqual({ isNew: true })
    expect(mocks.redisGetJson).toHaveBeenCalledWith('fabric:inbox:zoom:evt-1')
    const [key, value, ttl] = mocks.redisSetJson.mock.calls[0]
    expect(key).toBe('fabric:inbox:zoom:evt-1')
    expect(typeof (value as { recordedAt: string }).recordedAt).toBe('string')
    expect(ttl).toBe(24 * 3600)
  })

  it('returns isNew:false on a second call with the same source+externalEventId', async () => {
    mocks.redisGetJson.mockResolvedValueOnce({ recordedAt: '2026-07-11T00:00:00.000Z' })

    const result = await recordWebhookReceipt('zoom', 'evt-1')

    expect(result).toEqual({ isNew: false })
    expect(mocks.redisSetJson).not.toHaveBeenCalled()
  })

  it('returns isNew:true for a different externalEventId under the same source', async () => {
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockResolvedValueOnce(true)

    const result = await recordWebhookReceipt('zoom', 'evt-2')

    expect(result).toEqual({ isNew: true })
    expect(mocks.redisGetJson).toHaveBeenCalledWith('fabric:inbox:zoom:evt-2')
  })

  it('returns isNew:true for the same externalEventId under a different source', async () => {
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockResolvedValueOnce(true)

    const result = await recordWebhookReceipt('whatsapp', 'evt-1')

    expect(result).toEqual({ isNew: true })
    expect(mocks.redisGetJson).toHaveBeenCalledWith('fabric:inbox:whatsapp:evt-1')
  })

  it('returns isNew:true when Redis is unconfigured (get/set resolve to null/false)', async () => {
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockResolvedValueOnce(false)

    const result = await recordWebhookReceipt('zoom', 'evt-3')

    expect(result).toEqual({ isNew: true })
  })

  it('never rejects and resolves isNew:true when redisGetJson rejects', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisGetJson.mockRejectedValueOnce(new Error('upstash down'))

    await expect(recordWebhookReceipt('zoom', 'evt-4')).resolves.toEqual({ isNew: true })
    expect(errSpy).toHaveBeenCalled()
  })

  it('never rejects and resolves isNew:true when redisSetJson rejects', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockRejectedValueOnce(new Error('upstash down'))

    await expect(recordWebhookReceipt('zoom', 'evt-5')).resolves.toEqual({ isNew: true })
    expect(errSpy).toHaveBeenCalled()
  })

  it('never throws and resolves isNew:true when redisGetJson throws synchronously', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.redisGetJson.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })

    await expect(recordWebhookReceipt('zoom', 'evt-6')).resolves.toEqual({ isNew: true })
    expect(errSpy).toHaveBeenCalled()
  })

  it('respects a custom ttlSeconds', async () => {
    mocks.redisGetJson.mockResolvedValueOnce(null)
    mocks.redisSetJson.mockResolvedValueOnce(true)

    await recordWebhookReceipt('zoom', 'evt-7', 60)

    const [, , ttl] = mocks.redisSetJson.mock.calls[0]
    expect(ttl).toBe(60)
  })
})

describe('deriveZoomEventId', () => {
  const uuid = 'aBcD1234=='
  const eventTs = 1720000000000

  it('produces DIFFERENT ids for different event types sharing the same meeting uuid', () => {
    // Regression test: this is the exact bug a review caught before ship —
    // reading event_ts from the wrong (nested) level meant the key collapsed
    // to bare object.uuid, so every event after the first for a meeting
    // looked like a duplicate and was silently dropped (200, no Zoom retry).
    const started = deriveZoomEventId({ event: 'meeting.started', event_ts: eventTs, payload: { object: { uuid } } }, '{}')
    const ended = deriveZoomEventId({ event: 'meeting.ended', event_ts: eventTs, payload: { object: { uuid } } }, '{}')
    const recording = deriveZoomEventId({ event: 'recording.completed', event_ts: eventTs, payload: { object: { uuid } } }, '{}')

    expect(started).not.toBe(ended)
    expect(started).not.toBe(recording)
    expect(ended).not.toBe(recording)
  })

  it('produces the SAME id for a genuine retry of the identical event', () => {
    const body = { event: 'meeting.ended', event_ts: eventTs, payload: { object: { uuid } } }
    expect(deriveZoomEventId(body, '{}')).toBe(deriveZoomEventId(body, '{}'))
  })

  it('reads event_ts from the top level of the envelope, not nested inside payload', () => {
    // A payload-nested event_ts (the original bug) must NOT be picked up —
    // only the top-level sibling field counts.
    const topLevel = deriveZoomEventId(
      { event: 'meeting.ended', event_ts: eventTs, payload: { object: { uuid } } },
      '{}'
    )
    const withBogusNestedTs = deriveZoomEventId(
      // @ts-expect-error — simulating a payload that also happens to carry an
      // (irrelevant) event_ts-shaped field nested inside payload
      { event: 'meeting.ended', event_ts: eventTs, payload: { object: { uuid }, event_ts: 999 } },
      '{}'
    )
    expect(topLevel).toBe(withBogusNestedTs)
  })

  it('falls back to a body hash when neither uuid nor event_ts is present, still discriminated by event type', () => {
    const a = deriveZoomEventId({ event: 'meeting.started' }, '{"raw":"a"}')
    const b = deriveZoomEventId({ event: 'meeting.ended' }, '{"raw":"a"}')
    expect(a).not.toBe(b)
    expect(a).toContain('bodyhash:')
  })
})
