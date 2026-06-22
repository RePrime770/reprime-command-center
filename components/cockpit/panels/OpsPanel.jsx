import React, { useState } from 'react';
import { Pin, Mic } from 'lucide-react';
import { ink, tier as TIER, semantic } from '../lib/colors.js';
import { delegated } from '../data/tasks.js';
import { reminders } from '../data/calendar.js';
import { notes } from '../data/notes.js';
import { pinned } from '../data/pinned.js';
import { fmtRelative, fmtTime } from '../lib/format.js';
import { ListenButton, RecordButton } from '../lib/voice.jsx';
import PanelShell from './PanelShell.jsx';

const TABS = [
  { id: 'crew',      label: 'Crew',      color: '#43A047' },
  { id: 'reminders', label: 'Reminders', color: '#F9A825' },
  { id: 'notes',     label: 'Notes',     color: '#7B1FA2' },
  { id: 'pinned',    label: 'Pinned',    color: '#1E88E5' }
];

export default function OpsPanel({ width }) {
  const [tab, setTab] = useState('crew');
  return (
    <PanelShell width={width} accent="#7B1FA2" title="OPS" subtitle="CREW · REM · NOTES · PIN">
      <div
        style={{
          display: 'flex',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          flexShrink: 0
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '6px 4px',
                background: active ? t.color : 'transparent',
                color: active ? '#FFFFFF' : ink[500],
                border: 'none',
                borderBottom: active ? `3px solid ${t.color}` : '3px solid transparent',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em'
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {tab === 'crew' && <CrewView />}
        {tab === 'reminders' && <RemindersView />}
        {tab === 'notes' && <NotesView />}
        {tab === 'pinned' && <PinnedView />}
      </div>
    </PanelShell>
  );
}

function CrewView() {
  return (
    <>
      {delegated.map((t) => {
        const tierHex = t.tier ? TIER[t.tier]?.hex : null;
        const overdue = t.status === 'overdue';
        return (
          <div
            key={t.id}
            style={{
              position: 'relative',
              padding: '7px 10px 7px 14px',
              background: '#FFFFFF',
              border: overdue ? `1px solid #FF6F00` : `1px solid ${semantic.divider}`,
              borderRadius: 6,
              marginBottom: 4
            }}
          >
            {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 6 }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: ink[700] }}>{t.assignee}</span>
              <span
                style={{
                  fontSize: 13,
                  color: overdue ? '#E65100' : ink[300],
                  fontWeight: overdue ? 800 : 600,
                  letterSpacing: '0.05em'
                }}
              >
                {overdue ? 'OVERDUE' : `due ${t.due}`}
              </span>
            </div>
            <div style={{ fontSize: 16, color: ink[500], marginTop: 2, lineHeight: 1.35 }}>{t.title}</div>
          </div>
        );
      })}
    </>
  );
}

function RemindersView() {
  return (
    <>
      {reminders.map((r) => {
        const tierHex = r.tier ? TIER[r.tier]?.hex : null;
        const isHe = r.language === 'he';
        return (
          <div
            key={r.id}
            style={{
              position: 'relative',
              padding: '6px 10px 6px 14px',
              background: '#FFFFFF',
              border: `1px solid ${semantic.divider}`,
              borderRadius: 6,
              marginBottom: 4,
              direction: isHe ? 'rtl' : 'ltr',
              textAlign: isHe ? 'right' : 'left'
            }}
          >
            {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 6 }} />}
            <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 16, color: ink[700], lineHeight: 1.35 }}>
              {r.title}
            </div>
            <div className="mono" style={{ fontSize: 14, color: ink[300], marginTop: 2 }}>
              {fmtTime(r.due)}
            </div>
          </div>
        );
      })}
    </>
  );
}

function NotesView() {
  return (
    <>
      <div
        style={{
          background: '#FFFFFF',
          border: `1px solid ${semantic.divider}`,
          borderRadius: 6,
          padding: 6,
          marginBottom: 6,
          display: 'flex',
          gap: 4
        }}
      >
        <textarea
          placeholder="Speak or type..."
          style={{
            flex: 1,
            padding: 6,
            border: 'none',
            background: '#F8FAFC',
            borderRadius: 4,
            fontSize: 16,
            fontFamily: 'inherit',
            color: ink[700],
            resize: 'none',
            outline: 'none',
            minHeight: 50
          }}
        />
        <RecordButton label="Note" />
      </div>
      {notes.map((n) => {
        const isHe = n.language === 'he';
        return (
          <div
            key={n.id}
            style={{
              padding: '6px 10px',
              background: '#FFFFFF',
              border: `1px solid ${semantic.divider}`,
              borderRadius: 6,
              marginBottom: 4,
              direction: isHe ? 'rtl' : 'ltr',
              textAlign: isHe ? 'right' : 'left'
            }}
          >
            <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 16, color: ink[700], lineHeight: 1.4 }}>
              {n.summary}
            </div>
            <div style={{ fontSize: 13, color: ink[300], marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{fmtRelative(n.ts)} · {n.duration}s</span>
              <ListenButton compact />
            </div>
          </div>
        );
      })}
    </>
  );
}

function PinnedView() {
  return (
    <>
      {pinned.map((p) => {
        const tierHex = p.tier ? TIER[p.tier]?.hex : null;
        return (
          <div
            key={p.id}
            style={{
              position: 'relative',
              padding: '6px 10px 6px 14px',
              background: '#FFFFFF',
              border: `1px solid ${semantic.divider}`,
              borderRadius: 6,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6
            }}
          >
            {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 6 }} />}
            <Pin size={11} strokeWidth={2.4} color="#1E88E5" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: ink[700], lineHeight: 1.35 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: ink[300], marginTop: 2 }}>{p.type}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
