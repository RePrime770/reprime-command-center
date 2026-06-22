import React from 'react';
import { warm, ink, info } from '../lib/colors.js';
import { emails } from '../data/emails.js';
import TierStripe from '../primitives/TierStripe.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Email wide-tab. 3-tier row heights (Tall / Standard / Compact) per Doc B Section 7.6.
 * Multi-inbox routing visible via inbox chip.
 */
const heights = {
  tall: 'auto',
  standard: 'auto',
  compact: 'auto'
};

const paddings = {
  tall: '20px 24px',
  standard: '14px 22px',
  compact: '8px 22px'
};

export default function EmailWideTab() {
  const { set } = useDemo();
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={() => set('emailMix', 'compose')}
        style={{
          alignSelf: 'flex-end',
          background: info[500],
          color: '#FCF6EA',
          border: `1px solid ${info[700]}`,
          borderRadius: 8,
          padding: '8px 18px',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        Compose
      </button>
      {emails.map((em) => (
        <Row key={em.id} em={em} />
      ))}
    </div>
  );
}

function Row({ em }) {
  const isHebrew = em.language === 'he';
  const ts = new Date(em.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <div
      style={{
        position: 'relative',
        background: em.unread ? warm[100] : warm[200],
        border: `1px solid ${warm[600]}`,
        borderRadius: 10,
        padding: em.tier ? `${paddings[em.height].replace(/(\d+)px/, (m, p) => p)}px ${paddings[em.height].split(' ')[1]} ${paddings[em.height].split(' ')[0]} 26px` : paddings[em.height],
        direction: isHebrew ? 'rtl' : 'ltr',
        textAlign: isHebrew ? 'right' : 'left'
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <TierStripe tier={em.tier} width={3} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: em.height === 'tall' ? '22px' : '18.66px', fontWeight: 700 }}>
          {em.from}
        </span>
        <span style={{ fontSize: '14.66px', color: ink[500] }}>{em.inbox}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '14.66px', color: ink[500] }}>{ts}</span>
      </div>
      <div
        style={{
          fontSize: em.height === 'tall' ? '24px' : '20px',
          fontWeight: 700,
          marginTop: 4,
          lineHeight: 1.3
        }}
      >
        {em.subject}
      </div>
      {em.height !== 'compact' && (
        <div style={{ fontSize: '18.66px', color: ink[500], marginTop: 4, lineHeight: 1.4 }}>
          {em.preview}
        </div>
      )}
      {em.attachments && em.height === 'tall' && (
        <div style={{ fontSize: '14.66px', color: info[500], marginTop: 6 }}>
          📎 {em.attachments.join(', ')}
        </div>
      )}
    </div>
  );
}
