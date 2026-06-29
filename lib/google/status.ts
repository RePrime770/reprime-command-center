import { checkEnvAny, type AdapterStatus } from '../adapters/status'

/**
 * Google OAuth env check. Accepts modern (GOOGLE_OAUTH_*) or legacy
 * (GOOGLE_*) client id/secret names. The primary refresh token is required;
 * the secondary token (GOOGLE_REFRESH_TOKEN_2) is reported separately by
 * getSecondaryStatus() so the UI can show "Setup required" without failing
 * the whole integration.
 */
export function getStatus(): AdapterStatus {
  return checkEnvAny('google', [
    {
      label: 'GOOGLE_OAUTH_CLIENT_ID',
      names: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    },
    {
      label: 'GOOGLE_OAUTH_CLIENT_SECRET',
      names: ['GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
    },
    { label: 'GOOGLE_REFRESH_TOKEN', names: ['GOOGLE_REFRESH_TOKEN'] },
  ])
}

/**
 * Status of the second Gmail mailbox's refresh token. Separate from the
 * primary integration check so a missing secondary doesn't block sync of
 * the primary mailbox.
 */
export function getSecondaryStatus(): AdapterStatus {
  return checkEnvAny('google_secondary', [
    { label: 'GOOGLE_REFRESH_TOKEN_2', names: ['GOOGLE_REFRESH_TOKEN_2'] },
  ])
}
