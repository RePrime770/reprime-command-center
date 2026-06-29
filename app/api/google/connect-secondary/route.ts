import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/google/connect-secondary
 *
 * Kicks off the OAuth flow to obtain a refresh token for the SECOND Gmail
 * mailbox (g@floridastatetrust.com). The user clicks the "Connect" button in
 * the cockpit's SetupRequired pane → this redirects them to Google's consent
 * screen → Google bounces back to /api/google/connect-secondary/callback,
 * which displays the refresh token for the user to paste into Vercel as
 * GOOGLE_REFRESH_TOKEN_2.
 *
 * Replaces the fragile CLI script flow that broke on shell-escaped URLs.
 * The OAuth client's authorized redirect URIs (Google Cloud Console) must
 * include `<NEXT_PUBLIC_APP_URL>/api/google/connect-secondary/callback`.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
]

export async function GET(request: NextRequest) {
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'setup_required',
        message:
          'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set on Vercel before connecting a second mailbox.',
      },
      { status: 503 }
    )
  }

  // Build the redirect URI from the request origin so it works in any
  // deployment without depending on NEXT_PUBLIC_APP_URL being correct.
  const origin =
    appUrl ||
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}`
  const redirectUri = `${origin}/api/google/connect-secondary/callback`

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    response_type: 'code',
    // login_hint helps the user land on the right Google chooser screen.
    login_hint: 'g@floridastatetrust.com',
  })

  return NextResponse.redirect(authUrl, { status: 302 })
}
