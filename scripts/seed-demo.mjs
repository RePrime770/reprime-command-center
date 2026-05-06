#!/usr/bin/env node
// scripts/seed-demo.mjs
//
// Demo data seeder for /center kiosk first-login UX. Inserts a small,
// realistic set of bucket items, reminders, and outbound asks so an
// empty production DB has something to render. Every row is tagged
// with "[DEMO]" inside body / related_thread_id for easy cleanup.
//
// Usage:
//   node scripts/seed-demo.mjs           — insert demo rows
//   node scripts/seed-demo.mjs --clean   — remove all demo rows
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
// (or the corresponding env vars). Service-role bypasses RLS.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

function loadEnv() {
  const out = {}
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // fall through to process.env
  }
  return out
}

const fileEnv = loadEnv()
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  fileEnv.SUPABASE_URL ||
  fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
  ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
  ''
const CRON_SECRET = process.env.CRON_SECRET || fileEnv.CRON_SECRET || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'ERROR: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (looked in .env.local and process.env).'
  )
  process.exit(2)
}
if (!CRON_SECRET) {
  // Not strictly required for direct DB writes, but the spec calls for
  // reading it so future seeders that want to hit cron endpoints have it.
  console.warn('[seed-demo] CRON_SECRET not found — continuing (DB writes only).')
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const DEMO_TAG = '[DEMO]'

const isClean = process.argv.includes('--clean')

// ---------- helpers ----------
function nextFridayAt(hourUTC, minute = 0) {
  // Next Friday from "now". 4pm CT in May = 21:00 UTC (CDT, UTC-5).
  const now = new Date()
  const d = new Date(now)
  const day = d.getUTCDay() // 0=Sun..6=Sat. Fri=5.
  let add = (5 - day + 7) % 7
  if (add === 0) add = 7 // skip today if it's already Friday
  d.setUTCDate(d.getUTCDate() + add)
  d.setUTCHours(hourUTC, minute, 0, 0)
  return d.toISOString()
}

function offsetISO(ms) {
  return new Date(Date.now() + ms).toISOString()
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// ---------- clean ----------
async function clean() {
  console.log('[seed-demo] cleaning demo rows…')

  // outbound_asks — match by [DEMO] in body or related_thread_id.
  const oa = await sb
    .from('outbound_asks')
    .delete()
    .or(`body.ilike.%${DEMO_TAG}%,related_thread_id.ilike.%${DEMO_TAG}%`)
    .select('id')
  if (oa.error) throw oa.error
  console.log(`  outbound_asks: ${oa.data?.length ?? 0} removed`)

  // reminders — match by [DEMO] in payload->>tag (string text) OR by
  // referenced bucket items below. Use payload->>tag to scope.
  const rem = await sb
    .from('reminders')
    .delete()
    .filter('payload->>tag', 'eq', 'demo')
    .select('id')
  if (rem.error) throw rem.error
  console.log(`  reminders: ${rem.data?.length ?? 0} removed`)

  // bucket_items — match by [DEMO] in body. cascade also drops any
  // reminders we missed via FK.
  const bi = await sb
    .from('bucket_items')
    .delete()
    .ilike('body', `%${DEMO_TAG}%`)
    .select('id')
  if (bi.error) throw bi.error
  console.log(`  bucket_items: ${bi.data?.length ?? 0} removed`)

  console.log('[seed-demo] clean complete.')
}

// ---------- seed ----------
async function seed() {
  console.log('[seed-demo] seeding demo rows…')

  // 1) bucket_items
  const bucketRows = [
    {
      title: 'Call Bryan Morjain re Watermills 10am',
      body: `${DEMO_TAG} Watermills $35M note — confirm IBI capital stack on the 10am call.`,
      priority: 1,
      assigned_to: 'g@reprime.com',
      source_type: 'demo',
    },
    {
      title: 'Bay Valley retrade v3 — review C&G counter',
      body: `${DEMO_TAG} Saginaw retrade. Ashley sublease angle still in play.`,
      priority: 2,
      assigned_to: 'shirel@reprime.com',
      source_type: 'demo',
    },
    {
      title: 'IGA wire instructions confirmed — fund Friday',
      body: `${DEMO_TAG} Jasper IN / Olney IL — Houchens guarantee. Wire ready.`,
      priority: 3,
      assigned_to: 'g@reprime.com',
      source_type: 'demo',
    },
    {
      title: "Magna Electronics — review Neil's 3 lender quotes",
      body: `${DEMO_TAG} Southfield MI $41.5M / 8.37% cap. Neil Bane sourced quotes.`,
      priority: 2,
      assigned_to: 'chaim@reprime.com',
      source_type: 'demo',
    },
    {
      title: 'Shabbat email auto-replies — verify schedule',
      body: `${DEMO_TAG} Confirm Friday sundown / Saturday motzei timings for the auto-reply gate.`,
      priority: 4,
      assigned_to: 'adir@reprime.com',
      source_type: 'demo',
    },
  ]

  const bi = await sb.from('bucket_items').insert(bucketRows).select('id, title')
  if (bi.error) throw bi.error
  console.log(`  bucket_items: ${bi.data.length} inserted`)
  const ids = bi.data.map((r) => r.id)
  // Map by index — order is preserved by Postgres for a single-statement insert.
  const [b1, , b3, , b5] = ids

  // 2) reminders — tied to bucket items 1, 3, 5
  const reminderRows = [
    {
      bucket_item_id: b1,
      fire_at: offsetISO(5 * MIN),
      payload: { tag: 'demo', label: '5-min toast' },
    },
    {
      bucket_item_id: b3,
      fire_at: offsetISO(1 * HOUR),
      payload: { tag: 'demo', label: '1-hour pre-fund' },
    },
    {
      bucket_item_id: b5,
      fire_at: nextFridayAt(21, 0), // 4pm CT (CDT) = 21:00 UTC
      payload: { tag: 'demo', label: 'Friday 4pm CT' },
    },
  ]
  const rem = await sb.from('reminders').insert(reminderRows).select('id')
  if (rem.error) throw rem.error
  console.log(`  reminders: ${rem.data.length} inserted`)

  // 3) outbound_asks — 1 awaiting (in window), 1 overdue, 1 replied/closed
  const now = Date.now()
  const outboundRows = [
    {
      sender_identity: 'g@reprime.com',
      recipient_identifier: 'bryan@rok.example',
      channel: 'email',
      body: `${DEMO_TAG} Bryan — confirming the IBI capital stack ahead of 10am Wed. — Gideon`,
      sent_at: new Date(now - 2 * HOUR).toISOString(),
      expected_reply_by: new Date(now + 46 * HOUR).toISOString(),
      status: 'open',
      related_thread_id: `${DEMO_TAG} watermills-ibi-${now}`,
    },
    {
      sender_identity: 'g@reprime.com',
      recipient_identifier: 'ray.t@florida.example',
      channel: 'email',
      body: `${DEMO_TAG} Ray — Florida portfolio: Skylark / Palatka / Lake Wales. Pinging on the seller note draft. — Gideon`,
      sent_at: new Date(now - 1 * DAY).toISOString(),
      // expected_reply_by was 24h after send, so it's now overdue.
      expected_reply_by: new Date(now - 1 * MIN).toISOString(),
      status: 'open',
      related_thread_id: `${DEMO_TAG} florida-portfolio-${now}`,
    },
    {
      sender_identity: 'g@reprime.com',
      recipient_identifier: 'neil.b@bane.example',
      channel: 'email',
      body: `${DEMO_TAG} Neil — Magna lender quotes received. Reviewing this week. — Gideon`,
      sent_at: new Date(now - 2 * DAY).toISOString(),
      expected_reply_by: new Date(now - 1 * DAY).toISOString(),
      status: 'replied',
      response_message_id: `demo-reply-${now}`,
      closed_at: new Date(now - 1 * DAY).toISOString(),
      related_thread_id: `${DEMO_TAG} magna-lender-${now}`,
    },
  ]
  const oa = await sb.from('outbound_asks').insert(outboundRows).select('id, status')
  if (oa.error) throw oa.error
  console.log(`  outbound_asks: ${oa.data.length} inserted`)

  console.log('[seed-demo] seed complete.')
  console.log(`  -> 5 bucket items, 3 reminders, 3 outbound asks`)
  console.log(`  -> first reminder fires at ${reminderRows[0].fire_at}`)
}

async function main() {
  console.log(`[seed-demo] target=${SUPABASE_URL.replace(/^https?:\/\//, '')}`)
  if (isClean) {
    await clean()
  } else {
    await seed()
  }
}

main().catch((err) => {
  console.error('[seed-demo] FAILED:', err?.message ?? err)
  process.exit(1)
})
