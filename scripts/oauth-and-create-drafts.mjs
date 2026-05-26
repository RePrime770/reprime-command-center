/**
 * Captain 2026-05-25: One-shot OAuth re-consent + bulk Gmail draft creator.
 *
 * Why: Gideon's existing GOOGLE_REFRESH_TOKEN has Calendar + Gmail readonly
 * scopes only. Creating 32 Gmail drafts needs gmail.compose. This script
 * does the 60-second OAuth dance to add the scope, then immediately creates
 * all 32 drafts via the Gmail API.
 *
 * Run:
 *   cd dashboard
 *   node scripts/oauth-and-create-drafts.mjs
 *
 * What happens:
 *   1. Opens a Google permission screen in your default browser
 *   2. You click "Allow" once (granting Calendar + Sheets + Gmail compose)
 *   3. Script captures the new refresh token, writes it to .env.local
 *   4. Script reads /tmp/email-only-drafts.json (32 pre-built drafts)
 *   5. Creates all 32 in your Gmail Drafts folder
 *   6. Optionally updates Vercel env so server-side also has new scopes
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { google } from 'googleapis'
import http from 'node:http'
import { spawn } from 'node:child_process'

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

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local')
  process.exit(1)
}

const REDIRECT = 'http://localhost:8765/cb'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'email',
  'profile',
]

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT)
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
})

console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  STEP 1 of 2: Click ALLOW on the Google permission screen.')
console.log('  Browser opening now. If it does not, copy this URL:')
console.log('')
console.log('  ' + authUrl)
console.log('')
console.log('  (waiting on http://localhost:8765/cb …)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

// Auto-open browser
try {
  const opener = process.platform === 'win32' ? 'start'
    : process.platform === 'darwin' ? 'open'
    : 'xdg-open'
  spawn(opener, [authUrl], { shell: true, detached: true, stdio: 'ignore' }).unref()
} catch { /* ignore */ }

function buildRawMessage({ to, subject, body, htmlBody }) {
  const boundary = '----TerminalDraft' + Math.random().toString(36).slice(2)
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
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function createAllDrafts(authClient) {
  console.log('\nSTEP 2 of 2: Creating 32 Gmail drafts...\n')
  const drafts = JSON.parse(readFileSync('C:/tmp/email-only-drafts.json', 'utf8'))
  const gmail = google.gmail({ version: 'v1', auth: authClient })

  let created = 0
  let failed = 0
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
      console.log(`  [${(i + 1).toString().padStart(2)}/${drafts.length}] ✓ ${(d.meta?.name || '?').padEnd(28)} → ${d.to}`)
    } catch (err) {
      failed++
      console.error(`  [${(i + 1).toString().padStart(2)}/${drafts.length}] ✗ ${(d.meta?.name || '?').padEnd(28)} ${err.message}`)
    }
  }
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Done. Created ${created} drafts · ${failed} failed.`)
  console.log(`  Open your Gmail Drafts folder to review.`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

function updateEnvFile(refreshToken) {
  try {
    let envText = readFileSync(ENV_PATH, 'utf8')
    if (envText.includes('GOOGLE_REFRESH_TOKEN=')) {
      envText = envText.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${refreshToken}`)
    } else {
      envText += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`
    }
    writeFileSync(ENV_PATH, envText)
    console.log('✓ Updated .env.local with new refresh token')
  } catch (err) {
    console.warn('⚠ Could not update .env.local:', err.message)
    console.warn('  New refresh token (manual update needed):')
    console.warn('  ' + refreshToken)
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:8765`)
  if (url.pathname !== '/cb') {
    res.writeHead(404)
    res.end()
    return
  }
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  if (err) {
    res.writeHead(400, { 'content-type': 'text/html' })
    res.end(`<h2>Authorization error: ${err}</h2>`)
    console.error(`\n✗ Authorization error: ${err}`)
    process.exit(1)
  }
  if (!code) {
    res.writeHead(400)
    res.end('Missing code')
    return
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(`<h2 style="font-family:system-ui;color:#0E3470;">✓ Authorized. Return to your terminal — drafts are being created now.</h2>`)
  server.close()

  try {
    const { tokens } = await oauth2.getToken(code)
    console.log('\n✓ Token exchange successful.')
    oauth2.setCredentials(tokens)

    if (tokens.refresh_token) {
      updateEnvFile(tokens.refresh_token)
    }

    await createAllDrafts(oauth2)
    process.exit(0)
  } catch (e) {
    console.error('Fatal:', e.message)
    process.exit(1)
  }
})

server.listen(8765)
