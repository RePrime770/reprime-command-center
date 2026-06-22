import React, { useState } from 'react';
import { Mail, MessageCircle, ExternalLink, Mic, Calendar, Video, Phone, Users } from 'lucide-react';
import { ink, semantic, brand, channel as CH } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';
import DrawerShell from './DrawerShell.jsx';
import { ListenButton, RecordButton } from '../lib/voice.jsx';

/**
 * Invite Composer drawer — TYPE TOGGLE per dispatch B6.
 * Terminal Invite (investor onboarding) | Regular Meeting Invite (Zoom/Phone/In-person)
 *
 * Terminal Invite REUSES the locked HTML templates at:
 *   - dashboard/_terminal-design-reference/00_Email_Page.html       (email body)
 *   - dashboard/_terminal-design-reference/01_Screen1_OG_Card.html  (recipient page step 1)
 *   - dashboard/_terminal-design-reference/02_Screen2_Booking.html  (recipient page step 2)
 *   - dashboard/_terminal-design-reference/03_Screen3_Confirmation.html
 *   - dashboard/_terminal-design-reference/04_Screen4_WhatsApp_Confirmation.html
 *   - dashboard/_terminal-design-reference/whatsapp/whatsapp_invite_preview.html
 *
 * Memory `terminal_reference_library.md` is binding — DO NOT redesign these.
 */
export default function InviteComposerDrawer() {
  const { state, set } = useDemo();
  const open = !!state.inviteComposerOpen;
  const [type, setType] = useState('terminal'); // 'terminal' | 'meeting'

  if (!open) return null;
  return (
    <DrawerShell open title="Invite Composer" onClose={() => set('inviteComposerOpen', false)}>
      {/* Type toggle */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${semantic.divider}`, background: '#FFFFFF' }}>
        {[
          { id: 'terminal', label: 'Terminal Invite', sub: 'Investor onboarding', color: brand.navy },
          { id: 'meeting',  label: 'Meeting Invite',  sub: 'Zoom · Phone · In-person', color: '#00897B' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: type === t.id ? t.color : 'transparent',
              color: type === t.id ? '#FFFFFF' : ink[500],
              border: 'none',
              borderBottom: type === t.id ? `3px solid ${t.color}` : '3px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '0.04em' }}>{t.label}</div>
            <div style={{ fontSize: 16, opacity: 0.85, marginTop: 2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 22px', overflowY: 'auto' }}>
        {type === 'terminal' ? <TerminalInvite /> : <MeetingInvite />}
      </div>
    </DrawerShell>
  );
}

function TerminalInvite() {
  const [channel, setChannel] = React.useState('WhatsApp');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          background: '#E8F5E9',
          border: `1px solid #A5D6A7`,
          borderLeft: `4px solid #43A047`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 18,
          color: '#1B5E20',
          fontWeight: 600,
          lineHeight: 1.45
        }}
      >
        <span style={{ fontWeight: 800 }}>Complimentary founding-member invitation.</span> No tier amounts — pure invitation. Locked templates fire verbatim; recipient lands at the 01–04 Screen flow.
      </div>

      <Field label="Recipient" required>
        <input
          type="text"
          placeholder="Search Pipedrive contacts..."
          style={fieldInputStyle}
        />
        <MicAffordance />
      </Field>

      <Field label="Channel (per recipient's preferred)">
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { k: 'WhatsApp', icon: MessageCircle, color: CH['305-WA'].hex },
            { k: 'Email',    icon: Mail,          color: CH.email.hex }
          ].map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={() => setChannel(c.k)}
              style={{
                flex: 1,
                background: channel === c.k ? c.color : '#FFFFFF',
                color: channel === c.k ? '#FFFFFF' : c.color,
                border: `2px solid ${c.color}`,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 19,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <c.icon size={14} strokeWidth={2.4} />
              {c.k}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Personal note (optional)">
        <textarea
          rows={3}
          placeholder="Speak or type a quick note Nora will weave into the invite..."
          style={{ ...fieldInputStyle, minHeight: 70, resize: 'vertical' }}
        />
        <MicAffordance />
      </Field>

      {/* Locked template references — fire verbatim, no injection */}
      <div
        style={{
          background: '#FFF8E1',
          border: `1px solid #FFCC33`,
          borderRadius: 8,
          padding: '12px 14px'
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: '#E65100', letterSpacing: '0.10em', marginBottom: 6 }}>
          LOCKED TEMPLATES — FIRE VERBATIM (NO INJECTION)
        </div>
        {channel === 'Email' ? (
          <>
            <TemplateLink label="Email body" path="00_Email_Page.html" />
          </>
        ) : (
          <TemplateLink label="WhatsApp message" path="whatsapp/whatsapp_invite_preview.html" />
        )}
        <div style={{ fontSize: 14, color: ink[500], marginTop: 6, marginBottom: 4, letterSpacing: '0.06em', fontWeight: 700 }}>
          RECIPIENT LANDS AT — reprimeterminal.com/invite/&#123;token&#125;
        </div>
        <TemplateLink label="Screen 1 · OG card"      path="01_Screen1_OG_Card.html" />
        <TemplateLink label="Screen 2 · Booking"      path="02_Screen2_Booking.html" />
        <TemplateLink label="Screen 3 · Confirmation" path="03_Screen3_Confirmation.html" />
        <TemplateLink label="Screen 4 · WhatsApp confirmation" path="04_Screen4_WhatsApp_Confirmation.html" />
      </div>

      <SendBlock variant="terminal" channel={channel} />
    </div>
  );
}

function MeetingInvite() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Attendee" required>
        <input type="text" placeholder="Search Pipedrive contacts..." style={fieldInputStyle} />
        <MicAffordance />
      </Field>

      <Field label="Channel">
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { k: 'Zoom',        icon: Video, color: '#2D8CFF' },
            { k: 'Phone',       icon: Phone, color: '#1E88E5' },
            { k: 'In-person',   icon: Users, color: '#00897B' }
          ].map((c) => (
            <button
              key={c.k}
              type="button"
              style={channelToggleStyle(c.color)}
            >
              <c.icon size={14} strokeWidth={2.4} />
              {c.k}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Duration">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[15, 30, 45, 60, 90, 120].map((d) => (
            <button
              key={d}
              type="button"
              style={{
                background: '#FFFFFF',
                color: ink[700],
                border: `1px solid ${semantic.border}`,
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {d}m
            </button>
          ))}
        </div>
      </Field>

      <Field label="Nora-suggested time slots (Shabbat / Yom Tov / 3hr pre-shutdown / observances honored)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { d: 'Mon May 11', t: '14:30 CT', sub: 'After lunch · 30min · clear' },
            { d: 'Mon May 11', t: '15:30 CT', sub: 'Tail end · 60min · clear' },
            { d: 'Tue May 12', t: '09:00 CT', sub: 'Fresh start · 45min · clear' }
          ].map((s, i) => (
            <button
              key={i}
              type="button"
              style={{
                background: '#FFFFFF',
                color: ink[700],
                border: `1px solid ${semantic.border}`,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 19,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Calendar size={13} color="#00897B" strokeWidth={2.4} />
              <div style={{ flex: 1 }}>
                <div>{s.d} · {s.t}</div>
                <div style={{ fontSize: 14, color: ink[500], fontWeight: 600, marginTop: 1 }}>{s.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </Field>

      <SendBlock variant="meeting" />
    </div>
  );
}

function TemplateLink({ label, path }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, color: ink[700], padding: '3px 0' }}>
      <ExternalLink size={11} strokeWidth={2.4} color={brand.navy} />
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ color: ink[500] }}>·</span>
      <code style={{ fontSize: 14, color: brand.navy, fontFamily: 'JetBrains Mono, monospace' }}>{path}</code>
    </div>
  );
}

function SendBlock({ variant, channel }) {
  const what =
    variant === 'terminal'
      ? channel === 'Email'
        ? 'email body (locked template)'
        : 'WhatsApp message (locked template)'
      : 'invite text';
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderLeft: `4px solid #7B1FA2`,
        borderRadius: 8,
        padding: '12px 14px'
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: '#7B1FA2', letterSpacing: '0.10em', marginBottom: 6 }}>
        NORA WILL SHOW DRAFT BEFORE SENDING
      </div>
      <div style={{ fontSize: 18, color: ink[700], marginBottom: 10 }}>
        I'll show the {what} for your final read. You confirm "Yes" or "Fix this" before anything goes out.
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          style={{
            background: brand.gold,
            color: brand.navy,
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontSize: 19,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em'
          }}
        >
          Draft → Review
        </button>
        <ListenButton compact />
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div style={{ fontSize: 14, color: ink[500], letterSpacing: '0.10em', fontWeight: 700, marginBottom: 4 }}>
        {label.toUpperCase()}{required && <span style={{ color: '#D32F2F', marginLeft: 3 }}>*</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function MicAffordance() {
  return <RecordButton label="Voice" />;
}

const fieldInputStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#FFFFFF',
  border: `1px solid ${semantic.border}`,
  borderRadius: 6,
  fontSize: 19,
  fontFamily: 'inherit',
  color: '#1E293B',
  outline: 'none'
};

function channelToggleStyle(color) {
  return {
    flex: 1,
    background: '#FFFFFF',
    color,
    border: `2px solid ${color}55`,
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  };
}
