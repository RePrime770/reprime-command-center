import React, { useState } from 'react';
import { Volume2, Pause } from 'lucide-react';
import { warm, ink, info } from '../lib/colors.js';

/**
 * Speechify trigger — default white surface + 2px ink-700 border (Fix #9 button styling).
 */
export default function ListenButton({ onPlay, label = 'Listen' }) {
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    setPlaying((p) => !p);
    if (!playing) onPlay?.();
  };

  const Icon = playing ? Pause : Volume2;

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        background: playing ? warm[100] : warm[50],
        color: ink[700],
        border: `2px solid ${ink[700]}`,
        borderBottom: playing ? `4px solid ${info[500]}` : `2px solid ${ink[700]}`,
        boxShadow: playing ? `0 0 0 3px ${info[500]}33` : 'none',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }}
      aria-label={playing ? 'Pause Speechify' : 'Play Speechify'}
    >
      <Icon size={18} strokeWidth={2.2} />
      {playing ? 'Playing' : label}
    </button>
  );
}
