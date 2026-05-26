/**
 * Captain 2026-05-26:
 *   1. Backfill Gilad@israelirpr.com + yossi@trustcapital.co.il into invitations rows.
 *   2. Confirm Yossi Shai's invitation at Wed June 3 2026 16:00 IDT (= 08:00 CDT).
 *   3. Wait for calendar_event_id to land.
 *   4. Add Shirel + Chaim + Adir as attendees to BOTH calendar events
 *      (Gilad's already-confirmed Thursday May 28 17:00 IDT, and Yossi's brand-new event).
 *
 * Cookie auth not required for /api/bookings/confirm — it's in proxy.ts PUBLIC_PATHS.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const ENV_PATH = new URL('../.env.local', import.meta.url)

try {
  const envText = readFileSync(ENV_PATH, 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
} catch {}

const GILAD_ID = 'f7bf2fcf-c6a3-4a7e-8124-6fee775dfe67'
const YOSSI_ID = '01747ad7-db57-472c-8c91-7efe5cc10f26'
const GILAD_EMAIL = 'Gilad@israelirpr.com'
const YOSSI_EMAIL = 'yossi@trustcapital.co.il'

const TEAM_CC = [
  { email: 'shirel@reprime.com', displayName: 'Shirel Ben-Haroush' },
  { email: 'chaim@reprime.com', displayName: 'Chaim Abrahams' },
  { email: 'adir@reprime.com', displayName: 'Adir Yonasi' },
]

// Wed June 3 2026 16:00 IDT = 08:00 CDT = 13:00 UTC
const YOSSI_SLOT_ISO = '2026-06-03T16:00:00.000+03:00'

const API_BASE = 'https://project-7e87w.vercel.app'

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function getCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: 'v3', auth })
}

async function backfillEmail(id, email) {
  const { error } = await sb.from('invitations').update({ contact_email: email }).eq('id', id)
  if (error) throw new Error(`backfill ${id}: ${error.message}`)
}

async function getInvitation(id) {
  const { data, error } = await sb
    .from('invitations')
    .select('id, contact_first_name, contact_name, contact_email, contact_phone, status, confirmed_slot_iso, zoom_join_url, calendar_event_id, proposed_slots')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`fetch ${id}: ${error.message}`)
  return data
}

async function confirmYossi() {
  const params = new URLSearchParams()
  params.set('token', YOSSI_ID)
  params.set('slot_iso', YOSSI_SLOT_ISO)
  const res = await fetch(`${API_BASE}/api/bookings/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirect: 'manual',
    body: params.toString(),
  })
  // 303 redirect on success
  if (res.status === 303 || res.status === 200) {
    return true
  }
  const text = await res.text().catch(() => '')
  throw new Error(`confirm failed ${res.status}: ${text.slice(0, 500)}`)
}

async function pollForCalendarEventId(id, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const inv = await getInvitation(id)
    if (inv?.calendar_event_id) return inv
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`timeout waiting for calendar_event_id on ${id}`)
}

async function addTeamAttendees(calendar, eventId, label) {
  const ev = await calendar.events.get({ calendarId: 'primary', eventId })
  const existing = ev.data.attendees || []
  const existingEmails = new Set(existing.map((a) => (a.email || '').toLowerCase()))
  const toAdd = TEAM_CC.filter((c) => !existingEmails.has(c.email.toLowerCase()))
  if (toAdd.length === 0) {
    console.log(`  · ${label}: team already on event`)
    return
  }
  const newAttendees = [
    ...existing,
    ...toAdd.map((c) => ({ email: c.email, displayName: c.displayName, responseStatus: 'needsAction' })),
  ]
  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
    requestBody: { attendees: newAttendees },
  })
  console.log(`  · ${label}: added ${toAdd.map((c) => c.email).join(', ')}`)
}

async function main() {
  console.log('\n━━━ Step 1: Backfill contact emails ━━━')
  await backfillEmail(GILAD_ID, GILAD_EMAIL)
  console.log(`✓ Gilad → ${GILAD_EMAIL}`)
  await backfillEmail(YOSSI_ID, YOSSI_EMAIL)
  console.log(`✓ Yossi → ${YOSSI_EMAIL}`)

  console.log('\n━━━ Step 2: Confirm Yossi Shai @ Wed Jun 3 16:00 IDT (08:00 CDT) ━━━')
  await confirmYossi()
  console.log('✓ POST /api/bookings/confirm returned redirect')

  console.log('\n━━━ Step 3: Poll for Yossi calendar_event_id ━━━')
  const yossi = await pollForCalendarEventId(YOSSI_ID)
  console.log(`✓ Yossi calendar_event_id: ${yossi.calendar_event_id}`)
  console.log(`  Zoom: ${yossi.zoom_join_url}`)

  const gilad = await getInvitation(GILAD_ID)
  if (!gilad.calendar_event_id) {
    throw new Error('Gilad missing calendar_event_id — abort')
  }
  console.log(`\n  Gilad calendar_event_id: ${gilad.calendar_event_id}`)
  console.log(`  Gilad Zoom: ${gilad.zoom_join_url}`)

  console.log('\n━━━ Step 4: Add Shirel + Chaim + Adir to both events ━━━')
  const calendar = getCalendarClient()
  await addTeamAttendees(calendar, gilad.calendar_event_id, 'Gilad (Thu 5/28 09:00 CDT / 17:00 IDT)')
  await addTeamAttendees(calendar, yossi.calendar_event_id, 'Yossi (Wed 6/3 08:00 CDT / 16:00 IDT)')

  console.log('\n━━━ Done ━━━')
  console.log('Both events now have Shirel + Chaim + Adir as attendees.')
  console.log('Calendar invites mailed out via sendUpdates=all.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
