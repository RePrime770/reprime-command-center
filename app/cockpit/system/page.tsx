'use client'

import React from 'react'
import DeckShell from '@/components/decks/DeckShell.jsx'
import StatCard from '@/components/decks/StatCard.jsx'
import useDeckData from '@/components/decks/useDeckData.js'
import useHealth from '@/components/decks/settings/useHealth.js'
import useNowMs from '@/components/decks/system/useNowMs.js'
import CronBoard from '@/components/decks/system/CronBoard.jsx'
import SchemaBoard from '@/components/decks/system/SchemaBoard.jsx'
import HealthCard from '@/components/decks/system/HealthCard.jsx'
import { SECTION_TITLE, SECTION_HINT } from '@/components/decks/settings/sectionStyles.js'
import { success, warning, danger, ink } from '@/components/cockpit/lib/colors.js'
import {
  cronTally,
  integrationTally,
  schemaTally,
  type CronRunView,
  type SystemHealthSnapshot,
  type Tally,
} from '@/lib/decks/system-view'
import type { SchemaRequirementReport } from '@/lib/decks/settings-view'

/**
 * /cockpit/system — System Health deck (roadmap Phase 3).
 *
 * One screen answering "is the OS actually running?": cron heartbeats vs the
 * manifest, live schema vs required migrations, and the deploy/health probe.
 * READ-ONLY — no mutations, no fake buttons. Session-gated by proxy.ts like
 * every /cockpit/* path (NOT in PUBLIC_PATHS); the Flight Deck is untouched.
 *
 * Data sources (each with its own loading/empty/error states):
 *   - GET /api/system/crons  → RouteEnvelope, 30s poll (useDeckData); carries
 *     a setup_required ModuleStatus when Upstash is unconfigured → passed
 *     straight to DeckShell's SetupRequiredBanner.
 *   - GET /api/system/schema → RouteEnvelope, 60s poll (useDeckData).
 *   - GET /api/health        → PLAIN JSON (not an envelope) → useHealth
 *     (mount + 60s visibility-gated poll + manual refresh). Names and
 *     booleans only — values never exist in that payload.
 *
 * Hydration: this page can be statically prerendered, so everything
 * time-relative is mount-gated via useNowMs (DeckClock pattern) — SSR output
 * contains no clock-derived text.
 */

const CRONS_REFRESH_MS = 30_000
const SCHEMA_REFRESH_MS = 60_000
const CONTENT_MAX_WIDTH = 1180
const STAT_PLACEHOLDER = '—'

interface CronsDeckData {
  crons?: CronRunView[]
  redisConfigured?: boolean
}

interface SchemaDeckData {
  requirements?: SchemaRequirementReport[]
  pendingMigrations?: string[]
  probeErrors?: string[]
}

/** "x/y" StatCard value, or the placeholder while a source is still loading. */
function tallyValue(tally: Tally | null): string {
  return tally ? `${tally.ready}/${tally.total}` : STAT_PLACEHOLDER
}

/** Green when everything's ready, amber when partial, red when nothing is. */
function tallyAccent(tally: Tally | null): string {
  if (!tally || tally.total === 0) return ink[500]
  if (tally.ready === tally.total) return success[700]
  return tally.ready === 0 ? danger[700] : warning[700]
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 style={SECTION_TITLE}>{title}</h2>
        <p style={SECTION_HINT}>{hint}</p>
      </div>
      {children}
    </section>
  )
}

export default function SystemDeckPage() {
  const crons = useDeckData<CronsDeckData>('/api/system/crons', { refreshMs: CRONS_REFRESH_MS })
  const schema = useDeckData<SchemaDeckData>('/api/system/schema', {
    refreshMs: SCHEMA_REFRESH_MS,
  })
  const { loading: healthLoading, health, error: healthError, refresh: refreshHealth } =
    useHealth() as {
      loading: boolean
      health: SystemHealthSnapshot | null
      error: string | null
      refresh: () => Promise<void>
    }
  const nowMs = useNowMs()

  const cronList = Array.isArray(crons.data?.crons) ? crons.data.crons : null
  const cronStats = cronList && nowMs !== null ? cronTally(cronList, nowMs) : null
  const schemaStats = Array.isArray(schema.data?.requirements)
    ? schemaTally(schema.data.requirements)
    : null
  const integrationStats = Array.isArray(health?.integrations)
    ? integrationTally(health.integrations)
    : null
  const pendingCount = Array.isArray(schema.data?.pendingMigrations)
    ? schema.data.pendingMigrations.length
    : null

  return (
    <DeckShell
      title="System Health"
      subtitle="Crons, schema, and deploy status — live, read-only"
      status={crons.status}
      setupHref="/cockpit/settings"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          maxWidth: CONTENT_MAX_WIDTH,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard
            label="Crons healthy"
            value={tallyValue(cronStats)}
            accent={tallyAccent(cronStats)}
            hint={
              crons.data?.redisConfigured === false
                ? 'heartbeats need Redis'
                : 'last run within 2× cadence'
            }
          />
          <StatCard
            label="Pending migrations"
            value={pendingCount === null ? STAT_PLACEHOLDER : pendingCount}
            accent={
              pendingCount === null
                ? ink[500]
                : pendingCount > 0
                  ? warning[700]
                  : success[700]
            }
            hint="runbook in Settings"
          />
          <StatCard
            label="Schema ready"
            value={tallyValue(schemaStats)}
            accent={tallyAccent(schemaStats)}
            hint="tables + columns probed live"
          />
          <StatCard
            label="Integrations"
            value={tallyValue(integrationStats)}
            accent={tallyAccent(integrationStats)}
            hint="connected, per /api/health"
          />
        </div>

        <Section
          title="Cron jobs"
          hint="Every scheduled job from the manifest, joined with its last heartbeat. Overdue = no successful run within 2× the expected cadence (5-minute floor)."
        >
          <CronBoard
            loading={crons.loading}
            error={crons.error}
            data={crons.data}
            nowMs={nowMs}
            onRetry={crons.refresh}
          />
        </Section>

        <Section
          title="Schema"
          hint="Required tables and columns vs the live database probe. The step-by-step runbook (run order + copy buttons) lives in the Settings deck."
        >
          <SchemaBoard
            loading={schema.loading}
            error={schema.error}
            data={schema.data}
            onRetry={schema.refresh}
          />
        </Section>

        <Section
          title="Deploy & health"
          hint="Straight from /api/health: deployed commit, overall status, and per-check booleans. Names and booleans only — never values."
        >
          <HealthCard
            loading={healthLoading}
            error={healthError}
            health={health}
            onRetry={refreshHealth}
          />
        </Section>
      </div>
    </DeckShell>
  )
}
