'use client';

import React from 'react';
import DataGrid from '../DataGrid.jsx';
import { ink } from '../../cockpit/lib/colors.js';
import { BADGE } from '../settings/sectionStyles.js';
import {
  cadenceLabel,
  cronHealth,
  formatDurationMs,
  relativeTimeLabel,
} from '../../../lib/decks/system-view';
import { LoadingPanel, ErrorPanel, StaleRefreshNote } from './boardStates.jsx';

// CronBoard — the cron-jobs grid of the System Health deck: manifest schedule
// joined with Redis heartbeats (GET /api/system/crons). Four-state badge
// legend from lib/decks/system-view: ok / error / overdue / never.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const NO_RUN_PLACEHOLDER = '—';

/** Badge legend: health key → { style token, label }. */
const HEALTH_BADGE = {
  ok: { style: BADGE.ok, label: 'OK' },
  error: { style: BADGE.err, label: 'Error' },
  overdue: { style: BADGE.warn, label: 'Overdue' },
  never: { style: BADGE.idle, label: 'Never ran' },
};

function buildColumns(nowMs) {
  return [
    {
      key: 'job',
      label: 'Job',
      render: (row) => (
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: ink[900], fontFamily: MONO, fontSize: 15 }}>
            {row.name}
          </div>
          <div style={{ fontSize: 13, color: ink[300], marginTop: 2, lineHeight: 1.4 }}>
            {row.description}
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      label: 'Schedule',
      render: (row) => (
        <div>
          <div>{cadenceLabel(row.expectedEveryMinutes)}</div>
          <div style={{ fontSize: 12, color: ink[300], fontFamily: MONO, marginTop: 2 }}>
            {row.schedule}
          </div>
        </div>
      ),
    },
    {
      key: 'lastRun',
      label: 'Last run',
      render: (row) => {
        if (!row.lastRun) return NO_RUN_PLACEHOLDER;
        return (
          <div>
            <div>{relativeTimeLabel(row.lastRun.at, nowMs)}</div>
            {row.lastRun.note && (
              <div style={{ fontSize: 12, color: ink[300], marginTop: 2 }}>{row.lastRun.note}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'duration',
      label: 'Duration',
      align: 'right',
      render: (row) => (row.lastRun ? formatDurationMs(row.lastRun.ms) : NO_RUN_PLACEHOLDER),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const badge = HEALTH_BADGE[cronHealth(row, nowMs)] || HEALTH_BADGE.never;
        return <span style={badge.style}>{badge.label}</span>;
      },
    },
  ];
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   data: { crons?: import('../../../lib/decks/system-view').CronRunView[], redisConfigured?: boolean } | null,
 *   nowMs: number | null,
 *   onRetry: () => void,
 * }} props
 */
export default function CronBoard({ loading, error, data, nowMs, onRetry }) {
  const crons = Array.isArray(data?.crons) ? data.crons : null;

  // nowMs is mount-gated (useNowMs) — data only ever arrives client-side
  // after mount, so this guard is belt-and-braces against a null clock.
  if ((loading && !crons) || (crons && nowMs === null)) {
    return <LoadingPanel label="Checking cron heartbeats…" />;
  }

  if (!crons) {
    return <ErrorPanel title="Couldn't load cron status." code={error} onRetry={onRetry} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <StaleRefreshNote code={error} />}
      <DataGrid
        columns={buildColumns(nowMs)}
        rows={crons}
        rowKey={(row) => row.name}
        emptyText="No cron jobs in the manifest."
      />
    </div>
  );
}
