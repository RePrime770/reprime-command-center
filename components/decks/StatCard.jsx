import React from 'react';
import { ink, semantic } from '../cockpit/lib/colors.js';

// StatCard — minimal token-based KPI card for deck pages (architecture §4).
// Kiosk hierarchy per _ops-context/kiosk-design-spec-v2.md: big 36px Lexend
// number, small tracked label — the eye learns the size hierarchy at a glance.

const FONT = "var(--font-lexend), 'Lexend', 'Poppins', sans-serif";

/**
 * @param {{
 *   label: string,
 *   value: import('react').ReactNode,
 *   hint?: string,
 *   accent?: string,   // value color token (defaults to ink[900])
 * }} props
 */
export default function StatCard({ label, value, hint, accent }) {
  return (
    <div
      style={{
        background: semantic.panelBg,
        border: `1px solid ${semantic.border}`,
        borderRadius: 12,
        boxShadow: semantic.panelShadow,
        padding: '16px 18px',
        minWidth: 160,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: ink[300],
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: accent || ink[900] }}>
        {value}
      </span>
      {hint && <span style={{ fontSize: 14, color: ink[500], lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );
}
