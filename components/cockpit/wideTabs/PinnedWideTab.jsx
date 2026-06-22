import React from 'react';
import { Pin } from 'lucide-react';
import { warm, ink, tier as TIER } from '../lib/colors.js';
import { pinned } from '../data/pinned.js';
import TierStripe from '../primitives/TierStripe.jsx';

/**
 * Pinned wide-tab — Gideon's manual anchors.
 */
export default function PinnedWideTab() {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pinned.map((p) => (
        <Row key={p.id} pin={p} />
      ))}
    </div>
  );
}

function Row({ pin }) {
  const ts = new Date(pin.pinnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div
      style={{
        position: 'relative',
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 10,
        padding: pin.tier ? '12px 16px 12px 22px' : '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      <TierStripe tier={pin.tier} width={3} />
      <Pin size={18} strokeWidth={2.2} color={ink[500]} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>{pin.title}</div>
        <div style={{ fontSize: '14.66px', color: ink[500], marginTop: 2 }}>
          {pin.type} · pinned {ts}
        </div>
      </div>
    </div>
  );
}
