import React from 'react';
import { warm, ink, info, success, warning, danger } from '../lib/colors.js';
import TierStripe from '../primitives/TierStripe.jsx';

/**
 * Layer 1.5a standard toast — 3-second auto-dismiss (but the spec also bans
 * "auto-dismissing toasts" per Visual OS — implementation uses NO auto-dismiss
 * in artifact mode; user dismisses manually). Stack from top-right inwards.
 */
export default function StandardToast({ toast, onDismiss }) {
  const variants = {
    info:    { bg: info[50],    fg: info[700],    border: info[500] },
    success: { bg: success[50], fg: success[700], border: success[500] },
    warning: { bg: warning[50], fg: warning[700], border: warning[500] },
    danger:  { bg: danger[50],  fg: danger[700],  border: danger[500] }
  };
  const v = variants[toast.variant] || variants.info;

  return (
    <div
      style={{
        position: 'relative',
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        padding: '14px 22px 14px 26px',
        minWidth: 360,
        maxWidth: 480,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
      }}
    >
      <TierStripe tier={toast.tier} width={4} />
      <div style={{ fontSize: '18.66px', fontWeight: 700, lineHeight: 1.3 }}>
        {toast.title}
      </div>
      {toast.body && (
        <div style={{ fontSize: '16px', marginTop: 4, color: ink[500], lineHeight: 1.4 }}>
          {toast.body}
        </div>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: 6,
            right: 10,
            background: 'transparent',
            border: 'none',
            color: ink[500],
            cursor: 'pointer',
            fontSize: '18px',
            fontFamily: 'inherit'
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
