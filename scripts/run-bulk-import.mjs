/**
 * One-shot run of the Pipedrive bulk-import logic locally — same dedupe/upsert
 * rules as `dashboard/lib/pipedrive/bulk-upsert.ts`, but executed in-process
 * against prod Supabase + prod Pipedrive. No Vercel route, no auth-bypass
 * commit, no 5-min timeout.
 *
 *   cd dashboard && node ../../reprime-worktrees/code28-bulk-import/scripts/run-bulk-import.mjs
 *
 * Reads from contact_directory, writes to Pipedrive Persons + Organizations.
 * Idempotent — re-running is safe (existing matches are PATCH-only).
 *
 * Logs progress to stdout AND appends to results.md so the audit trail
 * survives any terminal closure.
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── env loader ────────────────────────────────────────────────────────────
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!process.env[m[1]]) process.env[m[1]] = v
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN
if (!SUPABASE_URL || !SUPABASE_KEY || !PIPEDRIVE_TOKEN) {
  console.error('Missing env: SUPABASE_URL/SERVICE_ROLE_KEY/PIPEDRIVE_API_TOKEN')
  process.exit(1)
}

// ── Pipedrive field keys (mirrors lib/pipedrive/client.ts) ────────────────
const TAG_KEY = 'd57ae324f61ddb2b922fb2e212f0723baba92448'

// ── Pipedrive REST helpers ────────────────────────────────────────────────
const PD_BASE = 'https://api.pipedrive.com/v1'

async function pd(path, init = {}) {
  const url = new URL(PD_BASE + path)
  url.searchParams.set('api_token', PIPEDRIVE_TOKEN)
  // Retry on 429 with exponential backoff (Pipedrive: 10 req / 2 sec)
  let attempt = 0
  while (true) {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (res.status === 429 && attempt < 5) {
      const wait = Math.min(8000, 1000 * Math.pow(2, attempt))
      attempt++
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Pipedrive ${init.method ?? 'GET'} ${path}: ${res.status} ${body.slice(0, 200)}`)
    }
    return res.json()
  }
}

// Org cache to avoid repeated find calls
const orgCache = new Map()
async function findOrCreateOrganization(name) {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (orgCache.has(trimmed.toLowerCase())) return orgCache.get(trimmed.toLowerCase())
  const search = await pd(`/organizations/search?term=${encodeURIComponent(trimmed)}&exact_match=true&fields=name`)
  const items = search.data?.items ?? []
  let id = items[0]?.item?.id ?? null
  if (!id) {
    const created = await pd('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: trimmed }),
    })
    id = created.data?.id ?? null
  }
  if (id) orgCache.set(trimmed.toLowerCase(), id)
  return id
}

async function findPersonByEmail(email) {
  const r = await pd(`/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&limit=1`)
  return r.data?.items?.[0]?.item ?? null
}

async function findPersonByPhone(phone) {
  const r = await pd(`/persons/search?term=${encodeURIComponent(phone)}&fields=phone&exact_match=true&limit=1`)
  return r.data?.items?.[0]?.item ?? null
}

async function getPerson(id) {
  const r = await pd(`/persons/${id}`)
  return r.data
}

async function createPerson(body) {
  const r = await pd('/persons', { method: 'POST', body: JSON.stringify(body) })
  return r.data
}

async function updatePerson(id, body) {
  const r = await pd(`/persons/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  return r.data
}

// ── phone normalization (mirrors lib/timelines/normalize-phone) ───────────
function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (raw.startsWith('+')) return `+${digits}`
  return `+${digits}`
}

// ── upsert one row (mirrors bulk-upsert.ts logic) ─────────────────────────
function emailValues(p) {
  return (p.email || []).map(e => (e.value || '').trim().toLowerCase()).filter(Boolean)
}
function phoneValues(p) {
  return (p.phone || []).map(e => (e.value || '').trim()).filter(Boolean)
}
function appendContactValue(existing, value, label) {
  const list = (existing || []).map(e => ({ ...e }))
  const hasPrimary = list.some(e => e.primary)
  list.push({ value, primary: !hasPrimary, label })
  return list
}

async function upsertOneRow(row) {
  const name = (row.name || '').trim()
  const email = (row.email || '').trim().toLowerCase()
  const phoneNorm = row.phone ? normalizePhone(row.phone) : null
  const orgName = (row.org || '').trim()
  const tag = (row.tag || '').trim()

  if (!name && !email && !phoneNorm) {
    return { status: 'skipped', reason: 'no name/email/phone' }
  }

  // Search uses lightweight result set; fetch full person before patching.
  let existingLight = null
  if (email) existingLight = await findPersonByEmail(email)
  if (!existingLight && phoneNorm) existingLight = await findPersonByPhone(phoneNorm)

  let orgId = null
  if (orgName) orgId = await findOrCreateOrganization(orgName)

  if (existingLight) {
    const existing = await getPerson(existingLight.id)
    const patch = {}

    if (name) {
      const existingName = (existing.name || '').trim()
      if (!existingName || existingName.toLowerCase() === email) patch.name = name
    }
    if (email && !emailValues(existing).includes(email)) {
      patch.email = appendContactValue(existing.email, email, 'work')
    }
    if (phoneNorm) {
      const have = phoneValues(existing).map(p => normalizePhone(p) || p)
      if (!have.includes(phoneNorm)) {
        patch.phone = appendContactValue(existing.phone, phoneNorm, 'mobile')
      }
    }
    if (orgId && !existing.org_id) patch.org_id = orgId
    if (tag) {
      const existingTag = existing[TAG_KEY]
      if (!existingTag || !String(existingTag).trim()) patch[TAG_KEY] = tag
    }

    if (Object.keys(patch).length === 0) {
      return { status: 'skipped', person_id: existing.id, reason: 'no new fields' }
    }
    await updatePerson(existing.id, patch)
    return { status: 'updated', person_id: existing.id }
  }

  const body = {}
  body.name = name || email || phoneNorm
  if (email) body.email = [{ value: email, primary: true, label: 'work' }]
  if (phoneNorm) body.phone = [{ value: phoneNorm, primary: true, label: 'mobile' }]
  if (orgId) body.org_id = orgId
  if (tag) body[TAG_KEY] = tag
  const created = await createPerson(body)
  return { status: 'created', person_id: created.id }
}

// ── main loop ─────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function loadRows() {
  const out = []
  const pageSize = 1000
  let from = 0
  for (let safety = 0; safety < 20; safety++) {
    const { data, error } = await sb
      .from('contact_directory')
      .select('canonical_name, primary_email, primary_phone, company, is_investor')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`contact_directory read failed: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) {
      const name = (r.canonical_name || '').trim()
      if (!name && !r.primary_email && !r.primary_phone) continue
      out.push({
        name: name || null,
        email: r.primary_email,
        phone: r.primary_phone,
        org: r.company,
        tag: r.is_investor ? 'investor' : null,
      })
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return out
}

const startedAt = new Date().toISOString()
console.log(`[${startedAt}] Loading contact_directory rows…`)
const rows = await loadRows()
console.log(`Loaded ${rows.length} rows.`)

const RESULTS = './results.md'
writeFileSync(RESULTS, `# Pipedrive bulk-import results

Started: ${startedAt}
Source: contact_directory (${rows.length} rows)

## Progress log

`)

const state = { processed: 0, total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] }

for (let i = 0; i < rows.length; i++) {
  const row = rows[i]
  try {
    const outcome = await upsertOneRow(row)
    if (outcome.status === 'created') state.created++
    else if (outcome.status === 'updated') state.updated++
    else state.skipped++
  } catch (err) {
    const msg = String(err.message || err).slice(0, 300)
    state.errors.push({ row: i + 1, name: row.name, message: msg })
    state.skipped++
    // Log first 5 errors inline so we can diagnose mid-run
    if (state.errors.length <= 5 || state.errors.length % 100 === 0) {
      console.error(`  ERR row ${i + 1} (${row.name || '?'}): ${msg}`)
    }
  }
  state.processed = i + 1
  if (state.processed % 25 === 0 || state.processed === rows.length) {
    const line = `${state.processed}/${state.total} — created:${state.created} updated:${state.updated} skipped:${state.skipped} errors:${state.errors.length}`
    console.log(line)
    appendFileSync(RESULTS, `- ${new Date().toISOString()} — ${line}\n`)
  }
  // Simple rate limit: Pipedrive caps at 10 req / 2 sec on the search API.
  // Each row burns 1-3 search calls + 1 create/update. Sleep 250ms between
  // rows to stay well under burst.
  if (i < rows.length - 1) await new Promise(r => setTimeout(r, 250))
}

const finishedAt = new Date().toISOString()
const summary = `\n## Final summary\n\n` +
  `- Started: ${startedAt}\n` +
  `- Finished: ${finishedAt}\n` +
  `- Total rows processed: ${state.processed}\n` +
  `- Created: ${state.created}\n` +
  `- Updated: ${state.updated}\n` +
  `- Skipped: ${state.skipped}\n` +
  `- Errors: ${state.errors.length}\n`

appendFileSync(RESULTS, summary)
console.log(summary)

if (state.errors.length > 0) {
  appendFileSync(RESULTS, `\n## First 20 errors\n\n`)
  for (const e of state.errors.slice(0, 20)) {
    appendFileSync(RESULTS, `- Row ${e.row} (${e.name || '?'}): ${e.message}\n`)
  }
  console.log(`\nFirst error sample:\n${JSON.stringify(state.errors.slice(0, 3), null, 2)}`)
}
