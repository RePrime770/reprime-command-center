import React from 'react';
import { brand } from '../lib/colors.js';

// Pure presentational modal. The "?" listener lives in TopChrome so the
// keyboard plumbing stays close to the rest of the global key handlers.
const SHORTCUTS = [
  { keys: '⌘K', desc: 'Open command palette' },
  { keys: '⌘\\', desc: 'Toggle EN / HE' },
  { keys: 'Esc', desc: 'Close drawer / palette' },
  { keys: '↑ / ↓', desc: 'Navigate palette results' },
  { keys: 'Enter', desc: 'Open selected' },
  { keys: 'Space', desc: 'Push to talk (when PTT focused)' },
  { keys: '?', desc: 'Show this help' },
];

export default function KeyboardShortcutsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0F172A', color: '#FFFFFF', border: `1px solid ${brand.goldSoft}`,
        borderRadius: 12, padding: 24, minWidth: 360, maxWidth: 480,
        fontFamily: "'Inter', sans-serif", boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: brand.gold }}>Keyboard shortcuts</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            background: 'transparent', color: '#FFFFFF', border: 'none',
            fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map((s) => (
            <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, opacity: 0.9 }}>{s.desc}</span>
              <kbd style={{
                background: 'rgba(255,204,51,0.12)', color: brand.gold,
                border: `1px solid ${brand.goldSoft}`, borderRadius: 6,
                padding: '3px 10px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
              }}>{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
