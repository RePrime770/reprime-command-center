'use client';

import React from 'react';
import Link from 'next/link';
import DataGrid from '../DataGrid.jsx';
import { ink, warning, success } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';
import { PANEL, BADGE } from '../settings/sectionStyles.js';
import { requirementLabel } from '../../../lib/decks/settings-view';
import { LoadingPanel, ErrorPanel, StaleRefreshNote } from './boardStates.jsx';

// SchemaBoard — schema requirements vs the live probe (GET /api/system/schema)
// for the System Health deck. Pending-migration COUNT is the headline here;
// the step-by-step runbook (run order + copy buttons) lives in the Settings
// deck, so this board links there instead of duplicating it.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SETTINGS_DECK_HREF = '/cockpit/settings';

/** Probe status → badge token + label ('ready' | 'migration_required' | 'error'). */
const STATUS_BADGE = {
  ready: { style: BADGE.ok, label: 'Ready' },
  migration_required: { style: BADGE.warn, label: 'Migration required' },
  error: { style: BADGE.err, label: 'Probe error' },
};

const COLUMNS = [
  {
    key: 'requirement',
    label: 'Requirement',
    render: (row) => (
      <span style={{ fontFamily: MONO, fontSize: 15, color: ink[900], fontWeight: 700 }}>
        {requirementLabel(row)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const badge = STATUS_BADGE[row.status];
      // Unknown codes render verbatim (stable codes only) — never hidden.
      if (!badge) return <span style={BADGE.idle}>{row.status || 'unknown'}</span>;
      return <span style={badge.style}>{badge.label}</span>;
    },
  },
  {
    key: 'migrationFile',
    label: 'Migration file',
    render: (row) => (
      <span style={{ fontFamily: MONO, fontSize: 13, color: ink[500], wordBreak: 'break-all' }}>
        {row.migrationFile}
      </span>
    ),
  },
];

/** @param {{ pendingCount: number, probeErrorCount: number }} props */
function PendingSummary({ pendingCount, probeErrorCount }) {
  const allClear = pendingCount === 0;
  return (
    <div style={{ ...PANEL, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            color: allClear ? success[700] : warning[700],
          }}
        >
          {pendingCount}
        </span>
        <span style={{ fontSize: 16, color: ink[500] }}>
          pending migration{pendingCount === 1 ? '' : 's'}
          {probeErrorCount > 0 &&
            ` · ${probeErrorCount} probe error${probeErrorCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <Link
        href={SETTINGS_DECK_HREF}
        style={{
          ...BTN_PILL,
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 700,
          background: ink[900],
          color: '#FFFFFF',
          textDecoration: 'none',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        Open migration runbook →
      </Link>
    </div>
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
export default function SchemaBoard({ loading, error, data, onRetry }) {
  const requirements = Array.isArray(data?.requirements) ? data.requirements : null;

  if (loading && !requirements) {
    return <LoadingPanel label="Probing the live schema…" />;
  }

  if (!requirements) {
    return <ErrorPanel title="Couldn't probe the schema." code={error} onRetry={onRetry} />;
  }

  const pendingCount = Array.isArray(data?.pendingMigrations) ? data.pendingMigrations.length : 0;
  const probeErrorCount = Array.isArray(data?.probeErrors) ? data.probeErrors.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <StaleRefreshNote code={error} />}
      <PendingSummary pendingCount={pendingCount} probeErrorCount={probeErrorCount} />
      <DataGrid
        columns={COLUMNS}
        rows={requirements}
        rowKey={(row) => `${row.kind}:${requirementLabel(row)}`}
        emptyText="No schema requirements in the manifest."
      />
    </div>
  );
}
