import React from 'react';
import { User } from 'lucide-react';
import { warm, ink, info, success } from '../lib/colors.js';
import WindowShell from './WindowShell.jsx';

/**
 * Zoom window with Susan placeholder (per dispatch).
 * Susan placeholder: cream background + 8 RePrime tags + lucide User icon + "Nora Sterling" label + "Nora: active" success-500 pill.
 */
export default function ZoomWindow({ slot, total, onClose }) {
  return (
    <WindowShell title="Zoom · Daniel Schuchalter (Watermills DD)" slot={slot} total={total} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '100%' }}>
        <Tile label="Daniel Schuchalter" bg={warm[400]}>
          <div style={{ fontSize: '64px' }}>YS</div>
        </Tile>
        <NoraTile />
      </div>
    </WindowShell>
  );
}

function Tile({ label, bg, children }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${warm[700]}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,
        color: '#FCF6EA',
        fontWeight: 800
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: '14.66px',
          fontWeight: 700,
          letterSpacing: '0.04em'
        }}
      >
        {label}
      </div>
    </div>
  );
}

function NoraTile() {
  const navy = '#1a2a4a';
  const gold = '#FFCC33';
  // 8 RePrime tag placeholders on cream background (per Section 16 Susan placeholder spec)
  const tags = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div
      style={{
        background: warm[50],
        border: `1px solid ${warm[700]}`,
        borderRadius: 12,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* 8 RePrime tags scattered (cream bg per Doc C Section 2.2) */}
      {tags.map((t) => (
        <span
          key={t}
          style={{
            position: 'absolute',
            top: `${15 + (t % 4) * 25}%`,
            left: `${10 + Math.floor(t / 4) * 60}%`,
            color: navy,
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            opacity: 0.4,
            transform: `rotate(${(t - 4) * 6}deg)`
          }}
        >
          RePrime · Terminal
        </span>
      ))}

      {/* Centered placeholder figure */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: warm[100],
          border: `4px solid ${warm[700]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: info[500],
          zIndex: 2,
          position: 'relative'
        }}
      >
        <User size={140} strokeWidth={1.6} />
      </div>

      {/* Caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span
          style={{
            background: 'rgba(0,0,0,0.55)',
            color: '#FCF6EA',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '14.66px',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}
        >
          Nora Sterling
        </span>
        <span
          style={{
            background: success[500],
            color: '#FCF6EA',
            padding: '4px 10px',
            borderRadius: 9999,
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.1em'
          }}
        >
          NORA · ACTIVE
        </span>
      </div>
    </div>
  );
}
