/**
 * Setup-link registry — single source of truth for "where do I go to set up
 * integration X?". Consumed by the IntegrationStatusPill dropdown so each
 * setup_required row becomes actionable.
 *
 * Two kinds of setup actions:
 *   - { kind: 'route' }  — opens an in-app URL (e.g. an OAuth handshake).
 *   - { kind: 'env' }    — surfaces the missing env-var NAMES (never values;
 *                          this is a public repo) plus a help doc path.
 *
 * Keys match the `integration` string returned by /api/health adapters.
 */

export type SetupLink =
  | { kind: 'route'; href: string }
  | { kind: 'env'; envVars: readonly string[]; docPath: string }

const ENV_DOC = 'docs/ENVIRONMENT_AUDIT.md'

export const SETUP_LINKS: Readonly<Record<string, SetupLink>> = {
  supabase: {
    kind: 'env',
    envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    docPath: ENV_DOC,
  },
  anthropic: { kind: 'env', envVars: ['ANTHROPIC_API_KEY'], docPath: ENV_DOC },
  google: {
    kind: 'env',
    envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    docPath: ENV_DOC,
  },
  google_secondary: { kind: 'route', href: '/api/google/connect-secondary' },
  timelines: { kind: 'env', envVars: ['TIMELINES_API_KEY'], docPath: ENV_DOC },
  quo: { kind: 'env', envVars: ['QUO_API_KEY'], docPath: ENV_DOC },
  zoom: {
    kind: 'env',
    envVars: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
    docPath: ENV_DOC,
  },
  sendgrid: {
    kind: 'env',
    envVars: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    docPath: ENV_DOC,
  },
  pipedrive: { kind: 'env', envVars: ['PIPEDRIVE_API_TOKEN'], docPath: ENV_DOC },
  upstash: {
    kind: 'env',
    envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    docPath: ENV_DOC,
  },
  openai: { kind: 'env', envVars: ['OPENAI_API_KEY'], docPath: ENV_DOC },
  groq: { kind: 'env', envVars: ['GROQ_API_KEY'], docPath: ENV_DOC },
  elevenlabs: { kind: 'env', envVars: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'], docPath: ENV_DOC },
  slack: { kind: 'env', envVars: ['SLACK_WEBHOOK_URL'], docPath: ENV_DOC },
  pagerduty: { kind: 'env', envVars: ['PAGERDUTY_ROUTING_KEY'], docPath: ENV_DOC },
  apollo: { kind: 'env', envVars: ['APOLLO_API_KEY'], docPath: ENV_DOC },
  bluebubbles: {
    kind: 'env',
    envVars: ['BLUEBUBBLES_SERVER_URL', 'BLUEBUBBLES_PASSWORD'],
    docPath: ENV_DOC,
  },
}

/** Human-readable label for the dropdown row, keyed by integration name. */
export const INTEGRATION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  supabase: 'Supabase',
  anthropic: 'Anthropic Claude',
  google: 'Google · primary mailbox',
  google_secondary: 'Google · secondary mailbox',
  timelines: 'Timelines',
  quo: 'Quo (OpenPhone)',
  zoom: 'Zoom',
  sendgrid: 'SendGrid',
  pipedrive: 'Pipedrive',
  upstash: 'Upstash Redis',
  openai: 'OpenAI',
  groq: 'Groq',
  elevenlabs: 'ElevenLabs',
  slack: 'Slack',
  pagerduty: 'PagerDuty',
  apollo: 'Apollo',
  bluebubbles: 'BlueBubbles (iMessage)',
}

export function getSetupLink(integration: string): SetupLink | undefined {
  return SETUP_LINKS[integration]
}

export function getDisplayName(integration: string): string {
  return INTEGRATION_DISPLAY_NAMES[integration] || integration
}
