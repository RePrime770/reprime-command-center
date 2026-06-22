import React from 'react';
import {
  MessageSquarePlus, StickyNote, Mail, Sun,
  Mic, Volume2,
  Headphones, MessagesSquare, AlertCircle
} from 'lucide-react';
import { brand, slate, tier as TIER, ink } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';

// ============================================================
// TopChrome v5 — LEAN COMMS-ONLY top bar
// v5 changes (comms-center dispatch 2026-06-16):
//   Slimmed to comms-only. REMOVED: ScheduleCluster (Zoom/Meeting/Call),
//   Brainstorm concierge, Browser button, Model-tier pillar, Doc Dump,
//   Mission button, Memory pulse, LOI chip, StatusCluster noise
//   (DailyMomentum "TODAY x/y" meter, PWA pill, fake all-green dot-row).
//   Row2 deal sub-strip removed (now-dead).
//   KEPT: APEX/urgent indicator, TERMINAL wordmark, PTT "Talk to Nora",
//   global Speechify SpeedSelector (5-step), clock + Shabbat countdown,
//   conditional Row3 Tier-1 lane, concierge actions Email/Invite/Note/Briefing.
//
// Row 1 (~80px): APEX NOW · TERMINAL · | · centered PTT cluster · | ·
//                Concierge (Search·Note·Email·Briefing·Invite) · clock + Shabbat
// Row 3 (~50px conditional): Tier-1 alert banner
// ============================================================

const CONCIERGE = [
  { k: 'Note',       icon: StickyNote,          color: '#7B1FA2' },
  { k: 'Email',      icon: Mail,                color: '#5C6BC0' },
  { k: 'Briefing',   icon: Sun,                 color: '#F9A825' },
  { k: 'Invite',     icon: MessageSquarePlus,   color: '#FFCC33' }
];

const SPEEDS = ['1.2', '1.4', '1.6', '1.8', '2.0'];

export default function TopChrome() {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: slate.gradient,
        borderBottom: `2px solid ${brand.goldSoft}`,
        zIndex: 40,
        color: '#FFFFFF',
        fontFamily: 'inherit'
      }}
    >
      <Row1 />
      <Row3Tier1 />
    </header>
  );
}

// ============================================================
// ROW 1 — All clusters in single row, PTT centered as anchor
// ============================================================
function Row1() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        height: 80,
        borderBottom: `1px solid rgba(255,204,51,0.18)`
      }}
    >
      {/* LEFT — APEX NOW + Wordmark · AI tools moved to BottomTaskbar per B3 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ApexNowIndicator />
        <ClusterDivider />
        <Wordmark />
      </div>

      {/* CENTER spacer */}
      <div style={{ flex: 1 }} />

      {/* CENTER ANCHOR — PTT cluster (B15) with mode indicator */}
      <PttCluster />

      {/* CENTER spacer */}
      <div style={{ flex: 1 }} />

      {/* RIGHT — Concierge (comms actions) + clock/Shabbat */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ConciergeCluster />
        <ClusterDivider />
        <ClockShabbat />
      </div>
    </div>
  );
}

// ============================================================
// ROW 3 — Tier-1 alert (conditional). D-NEW-1 + B18.
// Activates for: Counter-LOI / Meeting Now / Urgent inbound
// ============================================================
function Row3Tier1() {
  const { state, set } = useDemo();
  // Active when meetingNow set, or counter-LOI incoming, or tier1Alert toggled
  const meetingNow = state.meetingNow;
  const counterLoi = state.topBarState === 'counter-loi-incoming';
  const tier1Custom = state.tier1Alert;
  const active = meetingNow !== null || counterLoi || tier1Custom;
  if (!active) return null;

  // Build content based on what's firing — meetingNow takes priority then counter-LOI then custom
  let cfg;
  if (meetingNow !== null) {
    const labels = {
      30: { text: '30 min to Doron Zoom · prep window open', bg: '#5C6BC0', pulse: false, cta: 'Open prep' },
      15: { text: '15 min to Doron Zoom · drafting prep notes', bg: '#FF9800', pulse: true, cta: 'Review prep' },
      10: { text: '10 min to Doron Zoom · open the deal card?', bg: '#FB8C00', pulse: true, cta: 'Open deal' },
      5:  { text: '5 min to Doron Zoom · joining momentarily', bg: '#E53935', pulse: true, cta: 'Join now' },
      'at-start': { text: 'Doron Zoom is starting now', bg: '#E53935', pulse: true, cta: 'Join now' }
    };
    cfg = labels[meetingNow] || labels[30];
  } else if (counterLoi) {
    cfg = { text: 'Counter-LOI inbound · Bay Valley · Doron · 4d to DD end', bg: '#D32F2F', pulse: true, cta: 'Open' };
  } else {
    cfg = { text: 'Urgent inbound · Tier-1 alert active', bg: '#D32F2F', pulse: true, cta: 'Open' };
  }

  return (
    <div
      className={cfg.pulse ? 'meeting-pulse' : ''}
      style={{
        height: 50,
        background: cfg.bg,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        gap: 12,
        borderBottom: `2px solid ${brand.goldSoft}`
      }}
    >
      <AlertCircle size={20} strokeWidth={2.4} />
      <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.04em', flex: 1 }}>
        {cfg.text}
      </span>
      <button
        type="button"
        style={{
          background: brand.gold,
          color: ink[900],
          border: 'none',
          borderRadius: 6,
          padding: '5px 16px',
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        {cfg.cta}
      </button>
      <button
        type="button"
        onClick={() => {
          set('meetingNow', null);
          if (counterLoi) set('topBarState', 'standard');
          set('tier1Alert', false);
        }}
        style={{
          background: 'rgba(0,0,0,0.18)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 6,
          padding: '5px 10px',
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

// ============================================================
// PTT cluster — centered in Row 1 (B15)
// PTT + Speed selector + Mode indicator
// ============================================================
function PttCluster() {
  const { state, set } = useDemo();
  const ptt = state.pttState || 'idle';
  const mode = state.noraMode || 'listen'; // 'listen' | 'participate'
  const liveStatus = state.noraLiveStatus || 'idle'; // 'idle' | 'listening' | 'drafting' | 'researching' | 'speaking' | 'on-call'

  const cfg = {
    idle:    { bg: brand.gold,   fg: brand.navy, label: 'Talk to Nora', sub: '', ring: brand.gold },
    active:  { bg: '#FFE082',    fg: brand.navy, label: 'Listening',    sub: 'tap to stop', ring: '#1E88E5' },
    note:    { bg: '#F3E5F5',    fg: '#4A148C',  label: 'Note mode',    sub: 'recording memo', ring: '#7B1FA2' },
    mission: { bg: '#E3F2FD',    fg: '#0D47A1',  label: 'Mission',      sub: 'capturing', ring: '#1E3A8A' }
  }[ptt];

  const cycle = () => {
    const nxt = { idle: 'active', active: 'idle', note: 'idle', mission: 'idle' }[ptt];
    set('pttState', nxt);
  };
  const active = ptt !== 'idle';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      {/* Live status indicator (D-NEW-4) */}
      <NoraLiveStatus mode={mode} status={liveStatus} setMode={(m) => set('noraMode', m)} />

      {/* PTT button */}
      <button
        type="button"
        onClick={cycle}
        style={{
          position: 'relative',
          background: cfg.bg,
          color: cfg.fg,
          border: `2px solid ${cfg.ring}`,
          borderRadius: 999,
          padding: '6px 18px',
          fontSize: 19,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          height: 48,
          boxShadow: active ? `0 0 0 4px ${cfg.ring}33` : '0 2px 8px rgba(0,0,0,0.18)'
        }}
      >
        {active && <span className="pulse-ring" style={{ position: 'absolute', inset: -2, border: `2px solid ${cfg.ring}`, borderRadius: 999 }} />}
        <Mic size={22} strokeWidth={2.4} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}>
          <span style={{ fontSize: 21, fontWeight: 800 }}>{cfg.label}</span>
          {cfg.sub && (
            <span style={{ fontSize: 13, opacity: 0.78, letterSpacing: '0.06em' }}>
              {cfg.sub}
            </span>
          )}
        </div>
      </button>

      {/* Speed selector — single global control (B15 + E3) */}
      <SpeedSelector />
    </div>
  );
}

function NoraLiveStatus({ mode, status, setMode }) {
  const isParticipate = mode === 'participate';
  const statusLabel = {
    idle: 'idle',
    listening: 'listening',
    drafting: 'drafting',
    researching: 'researching',
    speaking: 'speaking',
    'on-call': 'on call'
  }[status] || 'idle';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        type="button"
        onClick={() => setMode(isParticipate ? 'listen' : 'participate')}
        title={isParticipate ? 'Switch to Listen mode' : 'Switch to Participate mode'}
        style={{
          background: isParticipate ? '#7B1FA2' : 'rgba(255,255,255,0.10)',
          color: isParticipate ? '#FFFFFF' : brand.goldSoft,
          border: `1px solid ${isParticipate ? '#CE93D8' : brand.goldSoft}`,
          borderRadius: 999,
          padding: '2px 10px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {isParticipate ? <MessagesSquare size={11} strokeWidth={2.4} /> : <Headphones size={11} strokeWidth={2.4} />}
        {isParticipate ? 'Participate' : 'Listen'}
      </button>
      <span style={{ fontSize: 13, color: brand.goldSoft, letterSpacing: '0.06em' }}>
        Nora · {statusLabel}
      </span>
    </div>
  );
}

function SpeedSelector() {
  const { state, set } = useDemo();
  const current = state.speechifySpeed || '1.6';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Volume2 size={13} strokeWidth={2.4} color={brand.goldSoft} />
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => set('speechifySpeed', s)}
          style={{
            background: current === s ? brand.gold : 'transparent',
            color: current === s ? brand.navy : brand.goldSoft,
            border: `1px solid ${current === s ? brand.gold : 'rgba(255,204,51,0.22)'}`,
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: 32
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

// ============================================================
// APEX NOW indicator (H2) — leftmost in Row 1
// v4 §B3: drop gold border + gold halo. Red bg + white text + pulse only.
// ============================================================
function ApexNowIndicator() {
  const { set } = useDemo();
  const apex = {
    label: 'Bay Valley counter-LOI',
    tier: 'L7',
    sub: '4d · Doron'
  };
  return (
    <button
      type="button"
      onClick={() => set('apexClicked', Date.now())}
      title="Apex right now"
      style={{
        background: '#DC2626',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 8,
        padding: '5px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1.05,
        flexShrink: 0
      }}
      className="meeting-pulse"
    >
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.92 }}>
        APEX NOW · {TIER[apex.tier].label}
      </span>
      <span style={{ fontSize: 19, fontWeight: 800 }}>{apex.label}</span>
      <span style={{ fontSize: 13, opacity: 0.82 }}>{apex.sub}</span>
    </button>
  );
}

// ============================================================
// SHARED PRIMITIVES
// ============================================================
function pillBtn({ bg, fg, border }) {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : '1px solid transparent',
    borderRadius: 999,
    padding: '5px 11px',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0
  };
}

function ClusterDivider() {
  return <div style={{ width: 1, height: 30, background: 'rgba(255,204,51,0.22)', flexShrink: 0 }} />;
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
      <span style={{ fontFamily: "'Cinzel', serif", color: brand.gold, fontSize: 19, fontWeight: 700, letterSpacing: '0.18em' }}>
        TERMINAL
      </span>
      <span style={{ fontFamily: "'Cinzel', serif", color: brand.goldSoft, fontSize: 14, letterSpacing: '0.18em' }}>
        by RePrime
      </span>
    </div>
  );
}

function ConciergeCluster() {
  const { state, set } = useDemo();
  const handle = (k) => {
    if (k === 'Search')     { set('searchOpen', !state.searchOpen); return; }
    if (k === 'Email')      { set('emailComposeOpen', true); return; }
    if (k === 'Invite')     { set('inviteComposerOpen', true); return; }
    if (k === 'Note')       { set('pttState', 'note'); return; }
    if (k === 'Briefing')   { set('briefingOpen', true); return; }
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {CONCIERGE.map((c) => (
        <button key={c.k} type="button" onClick={() => handle(c.k)} style={pillBtn({ bg: c.color, fg: '#FFFFFF' })} title={c.k}>
          <c.icon size={11} strokeWidth={2.4} />
          {c.k}
        </button>
      ))}
    </div>
  );
}

// Lean clock + Shabbat countdown — replaces the old StatusCluster noise
// (DailyMomentum meter, PWA pill, and fake all-green service dot-row removed).
function ClockShabbat() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ color: brand.gold, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
          09:14
        </div>
        <div style={{ color: brand.goldSoft, fontSize: 9 }}>Mon · May 11</div>
      </div>
      <span style={{ ...pillBtn({ bg: 'rgba(102,187,106,0.18)', fg: '#A5D6A7' }), padding: '3px 9px' }}>
        שבת in 4d
      </span>
    </div>
  );
}
