'use client'

import React from 'react'
import DeckShell from '@/components/decks/DeckShell.jsx'
import useDeckData from '@/components/decks/useDeckData.js'
import useHealth from '@/components/decks/settings/useHealth.js'
import IntegrationsSection from '@/components/decks/settings/IntegrationsSection.jsx'
import MigrationRunbook from '@/components/decks/settings/MigrationRunbook.jsx'
import EnvReferenceSection from '@/components/decks/settings/EnvReferenceSection.jsx'
import { SECTION_TITLE, SECTION_HINT } from '@/components/decks/settings/sectionStyles.js'
import type { SchemaRequirementReport } from '@/lib/decks/settings-view'

/**
 * /cockpit/settings — Settings & Integrations deck (roadmap Phase 3).
 *
 * Settings v1 is READ + GUIDE only: secrets live in Vercel env config, and
 * this deck's job is to show what is connected and exactly what Gideon must
 * do next. No forms accept or post secret values — env NAMES only (public
 * repo, architecture §3.4). Session-gated by proxy.ts like every /cockpit/*
 * path; the Flight Deck itself is untouched.
 *
 * Data sources (client-side, each with its own loading/empty/error states):
 *   - GET /api/health          → integrations + env-name booleans (plain JSON)
 *   - GET /api/system/schema   → migration runbook (RouteEnvelope, 60s poll)
 *
 * Hydration-safe: nothing here renders time; DeckShell's clock is already
 * mount-gated (DeckClock pattern).
 */

const SCHEMA_REFRESH_MS = 60_000
const CONTENT_MAX_WIDTH = 1180

interface SchemaDeckData {
  requirements?: SchemaRequirementReport[]
  pendingMigrations?: string[]
  probeErrors?: string[]
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

export default function SettingsDeckPage() {
  const { loading: healthLoading, health, error: healthError, refresh: refreshHealth } = useHealth()
  const schema = useDeckData<SchemaDeckData>('/api/system/schema', {
    refreshMs: SCHEMA_REFRESH_MS,
  })

  return (
    <DeckShell
      title="Settings & Integrations"
      subtitle="Read-only: what's connected, and exactly what to run next"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          maxWidth: CONTENT_MAX_WIDTH,
        }}
      >
        <Section
          title="Integrations"
          hint="Live connection status from /api/health. Disconnected rows show the exact setup step — secrets are set in Vercel, never here."
        >
          <IntegrationsSection
            loading={healthLoading}
            error={healthError}
            health={health}
            onRetry={refreshHealth}
          />
        </Section>

        <Section
          title="Migration runbook"
          hint="Pending SQL files in run order, straight from the live schema probe. Copy a path, run the file in the Supabase SQL editor, and the step clears itself."
        >
          <MigrationRunbook
            loading={schema.loading}
            error={schema.error}
            data={schema.data}
            onRetry={schema.refresh}
          />
        </Section>

        <Section
          title="Environment reference"
          hint="Env var NAMES grouped like .env.example, with presence derived from /api/health. Values are never displayed or accepted anywhere in this deck."
        >
          <EnvReferenceSection loading={healthLoading} error={healthError} health={health} />
        </Section>
      </div>
    </DeckShell>
  )
}
