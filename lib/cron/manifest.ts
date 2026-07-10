/**
 * CRON_MANIFEST — code-side registry of every Vercel cron
 * (docs/COMMAND_CENTER_ARCHITECTURE.md §8 Phase 3).
 *
 * Must stay 1:1 with the `crons` block in vercel.json — manifest.test.ts
 * reads vercel.json at test time and fails on any drift (paths in both
 * directions, plus exact schedule strings). `name` is the heartbeat key
 * suffix each route handler stamps via lib/cron/heartbeat.ts;
 * GET /api/system/crons joins manifest entries to heartbeats by name.
 */

const EVERY_MINUTE = 1
const EVERY_5_MINUTES = 5
const EVERY_30_MINUTES = 30
const HOURLY = 60
const DAILY = 1440

export interface CronManifestEntry {
  /** Short kebab slug — heartbeat key suffix (`cron:heartbeat:<name>`). */
  readonly name: string
  /** Route path exactly as registered in vercel.json. */
  readonly path: string
  /** Cron expression exactly as registered in vercel.json. */
  readonly schedule: string
  /** Expected cadence in minutes (1440 = daily) — staleness-threshold input. */
  readonly expectedEveryMinutes: number
  readonly description: string
}

export const CRON_MANIFEST: readonly CronManifestEntry[] = [
  {
    name: 'center-drain',
    path: '/api/cron/center-drain',
    schedule: '*/1 * * * *',
    expectedEveryMinutes: EVERY_MINUTE,
    description: 'Sends the oldest queued Terminal invitation (WhatsApp + email).',
  },
  {
    name: 'dispatch-alerts',
    path: '/api/cron/dispatch-alerts',
    schedule: '*/1 * * * *',
    expectedEveryMinutes: EVERY_MINUTE,
    description: 'Drains the queued PagerDuty alert buffer from Redis.',
  },
  {
    name: 'poll-overdue',
    path: '/api/secretary/poll-overdue',
    schedule: '0 * * * *',
    expectedEveryMinutes: HOURLY,
    description: 'Flags open outbound asks past their expected reply time.',
  },
  {
    name: 'fire-reminders',
    path: '/api/bucket/fire-reminders',
    schedule: '* * * * *',
    expectedEveryMinutes: EVERY_MINUTE,
    description: 'Fires due bucket reminders (stamps fired_at for Realtime toasts).',
  },
  {
    name: 'inforuptcy-poll',
    path: '/api/cron/inforuptcy-poll',
    schedule: '0 13 * * *',
    expectedEveryMinutes: DAILY,
    description: 'Polls Inforuptcy for new filings across the 6-tenant watchlist.',
  },
  {
    name: 'slack-digest',
    path: '/api/cron/slack-digest',
    schedule: '0 13 * * *',
    expectedEveryMinutes: DAILY,
    description: 'Posts the overnight activity digest to Slack.',
  },
  {
    name: 'meeting-verify',
    path: '/api/cron/meeting-verify',
    schedule: '*/30 * * * *',
    expectedEveryMinutes: EVERY_30_MINUTES,
    description: 'Checks Zoom attendance for just-passed Terminal meetings.',
  },
  {
    name: 'center-reconcile',
    path: '/api/center/reconcile',
    schedule: '*/5 * * * *',
    expectedEveryMinutes: EVERY_5_MINUTES,
    description: 'Mirrors recent WhatsApp threads from Timelines onto the board.',
  },
  {
    name: 'gmail-watch-arm',
    path: '/api/cron/gmail-watch-arm',
    schedule: '0 6 * * *',
    expectedEveryMinutes: DAILY,
    description: 'Re-arms the Gmail push watch (watches expire every 7 days).',
  },
  {
    name: 'email-sync',
    path: '/api/email/sync',
    schedule: '*/5 * * * *',
    expectedEveryMinutes: EVERY_5_MINUTES,
    description: 'Scores recent Gmail messages for the cockpit email panel.',
  },
]
