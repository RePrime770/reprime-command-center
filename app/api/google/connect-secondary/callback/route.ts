import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/google/connect-secondary/callback
 *
 * Google bounces the user here after consent. We exchange the `code` for an
 * access + refresh token, then render an HTML page showing the refresh_token
 * with a copy button + clear instructions for pasting into Vercel as
 * GOOGLE_REFRESH_TOKEN_2. The token is shown ONCE, on the response body, and
 * never persisted server-side (we don't have write access to Vercel env from
 * the runtime).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHtml(opts: {
  title: string
  bodyHtml: string
}): string {
  // Self-contained, no external assets. Inline CSS — kiosk-styled.
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light}
  body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:#F8FAFC;color:#0F172A;margin:0;padding:40px 24px;line-height:1.5}
  main{max-width:680px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:28px;box-shadow:0 1px 2px rgba(15,23,42,0.05)}
  h1{margin:0 0 8px;font-size:22px;font-weight:800}
  h2{margin:24px 0 8px;font-size:15px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#475569}
  p{margin:0 0 10px}
  code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .token{display:block;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:14px;font-size:13px;word-break:break-all;margin:8px 0 12px}
  ol{margin:8px 0 0 22px;padding:0}
  ol li{margin-bottom:8px}
  .pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase}
  .ok{background:#DCFCE7;color:#166534}
  .err{background:#FEE2E2;color:#991B1B}
  button{background:#0F172A;color:#FFFFFF;border:none;border-radius:6px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
  button:hover{background:#1E293B}
  .small{font-size:13px;color:#64748B}
  a{color:#2563EB}
</style></head>
<body><main>${opts.bodyHtml}
<script>
  function copyToken(){
    var t=document.getElementById('refresh-token-value');
    if(!t) return;
    navigator.clipboard.writeText(t.textContent.trim()).then(function(){
      var b=document.getElementById('copy-btn');
      if(b){var prev=b.textContent;b.textContent='Copied ✓';setTimeout(function(){b.textContent=prev},1500)}
    })
  }
</script></main></body></html>`
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')

  if (err) {
    return new NextResponse(
      renderHtml({
        title: 'Google authorization failed',
        bodyHtml: `
          <span class="pill err">Authorization failed</span>
          <h1>Google didn't return a token.</h1>
          <p><b>Reason:</b> <code>${escapeHtml(err)}</code></p>
          <p>Common causes:</p>
          <ul>
            <li><b>redirect_uri_mismatch</b> — add this exact URL to the OAuth client's authorized redirect URIs in Google Cloud Console:
              <pre class="token">${escapeHtml(url.origin)}/api/google/connect-secondary/callback</pre>
            </li>
            <li><b>access_denied</b> — you clicked Cancel. Try again.</li>
          </ul>
          <p><a href="/api/google/connect-secondary">Try again</a> · <a href="/cockpit">Back to cockpit</a></p>
        `,
      }),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  if (!code) {
    return new NextResponse(
      renderHtml({
        title: 'Google authorization failed',
        bodyHtml: `
          <span class="pill err">Missing code</span>
          <h1>Google didn't return an authorization code.</h1>
          <p><a href="/api/google/connect-secondary">Start over</a> · <a href="/cockpit">Back to cockpit</a></p>
        `,
      }),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderHtml({
        title: 'OAuth client not configured',
        bodyHtml: `
          <span class="pill err">Setup required</span>
          <h1>OAuth client env vars are missing.</h1>
          <p>Set <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> on Vercel, then try again.</p>
        `,
      }),
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  const redirectUri = `${url.origin}/api/google/connect-secondary/callback`
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2.getToken(code)
    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      return new NextResponse(
        renderHtml({
          title: 'No refresh token returned',
          bodyHtml: `
            <span class="pill err">No refresh token</span>
            <h1>Google didn't return a refresh token.</h1>
            <p>This usually happens when you've previously authorized this app for the same account. To force a fresh token:</p>
            <ol>
              <li>Open <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a></li>
              <li>Find "RePrime Command Center" (or whichever app name the OAuth client uses), click <b>Remove access</b></li>
              <li><a href="/api/google/connect-secondary">Try again</a></li>
            </ol>
          `,
        }),
        { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
      )
    }

    // Try to identify which account actually consented (sanity check).
    let connectedAs = 'unknown account'
    try {
      oauth2.setCredentials(tokens)
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
      const info = await oauth2Api.userinfo.get()
      if (info.data?.email) connectedAs = info.data.email
    } catch {
      // Non-fatal — we still have the token, just couldn't fetch the email.
    }

    const isFst = /floridastatetrust/i.test(connectedAs)
    const accountPill = isFst
      ? `<span class="pill ok">Connected ${escapeHtml(connectedAs)}</span>`
      : `<span class="pill err">Wrong account: ${escapeHtml(connectedAs)}</span>`
    const wrongAccountNote = isFst
      ? ''
      : `<p style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:10px 14px;border-radius:6px;color:#78350F"><b>Heads up:</b> you signed in as <code>${escapeHtml(connectedAs)}</code>, not <code>g@floridastatetrust.com</code>. If you intended a different account, <a href="/api/google/connect-secondary">try again</a> and pick the right one. Otherwise pasting this token will set the secondary mailbox to <code>${escapeHtml(connectedAs)}</code>.</p>`

    return new NextResponse(
      renderHtml({
        title: 'Connected — paste this token into Vercel',
        bodyHtml: `
          ${accountPill}
          <h1>Refresh token received.</h1>
          ${wrongAccountNote}
          <h2>Step 1 — Copy the token</h2>
          <div class="token" id="refresh-token-value">${escapeHtml(refreshToken)}</div>
          <button id="copy-btn" type="button" onclick="copyToken()">Copy to clipboard</button>
          <h2>Step 2 — Paste it into Vercel</h2>
          <p>Open Vercel → project <code>project-7e87w</code> → Settings → Environment Variables, then add:</p>
          <pre class="token">GOOGLE_REFRESH_TOKEN_2=&lt;paste the token above&gt;</pre>
          <p class="small">Save, and Vercel will redeploy automatically. Within ~5 min the second inbox tab in the cockpit will replace the "Setup required" notice with the live inbox.</p>
          <h2>Step 3 — Verify</h2>
          <p>After the redeploy, open <a href="/api/health" target="_blank">/api/health</a> — the <code>integrations</code> array should show <code>google</code> + <code>google-secondary</code> both <code>ok: true</code>.</p>
          <p><a href="/cockpit">Back to cockpit</a></p>
        `,
      }),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'unknown error'
    console.error('[google/connect-secondary/callback] token exchange failed:', detail)
    return new NextResponse(
      renderHtml({
        title: 'Token exchange failed',
        bodyHtml: `
          <span class="pill err">Exchange failed</span>
          <h1>Google rejected the authorization code.</h1>
          <p>The most common reason is the redirect URI in Google Cloud Console doesn't match the one this app uses. Add this exact URL to the OAuth client's authorized redirect URIs:</p>
          <pre class="token">${escapeHtml(url.origin)}/api/google/connect-secondary/callback</pre>
          <p><a href="/api/google/connect-secondary">Try again</a></p>
        `,
      }),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }
}
