'use client';

import React from 'react';
import { ink, success, danger } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';
import { PANEL, BADGE, MUTED_TEXT } from '../settings/sectionStyles.js';
import { healthCheckFlags } from '../../../lib/decks/system-view';
import { LoadingPanel, ErrorPanel, StaleRefreshNote } from './boardStates.jsx';

// HealthCard — the deploy/health card of the System Health deck, fed by
// GET /api/health (PLAIN JSON, not a RouteEnvelope — fetched via useHealth,
// never useDeckData). Renders the commit SHA, overall status, and per-check
// booleans. NAMES AND BOOLEANS ONLY: /api/health never returns values, and
// nothing here renders anything that could look like one.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SHA_SHORT_LENGTH = 7;
const CHECK_MIN_WIDTH = 220;

/** overall → badge token + label ('ok' | 'degraded' | 'down'). */
const OVERALL_BADGE = {
  ok: { style: BADGE.ok, label: 'OK' },
  degraded: { style: BADGE.warn, label: 'Degraded' },
  down: { style: BADGE.err, label: 'Down' },
};

/** @param {{ name: string, ok: boolean }} props */
function CheckRow({ name, ok }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{ fontSize: 14, fontWeight: 700, color: ok ? success[700] : danger[700] }}
      >
        {ok ? '✓' : '✗'}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 13,
          color: ok ? ink[700] : danger[700],
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`${name}: ${ok ? 'present' : 'missing'}`}
      >
        {name}
      </span>
    </div>
  );
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   health: import('../../../lib/decks/system-view').SystemHealthSnapshot | null,
 *   onRetry: () => void,
 * }} props
 */
export default function HealthCard({ loading, error, health, onRetry }) {
  if (loading && !health) {
    return <LoadingPanel label="Fetching deploy health…" />;
  }

  if (!health) {
    return <ErrorPanel title="Couldn't load deploy health." code={error} onRetry={onRetry} />;
  }

  const overall = OVERALL_BADGE[health.overall] || {
    style: BADGE.idle,
    label: health.overall || 'unknown',
  };
  const sha = typeof health.sha === 'string' && health.sha.length > 0 ? health.sha : 'unknown';
  const checks = healthCheckFlags(health);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <StaleRefreshNote code={error} />}
      <div style={{ ...PANEL, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={overall.style}>{overall.label}</span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <span style={{ fontSize: 13, color: ink[300], marginRight: 8 }}>Deployed commit</span>
            <span style={{ fontFamily: MONO, fontSize: 15, color: ink[900] }} title={sha}>
              {sha.slice(0, SHA_SHORT_LENGTH)}
            </span>
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
              flexShrink: 0,
            }}
          >
            Refresh
          </button>
        </div>

        {checks.length === 0 ? (
          <div style={MUTED_TEXT}>No health checks reported.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${CHECK_MIN_WIDTH}px, 1fr))`,
              gap: '8px 16px',
            }}
          >
            {checks.map((check) => (
              <CheckRow key={check.name} name={check.name} ok={check.ok} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
