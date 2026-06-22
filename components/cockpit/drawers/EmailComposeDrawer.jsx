import React from 'react';
import { warm, ink, info } from '../lib/colors.js';
import DrawerShell from './DrawerShell.jsx';
import ListenButton from '../primitives/ListenButton.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Email compose drawer — Drafter-Critic-Synthesizer wiring hook (Doc C 7.3).
 * For high-stakes Send (named amount > $5M), DCS pipeline fires.
 */
export default function EmailComposeDrawer() {
  const { state, set } = useDemo();
  const open = state.emailMix === 'compose';
  return (
    <DrawerShell open={open} title="Compose · counter-Doron" onClose={() => set('emailMix', 'three-tier')}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="From">g@reprime.com (default)</Field>
        <Field label="To">doron@sagivholdings.co.il (Doron Sagiv)</Field>
        <Field label="Subject">Re: Bay Valley — counter-LOI · 10-day DD extension proposal</Field>

        <div
          style={{
            background: warm[200],
            border: `1px solid ${warm[700]}`,
            borderRadius: 10,
            padding: '14px 18px'
          }}
        >
          <div style={{ fontSize: '14.66px', color: ink[500], marginBottom: 8, letterSpacing: '0.06em' }}>
            DRAFT · Drafter → Critic → Synthesizer (Opus 4.7)
          </div>
          <div style={{ fontSize: '22px', lineHeight: 1.5 }}>
            Doron — appreciate the depth on the environmental review. We've already completed Phase-I (uploading
            tonight). The 30-day extension exceeds the deal's appetite given the seller's parallel interest. Counter:
            10-day extension, Phase-I + Phase-II reports delivered within 48h, and we lock the close window by 5/26.
            Aligned?
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              style={{
                background: info[500],
                color: '#FCF6EA',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: '18.66px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Send
            </button>
            <button
              type="button"
              style={{
                background: warm[100],
                color: ink[700],
                border: `1px solid ${warm[700]}`,
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Re-draft via Critic
            </button>
            <div style={{ flex: 1 }} />
            <ListenButton />
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '14.66px', color: ink[500], letterSpacing: '0.06em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          background: warm[200],
          border: `1px solid ${warm[700]}`,
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: '22px'
        }}
      >
        {children}
      </div>
    </div>
  );
}
