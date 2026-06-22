import React from 'react';
import { X } from 'lucide-react';
import { warm, ink } from '../lib/colors.js';

/**
 * Layer 4 drawer shell — right-anchored 900px (700px when Zoom full-screen).
 * NO dim behind (Doc B Section 5.x).
 *
 * Props:
 *   open      — boolean
 *   title     — string
 *   onClose   — callback
 *   width     — 900 | 700 (default 900)
 *   children  — node
 */
export default function DrawerShell({ open, title, onClose, width = 900, children, headerExtra }) {
  if (!open) return null;
  return (
    <aside
      style={{
        position: 'absolute',
        top: 80 + 60, // v3 chrome: Row1 (80) + Row2 sub-strip (60). Banner/Row3 not counted (drawer covers it).
        right: 0,
        bottom: 40,
        width,
        background: '#FFFFFF',
        borderLeft: `1px solid rgba(15,23,42,0.12)`,
        boxShadow: '-4px 0 20px rgba(15,23,42,0.10)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          padding: '16px 22px',
          background: warm[200],
          borderBottom: `2px solid ${ink[700]}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <span style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '0.04em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        {headerExtra}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          style={{
            background: warm[100],
            border: `1px solid ${warm[700]}`,
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            color: ink[700],
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      </header>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </aside>
  );
}
