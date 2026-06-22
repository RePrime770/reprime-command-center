import React from 'react';
import { Phone, PhoneOff, UserCheck } from 'lucide-react';
import { warm, ink, info, danger } from '../lib/colors.js';
import DrawerShell from './DrawerShell.jsx';
import TierStripe from '../primitives/TierStripe.jsx';
import ListenButton from '../primitives/ListenButton.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Caller-ID Tier-1 drawer (Doc B Section 5.4). 3-bucket + You/Nora/System buttons.
 */
export default function CallerIdDrawer() {
  const { state, set } = useDemo();
  const open = state.phoneState === 'caller-id-t1';
  return (
    <DrawerShell open={open} title="Inbound call · Caller-ID" onClose={() => set('phoneState', 'idle')}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ position: 'relative', paddingLeft: 16 }}>
          <TierStripe tier="L7" width={4} />
          <div style={{ fontSize: '14.66px', color: danger[700], fontWeight: 700, letterSpacing: '0.08em' }}>
            TIER 1 · INVESTOR · KNOWN
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: 6 }}>Doron Sagiv</div>
          <div style={{ fontSize: '20px', color: ink[500] }}>Sagiv Holdings · Tel Aviv · +972 50 …</div>
        </div>

        <section style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Bucket title="WHO THEY ARE" lines={[
            'HOT status · only invests >$25M',
            'Hebrew profile · 305 WhatsApp primary'
          ]} />
          <Bucket title="WHY THEY MIGHT BE CALLING" lines={[
            'Counter-LOI on Bay Valley sent 14h ago',
            'Watermills DD: backed by Yossi (his partner)',
            "Hasn't seen the environmental phase-I"
          ]} />
          <Bucket title="WHAT TO SAY" lines={[
            'Acknowledge the counter-LOI receipt',
            'Push 10-day DD extension (not 30)',
            'Offer to send env. Phase-I tonight'
          ]} />
        </section>

        <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Big icon={UserCheck} variant="success">You take it</Big>
          <Big icon={Phone} variant="info">Nora takes it</Big>
          <Big icon={PhoneOff} variant="neutral">System (voicemail)</Big>
          <div style={{ flex: 1 }} />
          <ListenButton />
        </div>
      </div>
    </DrawerShell>
  );
}

function Bucket({ title, lines }) {
  return (
    <div
      style={{
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 10,
        padding: '14px 18px'
      }}
    >
      <div
        style={{
          fontSize: '14.66px',
          color: ink[500],
          letterSpacing: '0.08em',
          fontWeight: 700,
          marginBottom: 6
        }}
      >
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 24, fontSize: '22px', lineHeight: 1.5 }}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function Big({ icon: Icon, variant, children }) {
  const variants = {
    success: { bg: '#1F6B4A', fg: '#FCF6EA' },
    info:    { bg: info[500], fg: '#FCF6EA' },
    neutral: { bg: warm[200], fg: ink[700], border: warm[700] }
  };
  const v = variants[variant];
  return (
    <button
      type="button"
      style={{
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border || v.bg}`,
        borderRadius: 12,
        padding: '14px 22px',
        fontSize: '20px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        letterSpacing: '0.04em'
      }}
    >
      <Icon size={22} strokeWidth={2.4} />
      {children}
    </button>
  );
}
