import React from 'react';
import { warm, ink, info } from '../lib/colors.js';

/**
 * Rounded rectangle button. Fix #9: clear hit-target styling.
 * Default = warm-50 surface + 2px ink-700 border. Active = warm-100 + 4px info-500 underline.
 */
export default function Pill({ children, active = false, onClick, icon: Icon, variant = 'default', style }) {
  const variants = {
    default: { bg: warm[50], fg: ink[700], border: ink[700] },
    primary: { bg: info[500], fg: warm[50], border: info[700] },
    success: { bg: '#1F6B4A', fg: warm[50], border: '#0B3322' },
    destructive: { bg: '#7F1D1D', fg: warm[50], border: '#3D0D0D' }
  };
  const v = variants[variant] || variants.default;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? warm[100] : v.bg,
        color: v.fg,
        border: `2px solid ${v.border}`,
        borderBottom: active ? `4px solid ${info[500]}` : `2px solid ${v.border}`,
        boxShadow: active ? `0 0 0 3px ${info[500]}33` : 'none',
        borderRadius: 8,
        padding: '8px 18px',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {Icon && <Icon size={18} strokeWidth={2.4} />}
      {children}
    </button>
  );
}
