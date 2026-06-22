import React from 'react';
import { Mic } from 'lucide-react';
import { brand, ink } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Talk-to-Nora PTT — 96×192px, frame-pinned center column.
 * 4 states: IDLE / ACTIVE / NOTE / MISSION.
 * Per dispatch fix #5 — recording controls visible (EN+HE label below).
 */
const STATE_CFG = {
  idle:    { label: 'Talk to Nora', subEN: '', subHE: '', bg: '#FFFFFF', ring: 'rgba(15,23,42,0.18)' },
  active:  { label: 'Listening',    subEN: 'press to stop', subHE: 'לחץ לעצור', bg: '#FFF8E1', ring: '#1E88E5' },
  note:    { label: 'Note mode',    subEN: 'recording memo', subHE: 'מקליט הערה', bg: '#F3E5F5', ring: '#7B1FA2' },
  mission: { label: 'Mission',      subEN: 'capturing mission', subHE: 'שומר משימה', bg: '#E3F2FD', ring: '#1E3A8A' }
};

export default function TalkToNoraPtt() {
  const { state, set } = useDemo();
  const cfg = STATE_CFG[state.pttState] || STATE_CFG.idle;
  const active = state.pttState !== 'idle';
  const offsetTop = 112 + (state.meetingNow !== null ? 50 : 0) + 32 + 12;

  const cycle = () => {
    const next = { idle: 'active', active: 'idle', note: 'idle', mission: 'idle' }[state.pttState];
    set('pttState', next || 'idle');
    // Open/focus the Nora chat input in Nora's Desk. A monotonically-rising
    // counter is the focus signal NoraChat watches (any change -> focus()).
    set('noraFocus', (state.noraFocus || 0) + 1);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      style={{
        position: 'absolute',
        top: offsetTop,
        left: 5120 / 2 - 48,
        width: 96,
        height: 192,
        background: cfg.bg,
        color: ink[700],
        border: `2px solid ${cfg.ring}`,
        borderRadius: 16,
        cursor: 'pointer',
        zIndex: 41,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'inherit',
        padding: 0,
        overflow: 'hidden',
        boxShadow: active ? `0 0 0 4px ${cfg.ring}33` : '0 4px 12px rgba(15,23,42,0.10)'
      }}
    >
      {active && <span className="pulse-ring" style={{ position: 'absolute', inset: 0, border: `3px solid ${cfg.ring}`, borderRadius: 16 }} />}
      <Mic size={42} strokeWidth={2.4} color={active ? cfg.ring : ink[700]} style={{ position: 'relative', zIndex: 2 }} />
      <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', position: 'relative', zIndex: 2, padding: '0 6px' }}>
        {cfg.label}
      </div>
      {cfg.subEN && (
        <div style={{ fontSize: 13, color: ink[500], textAlign: 'center', position: 'relative', zIndex: 2, lineHeight: 1.3 }}>
          <div>{cfg.subEN}</div>
          <div className="hebrew">{cfg.subHE}</div>
        </div>
      )}
      {!active && (
        <div style={{ fontSize: 8, color: ink[300], textAlign: 'center', position: 'relative', zIndex: 2, letterSpacing: '0.08em' }}>
          EN · HE
        </div>
      )}
    </button>
  );
}
