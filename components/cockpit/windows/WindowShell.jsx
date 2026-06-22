import React from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { warm, ink, info } from '../lib/colors.js';

/**
 * Layer 1 window shell — slot-based, 1707px default 1/3 screen, expandable 2/3 or full.
 * Multi-window manager: 1, 2, or 3 windows side-by-side.
 */
export default function WindowShell({ title, slot = 0, total = 1, onClose, children }) {
  const widthPerSlot = total === 1 ? 1707 : total === 2 ? 1280 : 1060;
  const left = 32 + slot * (widthPerSlot + 16);
  const top = 80 + 60 + 12; // Row1 (80) + Row2 sub-strip (60) + padding
  const bottom = 56;
  return (
    <section
      style={{
        position: 'absolute',
        left,
        top,
        width: widthPerSlot,
        bottom,
        background: warm[50],
        border: `3px solid ${ink[700]}`,
        borderRadius: 14,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          padding: '10px 16px',
          background: warm[200],
          borderBottom: `2px solid ${ink[700]}`,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.04em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          style={{
            background: 'transparent',
            border: `1px solid ${warm[700]}`,
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            color: ink[700],
            fontFamily: 'inherit'
          }}
        >
          <Minimize2 size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          style={{
            background: 'transparent',
            border: `1px solid ${warm[700]}`,
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            color: ink[700],
            fontFamily: 'inherit'
          }}
        >
          <Maximize2 size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${warm[700]}`,
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            color: ink[700],
            fontFamily: 'inherit'
          }}
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </header>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>{children}</div>
    </section>
  );
}
