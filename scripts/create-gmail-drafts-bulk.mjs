/**
 * Captain 2026-05-25: Create 32 Gmail drafts via the Gmail API using
 * Gideon's existing GOOGLE_REFRESH_TOKEN. If the token lacks the
 * gmail.compose scope, this will 403 — fall back to MCP create_draft loop.
 */

import { readFileSync } from 'node:fs'
import { google } from 'googleapis'

try {
  const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
} catch {}

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

// Build raw RFC 2822 multipart/alternative message (plain + HTML)
function buildRawMessage({ to, subject, body, htmlBody }) {
  const boundary = '----TerminalDraft' + Math.random().toString(36).slice(2)
  // Subject must be RFC 2047 encoded if non-ASCII (Hebrew)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`

  const lines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `From: g@reprime.com`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody, 'utf8').toString('base64'),
    '',
    `--${boundary}--`,
    '',
  ]

  const raw = lines.join('\r\n')
  // Gmail API expects URL-safe base64 of the raw RFC 2822 message
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function main() {
  const drafts = JSON.parse(readFileSync('/tmp/email-only-drafts.json', 'utf8'))
  console.log(`Loaded ${drafts.length} drafts. Authenticating Gmail…`)

  const gmail = google.gmail({ version: 'v1', auth: getAuthClient() })

  let created = 0
  let failed = 0
  const results = []

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]
    try {
      const raw = buildRawMessage({
        to: d.to,
        subject: d.subject,
        body: d.body,
        htmlBody: d.htmlBody,
      })
      const res = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: { message: { raw } },
      })
      created++
      results.push({ idx: i, name: d.meta.name, to: d.to, draftId: res.data.id, ok: true })
      console.log(`  [${(i+1).toString().padStart(2)}/${drafts.length}] ✓ ${d.meta.name.padEnd(28)} ${d.to.padEnd(36)} draft ${res.data.id}`)
    } catch (err) {
      failed++
      results.push({ idx: i, name: d.meta.name, to: d.to, ok: false, err: err.message })
      console.error(`  [${(i+1).toString().padStart(2)}/${drafts.length}] ✗ ${d.meta.name.padEnd(28)} ${err.message}`)
      // If first one fails with scope error, stop early
      if (i === 0 && /scope|insufficient/i.test(err.message)) {
        console.error('\n⚠ Scope error — GOOGLE_REFRESH_TOKEN lacks gmail.compose. Stopping.')
        break
      }
    }
  }

  console.log(`\n✓ Created: ${created} · Failed: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
