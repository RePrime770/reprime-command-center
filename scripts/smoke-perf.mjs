#!/usr/bin/env node
// scripts/smoke-perf.mjs
//
// Smoke-tests the auth-gated perf endpoints by minting a real session for
// g@reprime.com via the service role + magic-link flow, then forging the
// @supabase/ssr cookie shape so route handlers and proxy.ts both see a
// logged-in user.
//
// Usage:
//   node scripts/smoke-perf.mjs                    — warm cache check (default)
//   node scripts/smoke-perf.mjs --base http://localhost:3002
//   node scripts/smoke-perf.mjs --runs 30          — sample size
//
// Reads SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local.

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
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // fall through
  }
  for (const k of Object.keys(out)) {
    if (!process.env[k]) process.env[k] = out[k]
  }
  return out
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = 'g@reprime.com'

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}

const baseFlag = process.argv.indexOf('--base')
const BASE = baseFlag !== -1 ? process.argv[baseFlag + 1] : 'http://localhost:3002'
const runsFlag = process.argv.indexOf('--runs')
const RUNS = runsFlag !== -1 ? Number(process.argv[runsFlag + 1]) : 20

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const COOKIE_NAME = `sb-${projectRef}-auth-token`

async function mintSession() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
  })
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${error?.message ?? 'no token'}`)
  }
  const tokenHash = data.properties.hashed_token

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })
  if (vErr || !verified?.session) {
    throw new Error(`verifyOtp failed: ${vErr?.message ?? 'no session'}`)
  }
  return verified.session
}

function buildCookieHeader(session) {
  // @supabase/ssr v0.10 stores the session as `base64-` + base64(JSON) in a
  // single cookie (or chunked beyond ~3.6KB; sessions fit in one chunk).
  const json = JSON.stringify(session)
  const b64 = Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${COOKIE_NAME}=base64-${b64}`
}

async function timeOnce(url, cookieHeader) {
  const start = Date.now()
  const res = await fetch(url, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
    redirect: 'manual',
  })
  const ms = Date.now() - start
  const body = await res.text()
  return { status: res.status, ms, bytes: body.length, sample: body.slice(0, 120) }
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
  const avg = sorted.reduce((s, n) => s + n, 0) / sorted.length
  return {
    n: sorted.length,
    min: sorted[0],
    avg: Math.round(avg),
    p50: p(0.5),
    p90: p(0.9),
    p95: p(0.95),
    max: sorted[sorted.length - 1],
  }
}

async function probe(label, path, cookieHeader, target) {
  const url = `${BASE}${path}`
  // Single warmup to populate the cache, then RUNS measured runs.
  const warm = await timeOnce(url, cookieHeader)
  if (warm.status !== 200) {
    console.error(`[${label}] warmup non-200: status=${warm.status} body=${warm.sample}`)
    return { label, target, ok: false }
  }
  const samples = []
  for (let i = 0; i < RUNS; i++) {
    const r = await timeOnce(url, cookieHeader)
    if (r.status !== 200) {
      console.error(`[${label}] run ${i} non-200: status=${r.status} body=${r.sample}`)
      return { label, target, ok: false }
    }
    samples.push(r.ms)
  }
  const s = summarize(samples)
  const passed = s.p95 < target
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${label}  warm=${warm.ms}ms  n=${s.n}  min=${s.min}  avg=${s.avg}  p50=${s.p50}  p90=${s.p90}  p95=${s.p95}  max=${s.max}  target=${target}ms`)
  return { label, target, ok: passed, ...s }
}

async function main() {
  console.log(`[smoke-perf] base=${BASE}  runs=${RUNS}  email=${EMAIL}`)
  console.log(`[smoke-perf] minting session...`)
  const session = await mintSession()
  const cookieHeader = buildCookieHeader(session)
  console.log(`[smoke-perf] session ok  user=${session.user?.email}  cookie_bytes=${cookieHeader.length}`)

  const results = []
  results.push(await probe('GET /api/bucket?status=open', '/api/bucket?status=open', cookieHeader, 1500))
  results.push(await probe('GET /api/briefing/today',     '/api/briefing/today',     cookieHeader, 2000))

  const failed = results.filter((r) => !r.ok)
  console.log()
  console.log(`[smoke-perf] ${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
