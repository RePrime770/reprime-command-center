import React from 'react';
import { ink, semantic } from '../lib/colors.js';

/**
 * Panel shell — saturated accent header band + white body + 1px border + drop-shadow card.
 * Per dispatch "Surface differentiation" row of the visual direction table.
 *
 * Props:
 *   width   — fixed px
 *   accent  — header band color
 *   title   — UPPERCASE label
 *   subtitle — small grey label under title
 *   badge   — optional right-side pill
 *   badgeColor — pill bg
 *   children — body
 */
export default function PanelShell({
  width,
  accent,
  title,
  subtitle,
  badge,
  badgeColor,
  bodyBg = '#FFFFFF',
  children
}) {
  return (
    <section
      style={{
        width,
        flexShrink: 0,
        background: bodyBg,
        border: `1px solid ${semantic.border}`,
        boxShadow: semantic.panelShadow,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <header
        style={{
          background: accent,
          color: '#FFFFFF',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderBottom: `1px solid rgba(0,0,0,0.08)`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '0.14em' }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 14, opacity: 0.85, letterSpacing: '0.1em', fontWeight: 600 }}>
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <span
            style={{
              background: badgeColor || 'rgba(255,255,255,0.22)',
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.06em'
            }}
          >
            {badge}
          </span>
        )}
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </section>
  );
}

export function PanelSection({ title, children, accent }) {
  return (
    <div style={{ borderBottom: `1px solid ${semantic.divider}` }}>
      <div
        style={{
          padding: '6px 12px',
          background: '#F8FAFC',
          fontSize: 14,
          letterSpacing: '0.12em',
          fontWeight: 700,
          color: accent || ink[500]
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
