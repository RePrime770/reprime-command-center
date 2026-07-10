'use client';

import React from 'react';
import { ink } from '../../cockpit/lib/colors.js';
import {
  deriveEnvPresence,
  ENV_REFERENCE_GROUPS,
} from '../../../lib/decks/settings-view';
import { PANEL, BADGE, MUTED_TEXT, ERROR_CODE_STYLE, MONO_BLOCK } from './sectionStyles.js';

// EnvReferenceSection — grouped env NAMES with present/absent badges derived
// ONLY from /api/health booleans (its env flags + adapter env sets). This is
// a public-repo cockpit: NAMES ONLY. No values are ever rendered, accepted,
// or echoed — there are deliberately no input fields here. Secrets are set in
// Vercel → Project Settings → Environment Variables.

const GROUP_MIN_WIDTH = 320;

function PresenceBadge({ presence }) {
  if (presence === 'present') return <span style={BADGE.ok}>Present</span>;
  if (presence === 'missing') return <span style={BADGE.warn}>Missing</span>;
  return <span style={BADGE.idle}>Unknown</span>;
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   health: import('../../../lib/decks/settings-view').HealthSnapshot | null,
 * }} props
 */
export default function EnvReferenceSection({ loading, error, health }) {
  if (loading && !health) {
    return <div style={{ ...PANEL, ...MUTED_TEXT }}>Checking environment names…</div>;
  }

  if (!health) {
    return (
      <div style={{ ...PANEL }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: ink[900] }}>
          Couldn&rsquo;t load the environment reference.
        </div>
        {error && <div style={ERROR_CODE_STYLE}>{error}</div>}
        <div style={{ ...MUTED_TEXT, fontSize: 14, marginTop: 6 }}>
          It retries automatically with the integrations section above.
        </div>
      </div>
    );
  }

  const presence = deriveEnvPresence(health);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, color: ink[500], lineHeight: 1.55 }}>
        Names only — values are never shown or accepted here. &ldquo;Present&rdquo; means the
        requirement is satisfied (legacy aliases count); set anything missing in Vercel →
        Project Settings → Environment Variables.
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${GROUP_MIN_WIDTH}px, 1fr))`,
          gap: 12,
        }}
      >
        {ENV_REFERENCE_GROUPS.map((group) => (
          <div key={group.id} style={{ ...PANEL, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: ink[300],
              }}
            >
              {group.label}
            </h3>
            {group.names.map((name) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  minHeight: 32,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_BLOCK.fontFamily,
                    fontSize: 14,
                    color: ink[700],
                    wordBreak: 'break-all',
                  }}
                >
                  {name}
                </span>
                <PresenceBadge presence={presence[name] || 'unknown'} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
