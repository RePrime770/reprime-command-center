#!/usr/bin/env node
// scripts/smoke-cron.mjs
//
// Smoke-tests cron endpoints that are gated by Bearer ${CRON_SECRET}.
// Browser-side smoke (extension4) can't carry the secret; this runs from
// the build host where .env.local has it.
//
// Usage:
//   node scripts/smoke-cron.mjs                 — runs against production
//   node scripts/smoke-cron.mjs --base <url>    — custom base URL

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

let CRON_SECRET = ''
try {
  const env = readFileSync(envPath, 'utf8')
  const match = env.match(/^CRON_SECRET=(.+)$/m)
  if (match) CRON_SECRET = match[1].trim().replace(/^["']|["']$/g, '')
} catch {
  // fall through; env loading will be reported below
}
if (!CRON_SECRET) CRON_SECRET = process.env.CRON_SECRET ?? ''

if (!CRON_SECRET) {
  console.error('ERROR: CRON_SECRET not found in .env.local or process.env')
  process.exit(2)
}

const baseFlag = process.argv.indexOf('--base')
const BASE =
  baseFlag !== -1
    ? process.argv[baseFlag + 1]
    : 'https://project-7e87w.vercel.app'

const ENDPOINTS = [
  { path: '/api/bucket/fire-reminders', method: 'POST' },
  { path: '/api/cron/inforuptcy-poll', method: 'POST' },
  { path: '/api/cron/slack-digest', method: 'POST' },
  { path: '/api/email/sync', method: 'POST' },
]

async function smoke({ path, method }) {
  const url = `${BASE}${path}`
  const start = Date.now()
  let status = 0
  let body = ''
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'content-type': 'application/json',
      },
      body: '{}',
    })
    status = res.status
    body = (await res.text()).slice(0, 200)
  } catch (err) {
    status = -1
    body = err instanceof Error ? err.message : String(err)
  }
  const ms = Date.now() - start
  const ok = status >= 200 && status < 400
  return { url, method, status, ms, body, ok }
}

async function main() {
  console.log(`[smoke-cron] base=${BASE}`)
  console.log(`[smoke-cron] CRON_SECRET length=${CRON_SECRET.length}`)
  const results = []
  for (const ep of ENDPOINTS) {
    const r = await smoke(ep)
    const mark = r.ok ? 'PASS' : 'FAIL'
    console.log(
      `[${mark}] ${r.method} ${ep.path}  status=${r.status}  ${r.ms}ms`
    )
    if (!r.ok) console.log(`        body: ${r.body}`)
    results.push(r)
  }
  const failed = results.filter((r) => !r.ok)
  console.log()
  console.log(
    `[smoke-cron] ${results.length - failed.length}/${results.length} passed`
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

main()
