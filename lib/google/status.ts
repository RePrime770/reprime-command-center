import { checkEnvAny, type AdapterStatus } from '../adapters/status'

/**
 * Google OAuth env check. Accepts modern (GOOGLE_OAUTH_*) or legacy
 * (GOOGLE_*) client id/secret names. Refresh token is required.
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
