/**
 * One-shot ingestion of the NonInvestors_Final sheet from
 * RePrime_Final_Audited_Files.xlsx into the contact_directory Supabase
 * table. Used as the caller-ID phonebook when a phone number with no
 * Pipedrive match shows up on inbound.
 *
 * Run after applying supabase/overnight_migration.sql:
 *   cd dashboard
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-contact-directory.mjs
 *
 * Idempotent — the unique constraint on (canonical_name, primary_phone)
 * means re-running updates existing rows rather than duplicating.
 */

import XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const XLSX_PATH = '_terminal-design-reference/investor-data/RePrime_Final_Audited_Files.xlsx'
const SHEET = 'NonInvestors_Final'
const BATCH = 100

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.startsWith('+')) return digits
  return `+${digits}`
}

function pickFirst(combined) {
  if (!combined) return null
  const first = String(combined).split('|')[0]?.trim() || null
  return first
}

async function main() {
  console.log('Reading workbook…')
  const buf = readFileSync(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[SHEET]
  if (!ws) {
    console.error(`Sheet "${SHEET}" not found.`)
    process.exit(1)
  }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`Read ${rows.length} rows from ${SHEET}.`)

  const upserts = []
  for (const r of rows) {
    const canonical = (r.canonical_name || '').toString().trim()
    if (!canonical) continue
    const primaryPhoneNorm = normalizePhone(pickFirst(r.primary_phone || r.all_phones))
    const primaryEmailLower = (pickFirst(r.primary_email || r.all_emails) || '').toLowerCase() || null

    upserts.push({
      source: 'xlsx',
      canonical_name: canonical,
      all_name_variants: r.all_name_variants ? String(r.all_name_variants) : null,
      primary_phone: primaryPhoneNorm,
      all_phones: r.all_phones ? String(r.all_phones) : null,
      primary_email: primaryEmailLower,
      all_emails: r.all_emails ? String(r.all_emails) : null,
      company: r.company ? String(r.company) : null,
      title: r.title ? String(r.title) : null,
      preferred_language: r.preferred_language ? String(r.preferred_language) : null,
      is_investor: false, // NonInvestors sheet
      geographies: r.geographies_of_interest ? String(r.geographies_of_interest) : null,
      notes: r.all_notes ? String(r.all_notes) : null,
    })
  }
  console.log(`Built ${upserts.length} upserts. Sending in batches of ${BATCH}…`)

  let inserted = 0
  let failed = 0
  for (let i = 0; i < upserts.length; i += BATCH) {
    const batch = upserts.slice(i, i + BATCH)
    const { error } = await sb
      .from('contact_directory')
      .upsert(batch, { onConflict: 'canonical_name,primary_phone' })
    if (error) {
      failed += batch.length
      console.error(`  ✗ batch ${i}-${i + batch.length}: ${error.message}`)
    } else {
      inserted += batch.length
      process.stdout.write(`  ✓ ${inserted}/${upserts.length}\r`)
    }
  }
  console.log(`\nDone. Upserted ${inserted}. Failed ${failed}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
