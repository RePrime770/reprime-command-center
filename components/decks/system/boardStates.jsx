'use client';

import React from 'react';
import { ink } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';
// Style tokens shared across deck sections (established by the Settings deck).
import { PANEL, MUTED_TEXT, ERROR_CODE_STYLE } from '../settings/sectionStyles.js';

// boardStates — the System deck's shared loading / error / stale-refresh
// states so every section degrades identically. Error copy is ALWAYS a stable
// snake_case code (safe-error contract) — raw messages never reach the client.

/** @param {{ label: string }} props */
export function LoadingPanel({ label }) {
  return (
    <div style={{ ...PANEL, ...MUTED_TEXT }} role="status">
      {label}
    </div>
  );
}

/**
 * Full-section failure (no data at all). Polling keeps retrying in the
 * background, and the button forces an immediate attempt (≥44pt target).
 * @param {{ title: string, code: string | null, onRetry: () => void }} props
 */
export function ErrorPanel({ title, code, onRetry }) {
  return (
    <div
      role="alert"
      style={{ ...PANEL, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: ink[900] }}>{title}</div>
        <div style={ERROR_CODE_STYLE}>{`${code || 'unknown_error'} — retrying`}</div>
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

/**
 * Inline note when a poll fails but last-good data is still shown.
 * @param {{ code: string }} props
 */
export function StaleRefreshNote({ code }) {
  return (
    <div style={{ ...MUTED_TEXT, fontSize: 14 }}>
      Live refresh failed (<span style={ERROR_CODE_STYLE}>{code}</span>) — showing the last known
      data, retrying automatically.
    </div>
  );
}
