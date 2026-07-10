'use client';

import React from 'react';
import { ink, success, warning } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';
import { buildRunbookSteps, requirementLabel } from '../../../lib/decks/settings-view';
import CopyPathButton from './CopyPathButton.jsx';
import { PANEL, MONO_BLOCK, MUTED_TEXT, ERROR_CODE_STYLE } from './sectionStyles.js';

// MigrationRunbook — pending SQL files from GET /api/system/schema rendered
// IN RUN ORDER as numbered steps: full repo path (exactly what the API
// returns, prefixed supabase/ — verified on disk), a copy-path button, and
// the tables/columns each file unblocks. Probe errors render separately —
// connectivity is NOT a missing migration.

function RunbookStep({ step, index }) {
  return (
    <li style={{ ...PANEL, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: ink[900],
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <div style={{ ...MONO_BLOCK, flex: 1, minWidth: 240 }}>{step.repoPath}</div>
        <CopyPathButton text={step.repoPath} />
      </div>
      {step.unblocks.length > 0 && (
        <div style={{ fontSize: 14, color: ink[500], lineHeight: 1.6 }}>
          Unblocks:{' '}
          <span style={{ fontFamily: MONO_BLOCK.fontFamily }}>
            {step.unblocks.map((r) => requirementLabel(r)).join(', ')}
          </span>
        </div>
      )}
    </li>
  );
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   data: {
 *     requirements?: import('../../../lib/decks/settings-view').SchemaRequirementReport[],
 *     pendingMigrations?: string[],
 *     probeErrors?: string[],
 *   } | null,
 *   onRetry: () => void,
 * }} props
 */
export default function MigrationRunbook({ loading, error, data, onRetry }) {
  if (loading && !data) {
    return <div style={{ ...PANEL, ...MUTED_TEXT }}>Probing database schema…</div>;
  }

  if (!data) {
    return (
      <div style={{ ...PANEL, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: ink[900] }}>
            Couldn&rsquo;t load the schema probe.
          </div>
          {error && <div style={ERROR_CODE_STYLE}>{error}</div>}
        </div>
        <button
          type="button"
          onClick={onRetry}
          style={{
            ...BTN_PILL,
            minHeight: 44,
            fontWeight: 700,
            background: ink[900],
            color: '#FFFFFF',
            fontFamily: 'inherit',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const steps = buildRunbookSteps(data.requirements, data.pendingMigrations);
  const probeErrors = Array.isArray(data.probeErrors) ? data.probeErrors : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.length === 0 ? (
        <div
          style={{
            ...PANEL,
            borderLeft: `6px solid ${success[500]}`,
            fontSize: 16,
            color: ink[700],
          }}
        >
          Schema up to date — nothing to run.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 16, color: ink[500], lineHeight: 1.55 }}>
            Run each file below in the Supabase SQL editor, in this order. The probe re-checks
            every ~5 minutes — steps disappear on their own once the SQL lands, no deploy needed.
          </div>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {steps.map((step, i) => (
              <RunbookStep key={step.file} step={step} index={i} />
            ))}
          </ol>
        </>
      )}

      {probeErrors.length > 0 && (
        <div
          role="status"
          style={{
            ...PANEL,
            borderLeft: `6px solid ${warning[500]}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: ink[900] }}>
            Probe errors — connectivity, not a missing migration
          </div>
          <div style={{ fontSize: 14, color: ink[500], lineHeight: 1.5 }}>
            These tables couldn&rsquo;t be verified right now. No SQL to run — check Supabase
            availability and the service-role env config, then let the probe retry.
          </div>
          <div style={MONO_BLOCK}>{probeErrors.join('\n')}</div>
        </div>
      )}
    </div>
  );
}
