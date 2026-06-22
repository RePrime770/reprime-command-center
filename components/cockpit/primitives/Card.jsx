import React from 'react';
import { warm, ink } from '../lib/colors.js';
import TierStripe from './TierStripe.jsx';

/**
 * Window/card surface — warm-50 (the lightest off-white, NOT pure white which is
 * banned by Visual OS) + 2px off-black border. Fix #2: distinct surface vs frame.
 */
export default function Card({ tier = null, children, onClick, elevated = false, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: elevated ? warm[100] : warm[50],
        color: ink[700],
        border: `2px solid ${ink[700]}`,
        borderRadius: 12,
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      <TierStripe tier={tier} width={8} />
      {children}
    </div>
  );
}
