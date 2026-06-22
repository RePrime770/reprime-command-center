import React from 'react';
import { warm, ink, info, success, tier as TIER } from '../lib/colors.js';
import { investors } from '../data/investors.js';
import TierStripe from '../primitives/TierStripe.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Investors wide-tab — grid view. Tap row → opens Investor Profile drawer.
 */
export default function InvestorsWideTab() {
  const { set } = useDemo();
  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: 12
      }}
    >
      {investors.map((inv) => (
        <Card key={inv.id} inv={inv} onOpen={() => set('investorState', 'profile-conversation')} />
      ))}
    </div>
  );
}

function Card({ inv, onOpen }) {
  const isHebrew = inv.language === 'he';
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: 'relative',
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 12,
        padding: inv.tier ? '14px 18px 14px 22px' : '14px 18px',
        textAlign: isHebrew ? 'right' : 'left',
        direction: isHebrew ? 'rtl' : 'ltr',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: ink[700]
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <TierStripe tier={inv.tier} width={3} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar inv={inv} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3 }}>{inv.name}</div>
          <div style={{ fontSize: '16px', color: ink[500] }}>
            {inv.firm} · {inv.city}
          </div>
        </div>
        <StatusPill status={inv.status} />
      </div>
      <div style={{ fontSize: '18.66px', color: ink[700], marginTop: 8, lineHeight: 1.4 }}>
        {inv.snippet}
      </div>
    </button>
  );
}

function Avatar({ inv }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: warm[100],
        border: `2px solid ${warm[700]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 800,
        color: info[700],
        flexShrink: 0
      }}
    >
      {inv.avatarInitials}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    HOT:  { bg: '#F2E0E0', fg: '#7F1D1D' },
    WARM: { bg: '#FAEFD9', fg: '#8B5708' },
    COLD: { bg: '#E5E9F2', fg: '#1E3A8A' }
  };
  const v = map[status];
  return (
    <span
      style={{
        background: v.bg,
        color: v.fg,
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: '14px',
        fontWeight: 800,
        letterSpacing: '0.08em'
      }}
    >
      {status}
    </span>
  );
}
