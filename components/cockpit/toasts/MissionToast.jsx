import React from 'react';
import { Crosshair, Loader } from 'lucide-react';
import { warm, ink, info, danger } from '../lib/colors.js';
import TierStripe from '../primitives/TierStripe.jsx';

/**
 * Layer 1.5b Mission Toast — persistent until COMPLETE/FAILED + 30 sec.
 * NEVER displaced by standard toasts. Top of stack.
 */
export default function MissionToast({ mission, onExpand }) {
  return (
    <div
      style={{
        position: 'relative',
        background: warm[100],
        color: ink[700],
        border: `2px solid ${danger[500]}`,
        borderRadius: 12,
        padding: '16px 22px 16px 28px',
        minWidth: 380,
        maxWidth: 480
      }}
    >
      <TierStripe tier={mission.tier} width={5} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Crosshair size={20} strokeWidth={2.4} color={danger[500]} />
        <span
          style={{
            fontSize: '14.66px',
            color: danger[700],
            fontWeight: 700,
            letterSpacing: '0.08em'
          }}
        >
          MISSION
        </span>
        <span style={{ flex: 1 }} />
        <Loader size={18} strokeWidth={2.4} color={info[500]} className="animate-spin" />
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
        {mission.name}
      </div>
      <div style={{ fontSize: '16px', color: ink[500] }}>
        Status: {mission.status}
      </div>
      <button
        type="button"
        onClick={onExpand}
        style={{
          marginTop: 10,
          background: warm[200],
          border: `1px solid ${warm[700]}`,
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: '14.66px',
          fontWeight: 700,
          color: ink[700],
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        Open mission
      </button>
    </div>
  );
}
