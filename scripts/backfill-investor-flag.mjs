/**
 * One-shot Pipedrive → Supabase investor backfill.
 *
 * Fetches every person in Pipedrive tagged as an investor, finds their
 * matching whatsapp_threads rows by phone number, and:
 *   1. Upserts a thread_tags row linking to the investor tag
 *   2. Sets is_investor = true on the thread (denormalized flag)
 *
 * This unblocks the InvestorPanel which currently shows empty because
 * no threads have is_investor = true.
 *
 * Usage:
 *   node scripts/backfill-investor-flag.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and PIPEDRIVE_API_TOKEN from .env.local.
 *
 * Safe to re-run — all writes are upserts or idempotent updates.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Load .env.local ──────────────────────────────────────────────
const ENV_PATH = new URL('../.env.local', import.meta.url)
try {
  const text = readFileSync(ENV_PATH, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
} catch {
  // .env.local may not exist in CI — rely on real env vars
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!PIPEDRIVE_TOKEN) {
  console.error('❌  Missing PIPEDRIVE_API_TOKEN')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Phone normalization (mirrors lib/timelines/normalize-phone.ts) ──
function normalizePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  if (digits.startsWith('1') && digits.length > 11) return null
  if (digits.length > 15) return null
  if (digits.length < 7) return null
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

// ── Pipedrive: fetch all investor-tagged persons ─────────────────
// TAG field key from lib/pipedrive/client.ts
const TAG_FIELD_KEY = 'd57ae324f61ddb2b922fb2e212f0723baba92448'

function isInvestorValue(value) {
  if (!value) return false
  const s = String(value).toLowerCase()
  return (
    s.includes('investor') ||
    s.includes('limited partner') ||
    s.includes(' lp') ||
    s.startsWith('lp')
  )
}

async function fetchPipedriveInvestors() {
  const persons = []
  let start = 0
  const limit = 500
  for (let page = 0; page < 20; page++) {
    const url =
      `https://api.pipedrive.com/v1/persons` +
      `?start=${start}&limit=${limit}&api_token=${PIPEDRIVE_TOKEN}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Pipedrive persons request failed: ${res.status}`)
    const json = await res.json()
    const data = json.data ?? []
    for (const p of data) {
      if (!isInvestorValue(p[TAG_FIELD_KEY])) continue
      const phones = (p.phone ?? [])
        .map((ph) => ph.value)
        .filter(Boolean)
        .map(normalizePhone)
        .filter(Boolean)
      if (phones.length > 0) {
        persons.push({ id: p.id, name: p.name, phones })
      }
    }
    const pagination = json.additional_data?.pagination
    if (!pagination?.more_items_in_collection) break
    start = pagination.next_start ?? start + limit
  }
  return persons
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('──────────────────────────────────────────')
  console.log('  Pipedrive → Supabase investor backfill')
  console.log('──────────────────────────────────────────\n')

  // 1. Find the investor tag in Supabase
  console.log('1. Looking up investor tag in Supabase tags table...')
  const { data: tagRows, error: tagErr } = await db
    .from('tags')
    .select('id, name')
    .eq('is_investor', true)
    .limit(1)

  if (tagErr) {
    console.error(`❌  tags table query failed: ${tagErr.message}`)
    process.exit(1)
  }
  if (!tagRows || tagRows.length === 0) {
    console.error('❌  No tag with is_investor=true found in the tags table.')
    console.error('    Create one in Supabase first, or check the tags table.')
    process.exit(1)
  }
  const investorTagId = tagRows[0].id
  console.log(`   ✓ Investor tag: "${tagRows[0].name}" (${investorTagId})\n`)

  // 2. Fetch investor persons from Pipedrive
  console.log('2. Fetching investor-tagged persons from Pipedrive...')
  const investors = await fetchPipedriveInvestors()
  console.log(`   ✓ Found ${investors.length} persons with investor tag and phone numbers\n`)

  if (investors.length === 0) {
    console.log('Nothing to backfill. Check that Pipedrive persons have the TAG field set.')
    return
  }

  // Build phone → name map (deduplicated)
  const phoneToName = new Map()
  for (const inv of investors) {
    for (const phone of inv.phones) {
      if (!phoneToName.has(phone)) phoneToName.set(phone, inv.name)
    }
  }
  console.log(`3. Unique normalized phones: ${phoneToName.size}`)

  // 3. Find matching threads in Supabase
  const allPhones = Array.from(phoneToName.keys())
  const { data: threads, error: threadsErr } = await db
    .from('whatsapp_threads')
    .select('id, phone, contact_name, is_investor')
    .in('phone', allPhones)

  if (threadsErr) {
    console.error(`❌  whatsapp_threads query failed: ${threadsErr.message}`)
    process.exit(1)
  }
  console.log(`   ✓ Found ${(threads ?? []).length} matching threads in DB\n`)

  if (!threads || threads.length === 0) {
    console.log('No matching threads found — phones may not have been ingested yet.')
    console.log('Make sure WhatsApp is receiving messages from these contacts first.')
    return
  }

  // 4. Tag each untagged thread
  console.log('4. Applying investor tag...')
  let newlyTagged = 0
  let alreadyTagged = 0
  const errors = []

  for (const thread of threads) {
    const personName = phoneToName.get(thread.phone) ?? thread.contact_name ?? thread.phone

    if (thread.is_investor) {
      console.log(`   – ${personName} (${thread.phone}) — already tagged, skipping`)
      alreadyTagged++
      continue
    }

    // Upsert thread_tags
    const { error: upsertErr } = await db
      .from('thread_tags')
      .upsert(
        { thread_id: thread.id, tag_id: investorTagId },
        { onConflict: 'thread_id,tag_id' }
      )

    if (upsertErr) {
      errors.push(`thread_tags upsert for ${thread.id}: ${upsertErr.message}`)
      console.error(`   ✗ ${personName} — thread_tags upsert failed: ${upsertErr.message}`)
      continue
    }

    // Set denormalized flag
    const { error: updateErr } = await db
      .from('whatsapp_threads')
      .update({ is_investor: true })
      .eq('id', thread.id)

    if (updateErr && !/column .* does not exist/i.test(updateErr.message)) {
      errors.push(`is_investor update for ${thread.id}: ${updateErr.message}`)
      console.error(`   ✗ ${personName} — is_investor update failed: ${updateErr.message}`)
      continue
    }

    console.log(`   ✓ Tagged: ${personName} (${thread.phone})`)
    newlyTagged++
  }

  console.log('\n──────────────────────────────────────────')
  console.log(`  Newly tagged:        ${newlyTagged}`)
  console.log(`  Already tagged:      ${alreadyTagged}`)
  console.log(`  Errors:              ${errors.length}`)
  console.log('──────────────────────────────────────────')

  if (errors.length) {
    console.error('\nErrors:')
    errors.forEach((e) => console.error(`  ✗ ${e}`))
    process.exit(1)
  }

  if (newlyTagged > 0) {
    console.log('\n✅  Done. Refresh the cockpit — the InvestorPanel should now show contacts.')
  } else {
    console.log('\n✅  Done. No new threads to tag.')
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
