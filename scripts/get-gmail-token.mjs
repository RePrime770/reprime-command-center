/**
 * One-shot Google re-consent → new GOOGLE_REFRESH_TOKEN with gmail.modify.
 *
 * Why: the current token has Calendar + gmail.readonly only. Marking email
 * read/unread needs gmail.modify. This re-grants the FULL scope set (a superset
 * of what we already use, so nothing breaks) and captures a fresh refresh token.
 *
 * Run from the repo root:
 *   node scripts/get-gmail-token.mjs
 *
 * It opens a Google permission screen. ⚠️ Sign in as g@reprime.com (NOT
 * floridastatetrust). Click Allow. The new refresh token is written to
 * .env.local and printed so it can be pushed to Vercel.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { google } from 'googleapis'
import http from 'node:http'
import { spawn } from 'node:child_process'

const ENV_PATH = new URL('../.env.local', import.meta.url)

// Load .env.local so CLIENT_ID / SECRET are available.
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
const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES })

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Click ALLOW on the Google screen. SIGN IN AS g@reprime.com.')
console.log('  If the browser does not open, paste this URL:\n')
console.log('  ' + authUrl + '\n')
console.log('  (waiting on http://localhost:8765/cb …)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

try {
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  spawn(opener, [authUrl], { shell: true, detached: true, stdio: 'ignore' }).unref()
} catch {}

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/cb')) {
    res.writeHead(404); res.end(); return
  }
  const code = new URL(req.url, REDIRECT).searchParams.get('code')
  if (!code) {
    res.writeHead(400); res.end('No code'); return
  }
  try {
    const { tokens } = await oauth2.getToken(code)
    const refresh = tokens.refresh_token
    if (!refresh) {
      res.writeHead(500); res.end('No refresh_token returned. Revoke prior access at myaccount.google.com/permissions and retry.')
      console.error('\n❌ No refresh_token. Revoke at myaccount.google.com/permissions, then re-run.')
      server.close(); return
    }
    // Persist to .env.local (replace existing GOOGLE_REFRESH_TOKEN line).
    let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
    if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(env)) {
      env = env.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${refresh}`)
    } else {
      env += `\nGOOGLE_REFRESH_TOKEN=${refresh}\n`
    }
    writeFileSync(ENV_PATH, env)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2>✅ Done — gmail.modify granted. You can close this tab and return to the terminal.</h2>')
    console.log('\n✅ NEW GOOGLE_REFRESH_TOKEN (also written to .env.local):\n')
    console.log(refresh + '\n')
    console.log('Next: this token will be pushed to Vercel and mark-read will go live.\n')
    server.close()
  } catch (err) {
    res.writeHead(500); res.end('Token exchange failed: ' + (err?.message || 'unknown'))
    console.error('\n❌ Token exchange failed:', err?.message || err)
    server.close()
  }
})
server.listen(8765)
