import React from 'react';
import { tier as TIER } from '../lib/colors.js';

/**
 * L1-L7 urgency stripe. ALWAYS LEFT EDGE regardless of RTL (Doc D Section 2.2).
 * Nora applies selectively — most things untagged. Render nothing if tier is null.
 *
 * Props:
 *   tier    — 'L1' | 'L2' | ... 'L7' | null
 *   width   — px (default 3 per spec)
 *   height  — '100%' or px
 */
export default function TierStripe({ tier, width = 8, height = '100%' }) {
  if (!tier || !TIER[tier]) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${width}px`,
        height,
        background: TIER[tier].hex,
        pointerEvents: 'none'
      }}
    />
  );
}
