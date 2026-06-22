import React from 'react';
import { Radio } from 'lucide-react';
import { brand } from '../lib/colors.js';
import { terminalFeed, ACTIVITY_TYPE_COLOR, ACTIVITY_TYPE_LABEL } from '../data/terminalFeed.js';
import PanelShell from './PanelShell.jsx';

/**
 * Panel #9 — NEW. Did not exist in rejected v5.0.
 * Live event stream from Terminal — logins / RSVPs / opens / invites / agent events / tier1 / meeting.
 * Navy background, gold timestamps, most-recent on top.
 */
export default function TerminalActivityPanel({ width }) {
  return (
    <PanelShell width={width} accent={brand.navy} title="TERMINAL ACTIVITY" subtitle="● LIVE FEED" bodyBg={brand.navyDeep}>
      <div
        style={{
          padding: '6px 12px',
          background: brand.navy,
          color: brand.gold,
          fontSize: 14,
          letterSpacing: '0.12em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          fontWeight: 700,
          borderBottom: `1px solid rgba(255,204,51,0.22)`
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Radio size={11} strokeWidth={2.4} className="brief-dot" /> LIVE
        </span>
        <span style={{ opacity: 0.7 }}>{terminalFeed.length} events today</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {terminalFeed.map((ev) => (
          <ActivityRow key={ev.id} ev={ev} />
        ))}
      </div>
      <div
        style={{
          padding: '6px 12px',
          background: brand.navyDeep,
          color: brand.goldSoft,
          fontSize: 13,
          letterSpacing: '0.14em',
          flexShrink: 0,
          fontWeight: 600,
          borderTop: `1px solid rgba(255,204,51,0.18)`
        }}
      >
        feed updates every 2s
      </div>
    </PanelShell>
  );
}

function ActivityRow({ ev }) {
  const color = ACTIVITY_TYPE_COLOR[ev.type] || '#90A4AE';
  return (
    <div
      className="activity-row"
      style={{
        padding: '6px 8px',
        marginBottom: 3,
        background: 'rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 4
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.08em' }}>
          {ACTIVITY_TYPE_LABEL[ev.type] || ev.type}
        </span>
        <span className="mono" style={{ fontSize: 14, color: brand.goldSoft }}>
          {ev.when}
        </span>
      </div>
      <div style={{ fontSize: 16, color: '#FFFFFF', marginTop: 2, lineHeight: 1.35 }}>
        <span style={{ fontWeight: 700 }}>{ev.who}</span>{' '}
        <span style={{ opacity: 0.78 }}>{ev.what}</span>
      </div>
    </div>
  );
}
