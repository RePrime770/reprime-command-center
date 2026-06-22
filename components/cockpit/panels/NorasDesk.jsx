import React, { useState } from 'react';
import { Phone, Bell, HelpCircle, Video, Mic, Send, AlertTriangle, CornerDownRight } from 'lucide-react';
import { ink, semantic } from '../lib/colors.js';
import { ListenButton } from '../lib/voice.jsx';
import { noraQuickCommands } from '../data/noraDesk.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import PanelShell from './PanelShell.jsx';

/**
 * NORA'S DESK — the two-way box (Gideon's design, 2026-06-16).
 *
 *   Every call / message generates work; if it isn't captured + nudged, it's lost.
 *   This box is the "nothing falls through" spine of the cockpit.
 *
 * Split into two halves:
 *   TOP    · NORA → YOU  — work cards: call recaps, reminders, her questions, Zoom summaries.
 *                          Each card has a clear ask + one-tap actions. Urgent items nudge hard.
 *   BOTTOM · YOU → NORA  — your command line to her (call X, set a Zoom, remind me) + her replies.
 *
 * Nora's signature color = violet (distinct from every channel lane).
 */
const NORA = '#7C3AED';
const NORA_FADED = '#F3E8FF';

const TYPE_META = {
  call:     { icon: Phone,      color: '#0EA5E9', label: 'CALL' },
  question: { icon: HelpCircle, color: '#F59E0B', label: 'QUESTION' },
  zoom:     { icon: Video,      color: '#2D8CFF', label: 'ZOOM RECAP' },
  reminder: { icon: Bell,       color: '#FFCC33', label: 'REMINDER' }
};

export default function NorasDesk({ width }) {
  // Live Nora's Desk from the cockpit provider (bucket + secretary asks).
  // Falls back to static while the first fetch is in flight or on error.
  const { noraDesk } = useLiveData();
  const noraToYou = Array.isArray(noraDesk?.noraToYou) ? noraDesk.noraToYou : [];
  const youToNora = Array.isArray(noraDesk?.youToNora) ? noraDesk.youToNora : [];
  const needsYou = noraToYou.length;
  return (
    <PanelShell
      width={width}
      accent={NORA}
      title="NORA’S DESK"
      subtitle="she ↔ you"
      badge={`${needsYou} need you`}
      badgeColor="rgba(255,255,255,0.22)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* TOP — YOU → NORA (you talk to her up here, per Gideon 2026-06-16) */}
        <div style={{ flexShrink: 0, borderBottom: `2px solid ${NORA}33` }}>
          <SectionLabel
            color={NORA}
            left="YOU → NORA"
            right="tell her to call, Zoom, or remind you"
          />
          <CommandBar />
          <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 130, overflowY: 'auto' }}>
            {youToNora.map((m) => (
              <CommandLine key={m.id} m={m} />
            ))}
          </div>
        </div>

        {/* BOTTOM — NORA → YOU (her cards push up from below) */}
        <SectionLabel
          color={NORA}
          left="NORA → YOU"
          right="every call & message becomes a card"
        />
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {noraToYou.map((item) => (
            <NoraCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function SectionLabel({ color, left, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: NORA_FADED,
        borderBottom: `1px solid ${color}33`,
        flexShrink: 0
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.14em', color: '#6B21A8' }}>
        {left}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#9333EA', letterSpacing: '0.04em' }}>
        {right}
      </span>
    </div>
  );
}

function NoraCard({ item }) {
  const meta = TYPE_META[item.type] || TYPE_META.question;
  const Icon = meta.icon;
  const stripe = item.urgent ? '#E53935' : meta.color;
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${item.urgent ? '#E5393555' : semantic.border}`,
        borderLeft: `5px solid ${stripe}`,
        borderRadius: 8,
        padding: '8px 12px 10px 14px',
        boxShadow: item.urgent ? '0 0 0 2px #E5393522' : 'none'
      }}
    >
      {/* type + who + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: `${meta.color}1A`,
            color: meta.color,
            borderRadius: 5,
            padding: '1px 7px',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.08em'
          }}
        >
          <Icon size={12} strokeWidth={2.6} /> {meta.label}
        </span>
        <span style={{ fontSize: 17, fontWeight: 800, color: ink[700], flex: 1, minWidth: 0 }}>
          {item.who}
        </span>
        {item.urgent && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: '#E53935',
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '1px 8px',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}
          >
            <AlertTriangle size={11} strokeWidth={2.6} /> {item.nudge || 'needs you'}
          </span>
        )}
        <span style={{ fontSize: 13, color: ink[300], fontWeight: 600 }}>{item.when}</span>
      </div>

      {/* summary */}
      <div style={{ fontSize: 16, lineHeight: 1.45, color: ink[500], marginBottom: 6 }}>
        {item.summary}
      </div>

      {/* her ask */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 8 }}>
        <CornerDownRight size={14} strokeWidth={2.4} color={NORA} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#6B21A8', lineHeight: 1.4 }}>
          {item.ask}
        </span>
      </div>

      {/* one-tap actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        {item.actions.map((a, i) => (
          <button
            key={a}
            type="button"
            style={i === 0 ? primaryActionStyle(meta.color) : ghostActionStyle()}
          >
            {a}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <ListenButton compact />
      </div>
    </div>
  );
}

function CommandLine({ m }) {
  const isYou = m.from === 'you';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isYou ? 'flex-end' : 'flex-start'
      }}
    >
      <div
        style={{
          maxWidth: '88%',
          background: isYou ? '#F1F5F9' : NORA_FADED,
          border: `1px solid ${isYou ? semantic.border : `${NORA}33`}`,
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 15,
          lineHeight: 1.4,
          color: ink[700]
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: isYou ? ink[300] : '#9333EA', display: 'block', marginBottom: 1 }}>
          {isYou ? 'YOU' : 'NORA'}
        </span>
        {m.text}
      </div>
    </div>
  );
}

function CommandBar() {
  const [val, setVal] = useState('');
  return (
    <div style={{ padding: '8px 8px 6px', background: '#FFFFFF' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: `2px solid ${NORA}`,
          borderRadius: 8,
          padding: '4px 6px 4px 10px',
          background: '#FFFFFF'
        }}
      >
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Tell Nora to call someone, set a Zoom, or remind you…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 16,
            color: ink[700],
            fontFamily: 'inherit'
          }}
        />
        <button type="button" style={micButtonStyle()} title="Speak to Nora" aria-label="Speak to Nora">
          <Mic size={15} strokeWidth={2.4} />
        </button>
        <button type="button" style={sendButtonStyle()} title="Send to Nora" aria-label="Send to Nora">
          <Send size={14} strokeWidth={2.6} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
        {noraQuickCommands.map((c) => (
          <button key={c} type="button" style={quickChipStyle()}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function primaryActionStyle(color) {
  return {
    background: color,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };
}

function ghostActionStyle() {
  return {
    background: '#F8FAFC',
    color: ink[700],
    border: `1px solid ${semantic.border}`,
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };
}

function micButtonStyle() {
  return {
    background: '#F3E8FF',
    color: NORA,
    border: `1px solid ${NORA}55`,
    borderRadius: 6,
    padding: '5px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center'
  };
}

function sendButtonStyle() {
  return {
    background: NORA,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center'
  };
}

function quickChipStyle() {
  return {
    background: NORA_FADED,
    color: '#6B21A8',
    border: `1px solid ${NORA}33`,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };
}
