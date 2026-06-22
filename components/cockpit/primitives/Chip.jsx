import React from 'react';
import { warm, ink, info, success, warning as warn, danger } from '../lib/colors.js';

/**
 * Pill-shaped tag. Fix #8: visible 2px ink-700 border for default; 2px colored border for variants.
 */
const variants = {
  neutral: { bg: warm[50], fg: ink[700], border: ink[700] },
  info:    { bg: info[50], fg: info[700], border: info[500] },
  success: { bg: success[50], fg: success[700], border: success[500] },
  warning: { bg: warn[50], fg: warn[700], border: warn[500] },
  danger:  { bg: danger[50], fg: danger[700], border: danger[500] },
  active:  { bg: warm[100], fg: ink[700], border: info[500] }
};

export default function Chip({ children, variant = 'neutral', onClick, style }) {
  const v = variants[variant] || variants.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: v.bg,
        color: v.fg,
        border: `2px solid ${v.border}`,
        borderRadius: 9999,
        padding: '6px 14px',
        fontSize: '16px',
        lineHeight: 1.3,
        letterSpacing: '0.04em',
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {children}
    </button>
  );
}
