import React from 'react';
import { warm, danger } from '../lib/colors.js';

/**
 * Peach pulse — Fix #10: stronger pulse with box-shadow ring.
 * Renders BOTH an overlay multiply layer AND a box-shadow ring on the parent (via CSS).
 *
 * Props:
 *   active   — boolean
 *   radius   — px (default 12)
 *   color    — override (default warm-200 derivative)
 *   ring     — boolean (renders external ring shadow effect)
 */
export default function PulseGlow({ active, radius = 12, color, ring = true }) {
  if (!active) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="animate-peach-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: color || warm[200],
          mixBlendMode: 'multiply',
          pointerEvents: 'none'
        }}
      />
      {ring && (
        <span
          aria-hidden="true"
          className="animate-peach-pulse"
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: radius + 6,
            border: `3px solid ${danger[500]}`,
            pointerEvents: 'none'
          }}
        />
      )}
    </>
  );
}
