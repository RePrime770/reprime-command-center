import React from 'react';
import { warm, ink, info } from '../lib/colors.js';
import { notes } from '../data/notes.js';
import ListenButton from '../primitives/ListenButton.jsx';

/**
 * Notes wide-tab — voice memo summaries. Listen button only on expanded view (here: full card).
 */
export default function NotesWideTab() {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {notes.map((n) => (
        <Card key={n.id} note={n} />
      ))}
    </div>
  );
}

function Card({ note }) {
  const ts = new Date(note.ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const isHebrew = note.language === 'he';
  return (
    <div
      style={{
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 12,
        padding: '14px 18px',
        direction: isHebrew ? 'rtl' : 'ltr',
        textAlign: isHebrew ? 'right' : 'left'
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: '14.66px', color: ink[500], letterSpacing: '0.05em' }}>
          {ts} · {note.duration}s
        </span>
        <span
          style={{
            fontSize: '12px',
            background: warm[100],
            border: `1px solid ${warm[600]}`,
            color: info[500],
            borderRadius: 9999,
            padding: '2px 10px',
            fontWeight: 700
          }}
        >
          {note.project}
        </span>
        <div style={{ flex: 1 }} />
        <ListenButton />
      </div>
      <div style={{ fontSize: '22px', lineHeight: 1.4, marginTop: 8 }}>{note.summary}</div>
    </div>
  );
}
