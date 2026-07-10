'use client';

import React from 'react';
import { ink } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';
import {
  getSetupLink,
  getDisplayName,
} from '../../../lib/cockpit/integration-setup-links';
import { groupIntegrations } from '../../../lib/decks/settings-view';
import { PANEL, MONO_BLOCK, BADGE, MUTED_TEXT, ERROR_CODE_STYLE } from './sectionStyles.js';

// IntegrationsSection — one card per /api/health integration, grouped
// Comms / Google / AI / Infra. READ + GUIDE only: connected badge, and when
// disconnected the setup link/instructions from the existing setup-links
// registry (lib/cockpit/integration-setup-links.ts — the single source of
// truth the IntegrationStatusPill already uses). Never renders env VALUES.

const CARD_MIN_WIDTH = 300;

function StatusBadge({ item }) {
  if (item.ok === true) return <span style={BADGE.ok}>Connected</span>;
  if (item.reason === 'setup_required') return <span style={BADGE.warn}>Setup required</span>;
  // Stable reason codes only (auth_failed / unreachable / rate_limited) —
  // adapter messages are never echoed.
  return <span style={BADGE.err}>{item.reason || 'error'}</span>;
}

function SetupGuidance({ item }) {
  const link = getSetupLink(item.integration);
  if (!link) {
    return (
      <div style={{ ...MUTED_TEXT, fontSize: 14 }}>
        No setup link registered — see docs/ENVIRONMENT_AUDIT.md.
      </div>
    );
  }

  if (link.kind === 'route') {
    return (
      <a
        href={link.href}
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
        }}
      >
        Connect →
      </a>
    );
  }

  const names =
    Array.isArray(item.missingEnv) && item.missingEnv.length > 0
      ? item.missingEnv
      : link.envVars;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 14, color: ink[500], lineHeight: 1.5 }}>
        Set these on Vercel → Project Settings → Environment Variables. The row
        goes green automatically within ~5 minutes — no deploy needed.
      </div>
      <div style={MONO_BLOCK}>{names.join('\n')}</div>
      <div style={{ fontSize: 13, color: ink[300] }}>
        Help: <code>{link.docPath}</code>
      </div>
    </div>
  );
}

function IntegrationCard({ item }) {
  return (
    <div style={{ ...PANEL, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: ink[900], minWidth: 0 }}>
          {getDisplayName(item.integration)}
        </span>
        <StatusBadge item={item} />
      </div>
      {item.ok !== true && <SetupGuidance item={item} />}
    </div>
  );
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   health: import('../../../lib/decks/settings-view').HealthSnapshot | null,
 *   onRetry: () => void,
 * }} props
 */
export default function IntegrationsSection({ loading, error, health, onRetry }) {
  const integrations = Array.isArray(health?.integrations) ? health.integrations : null;

  if (loading && !integrations) {
    return <div style={{ ...PANEL, ...MUTED_TEXT }}>Checking integrations…</div>;
  }

  if (!integrations) {
    return (
      <div style={{ ...PANEL, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: ink[900] }}>
            Couldn&rsquo;t load integration status.
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

  const groups = groupIntegrations(integrations);

  if (groups.length === 0) {
    return <div style={{ ...PANEL, ...MUTED_TEXT }}>No integrations reported yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {error && (
        <div style={{ ...MUTED_TEXT, fontSize: 14 }}>
          Live refresh failed (<span style={ERROR_CODE_STYLE}>{error}</span>) — showing the last
          known status.
        </div>
      )}
      {groups.map((group) => (
        <div key={group.id}>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: ink[300],
            }}
          >
            {group.label}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
              gap: 12,
            }}
          >
            {group.items.map((item) => (
              <IntegrationCard key={item.integration} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
