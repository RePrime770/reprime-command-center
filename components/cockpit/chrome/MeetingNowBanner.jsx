import React from 'react';
import { Video } from 'lucide-react';
import { brand } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Conditional banner under top chrome — appears when meetingNow !== null.
 * Pulse states: 30 / 15 / 10 / 5 minutes (dispatch spec).
 */
export default function MeetingNowBanner() {
  const { state, set } = useDemo();
  if (state.meetingNow === null) return null;

  const labels = {
    30: { text: '30 min until Daniel Schuchalter Zoom · prep window open', bg: '#5C6BC0' },
    15: { text: '15 min until Daniel Schuchalter Zoom · drafting prep notes', bg: '#FF9800' },
    10: { text: '10 min until Daniel Schuchalter Zoom · open the deal card?', bg: '#FB8C00' },
    5:  { text: '5 min until Daniel Schuchalter Zoom · joining momentarily', bg: '#E53935' },
    'at-start': { text: 'Daniel Schuchalter Zoom is starting now', bg: '#E53935' }
  };
  const cfg = labels[state.meetingNow] || labels[30];
  const pulse = state.meetingNow === 5 || state.meetingNow === 'at-start';

  return (
    <div
      className={pulse ? 'meeting-pulse' : ''}
      style={{
        position: 'absolute',
        top: 112,
        left: 0,
        right: 0,
        height: 50,
        background: cfg.bg,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        gap: 12,
        zIndex: 39,
        borderBottom: `2px solid ${brand.goldSoft}`
      }}
    >
      <Video size={18} strokeWidth={2.4} />
      <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.04em', flex: 1 }}>
        {cfg.text}
      </span>
      <button
        type="button"
        style={{
          background: brand.gold,
          color: brand.navy,
          border: 'none',
          borderRadius: 6,
          padding: '4px 14px',
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        Join now
      </button>
      <button
        type="button"
        onClick={() => set('meetingNow', null)}
        style={{
          background: 'rgba(0,0,0,0.18)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
