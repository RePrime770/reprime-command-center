/**
 * Adapter registry — collects getStatus() across every integration so the
 * cockpit and /api/health can render setup-required states from one place.
 *
 * Order matters (load-bearing first): Supabase, Anthropic, Google, Timelines,
 * Quo, Zoom, SendGrid, Pipedrive, Upstash, OpenAI, Groq, ElevenLabs, Slack,
 * PagerDuty, Apollo, BlueBubbles.
 */

import type { AdapterStatus } from './status'

import { getStatus as supabaseStatus } from '../supabase/status'
import { getStatus as anthropicStatus } from '../anthropic/status'
import { getStatus as googleStatus } from '../google/status'
import { getStatus as timelinesStatus } from '../timelines/client'
import { getStatus as quoStatus } from '../quo/status'
import { getStatus as zoomStatus } from '../zoom/client'
import { getStatus as sendgridStatus } from '../sendgrid/client'
import { getStatus as pipedriveStatus } from '../pipedrive/client'
import { getStatus as redisStatus } from '../redis/status'
import { getStatus as openaiStatus } from '../openai/status'
import { getStatus as groqStatus } from '../groq/status'
import { getStatus as elevenlabsStatus } from '../elevenlabs/status'
import { getStatus as slackStatus } from '../slack/client'
import { getStatus as pagerdutyStatus } from '../pagerduty/events'
import { getStatus as apolloStatus } from '../apollo/status'
import { getStatus as bluebubblesStatus } from '../bluebubbles/status'

export const REGISTERED_ADAPTERS = [
  supabaseStatus,
  anthropicStatus,
  googleStatus,
  timelinesStatus,
  quoStatus,
  zoomStatus,
  sendgridStatus,
  pipedriveStatus,
  redisStatus,
  openaiStatus,
  groqStatus,
  elevenlabsStatus,
  slackStatus,
  pagerdutyStatus,
  apolloStatus,
  bluebubblesStatus,
] as const

export async function getAllStatuses(): Promise<AdapterStatus[]> {
  return REGISTERED_ADAPTERS.map((fn) => fn())
}
