import { createHash } from 'crypto'
import { redisGetJson, redisSetJson } from '../redis/client'

/**
 * Durable inbox (ZT-4, inbox half of "durable inbox/outbox").
 *
 * A generic webhook-receipt dedup primitive for inbound webhooks: check
 * whether an external event has been seen before, and if not, record it.
 * Callers use this to skip re-processing a retried/duplicate delivery.
 *
 * This is deliberately NOT a hand-rolled Upstash client (that mistake
 * already exists in app/api/whatsapp/webhook/route.ts's local getRedis()
 * helper — don't repeat it here). It sits on lib/redis/client.ts, the
 * established shared primitive, and inherits its degrade-safely contract.
 *
 * Key shape: `fabric:inbox:${source}:${externalEventId}`.
 *
 * CRITICAL degradation rule (fail OPEN toward "assume never seen before"):
 * when Redis is unconfigured or a read/write throws, recordWebhookReceipt
 * resolves `{ isNew: true }` — i.e. treat the event as new and let the
 * caller process it. This is the opposite direction from the fabric's
 * circuit-breaker (which fails toward "assume healthy" to keep traffic
 * flowing to a provider); here failing toward "isNew: true" means a Redis
 * hiccup never causes a webhook route to silently drop an event it would
 * have processed before this primitive existed. Never throws.
 *
 * TOCTOU race (documented, accepted): this is check-then-set, not an atomic
 * compare-and-swap. Two near-simultaneous deliveries of the same event could
 * both read "not found" before either write lands, and both would see
 * `isNew: true`. This reduces duplicate processing under normal retry
 * patterns (retries are typically seconds-to-minutes apart, not truly
 * concurrent) — it is NOT a hard exactly-once guarantee.
 */

/** Marker value written at the dedup key once an event has been recorded. */
export interface WebhookReceiptMarker {
  /** ISO timestamp of when this event was first recorded. */
  recordedAt: string
}

/** The subset of Zoom's webhook envelope needed to derive a dedup key. */
export interface ZoomWebhookEnvelope {
  event?: string
  /** Top-level — a SIBLING of `payload`, never nested inside it. */
  event_ts?: number | string
  payload?: { object?: { uuid?: string } }
}

/**
 * Derive a stable, collision-safe external event id for a Zoom webhook
 * delivery, for use as `externalEventId` in recordWebhookReceipt('zoom', ...).
 *
 * The event TYPE is always part of the key. A single meeting occurrence
 * shares the SAME payload.object.uuid across an entire stream of distinct
 * events (meeting.started, meeting.participant_joined ×N, meeting.ended,
 * recording.completed) — keying on uuid alone would make the second-ever
 * event for a meeting look like a duplicate of the first and get silently
 * dropped, losing meeting.ended / recording.completed (the entire point of
 * this integration). `rawBody` is only used as a last-resort discriminator
 * when neither `payload.object.uuid` nor the top-level `event_ts` is present.
 */
export function deriveZoomEventId(body: ZoomWebhookEnvelope, rawBody: string): string {
  const uuid = body.payload?.object?.uuid
  const eventTs = body.event_ts
  const eventType = body.event || 'unknown'
  const discriminator =
    uuid && eventTs !== undefined
      ? `${uuid}:${eventTs}`
      : uuid || (eventTs !== undefined ? String(eventTs) : '') ||
        `bodyhash:${createHash('sha256').update(rawBody).digest('hex')}`
  return `${eventType}:${discriminator}`
}

const INBOX_KEY_PREFIX = 'fabric:inbox:'

const TAG = 'fabric/inbox'

/**
 * Check whether `externalEventId` from `source` has already been recorded;
 * if not, record it with `ttlSeconds` and report it as new.
 *
 * @param source - Stable webhook source name (e.g. `'zoom'`).
 * @param externalEventId - Stable id for the specific event/delivery.
 * @param ttlSeconds - How long the dedup marker survives (default 24h).
 * @returns `{ isNew: true }` for a first-seen event (or on any Redis
 *   miss/error — fail open), `{ isNew: false }` when the marker already
 *   existed (a duplicate delivery the caller should skip).
 */
export async function recordWebhookReceipt(
  source: string,
  externalEventId: string,
  ttlSeconds = 24 * 3600
): Promise<{ isNew: boolean }> {
  const key = `${INBOX_KEY_PREFIX}${source}:${externalEventId}`
  try {
    const existing = await redisGetJson<WebhookReceiptMarker>(key)
    if (existing) return { isNew: false }

    const marker: WebhookReceiptMarker = { recordedAt: new Date().toISOString() }
    await redisSetJson(key, marker, ttlSeconds)
    return { isNew: true }
  } catch (err: unknown) {
    // Fail OPEN: never let a dedup-check failure block or dedupe an event
    // that would otherwise have been processed.
    console.error(`[${TAG}] receipt check failed`, key, err)
    return { isNew: true }
  }
}
