import React from 'react';
import { warm, ink, info, tier as TIER } from '../lib/colors.js';
import { morningBrief } from '../data/morningBrief.js';
import TierStripe from '../primitives/TierStripe.jsx';
import ListenButton from '../primitives/ListenButton.jsx';

/**
 * Morning Brief pillar — middle pillar, ~700px wide (Doc B Section 11.2).
 * Hero card at top (apex item Nora flags for the day) + 8 conditional sections below.
 * Listen button on expanded items (Doc A 5.10 expanded views only).
 */
export default function MorningBriefPillar({ height }) {
  return (
    <div
      style={{
        width: 700,
        height,
        background: warm[300],
        border: `2px solid ${ink[700]}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          padding: '14px 22px',
          background: warm[200],
          borderBottom: `2px solid ${ink[700]}`,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12
        }}
      >
        <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Morning Brief
        </span>
        <span style={{ fontSize: '16px', color: ink[500] }}>{morningBrief.date}</span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
        <p style={{ fontSize: '22px', color: ink[500], marginBottom: 14 }}>
          {morningBrief.greeting}
        </p>

        {/* Hero / apex card */}
        <div
          style={{
            position: 'relative',
            background: warm[50],
            border: `2px solid ${ink[700]}`,
            borderRadius: 12,
            padding: '20px 22px 20px 36px',
            marginBottom: 22
          }}
        >
          <TierStripe tier={morningBrief.apex.tier} width={10} />
          <div style={{ fontSize: '14.66px', color: ink[500], marginBottom: 6, letterSpacing: '0.06em' }}>
            APEX · {TIER[morningBrief.apex.tier].label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
            {morningBrief.apex.title}
          </div>
          <div style={{ fontSize: '22px', lineHeight: 1.5, color: ink[700], marginBottom: 14 }}>
            {morningBrief.apex.body}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {morningBrief.apex.actions.map((a) => (
              <button
                key={a}
                style={{
                  background: warm[200],
                  border: `1px solid ${warm[700]}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: ink[700]
                }}
              >
                {a}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <ListenButton />
          </div>
        </div>

        {/* 8 sections */}
        {morningBrief.sections.map((sec) => (
          <Section key={sec.id} section={sec} />
        ))}
      </div>
    </div>
  );
}

function Section({ section }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3
        style={{
          fontSize: '18.66px',
          fontWeight: 700,
          margin: 0,
          marginBottom: 10,
          color: ink[500],
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        {section.title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {section.items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function Item({ item }) {
  const isHebrew = /[֐-׿]/.test(item.headline);
  return (
    <div
      style={{
        position: 'relative',
        background: warm[50],
        border: `2px solid ${ink[700]}`,
        borderRadius: 10,
        padding: item.tier ? '14px 18px 14px 28px' : '14px 18px',
        direction: isHebrew ? 'rtl' : 'ltr',
        textAlign: isHebrew ? 'right' : 'left'
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <TierStripe tier={item.tier} width={8} />
      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
        {item.headline}
      </div>
      <div style={{ fontSize: '18.66px', color: ink[500], lineHeight: 1.4 }}>
        {item.summary}
      </div>
    </div>
  );
}
