'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { brand, slate, semantic } from '../cockpit/lib/colors.js';
import { BTN_PILL, TRANSITION } from '../cockpit/lib/buttonStyles.js';
import CockpitErrorBoundary from '../cockpit/CockpitErrorBoundary.jsx';
import IntegrationStatusPill from '../cockpit/chrome/IntegrationStatusPill.jsx';
import DeckRail from './DeckRail.jsx';
import SetupRequiredBanner from './SetupRequiredBanner.jsx';

// DeckShell — shared chrome for every deck page (architecture §4). One file,
// every deck uses it: DeckRail on the left, a slate header (title, back-to-
// cockpit, IntegrationStatusPill reuse, live clock), and a scrollable content
// region wrapped in CockpitErrorBoundary so a deck crash never takes down
// anything else. NEVER mounted on the Flight Deck (/cockpit stays untouched).
//
// Kiosk-grade per _ops-context/kiosk-design-spec-v2.md: Lexend body type,
// 16px prose floor, ≥44pt touch targets, tokens from cockpit colors.js.

const FONT = "var(--font-lexend), 'Lexend', 'Poppins', sans-serif";
const HEADER_HEIGHT = 80; // matches TopChrome Row1 band

// Live clock — same pattern as TopChrome's ClockShabbat (1s tick, en-US,
// "Mon · May 11" middot date), minus the Shabbat pill (cockpit-only concern).
// Mount-gated so deck pages that get statically prerendered can't hydrate-
// mismatch on time text (the /cockpit page solves this with force-dynamic;
// decks shouldn't have to).
function DeckClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div style={{ minWidth: 74 }} aria-hidden="true" />;

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ textAlign: 'right', minWidth: 74, flexShrink: 0 }}>
      <div className="mono" style={{ color: brand.gold, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
        {time}
      </div>
      <div style={{ color: brand.goldSoft, fontSize: 11, marginTop: 2 }}>
        {`${weekday} · ${monthDay}`}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   status?: import('../../lib/domains/status').ModuleStatus | null,
 *   setupHref?: string,
 *   actions?: import('react').ReactNode,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DeckShell({ title, subtitle, status, setupHref, actions, children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: semantic.canvas,
        color: semantic.ink,
        fontFamily: FONT,
      }}
    >
      <DeckRail />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            height: HEADER_HEIGHT,
            flexShrink: 0,
            background: slate.gradient,
            borderBottom: `2px solid ${brand.goldSoft}`,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 20px',
          }}
        >
          <Link
            href="/cockpit"
            title="Back to the cockpit"
            style={{
              ...BTN_PILL,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: brand.goldSoft,
              border: '1px solid rgba(255,204,51,0.28)',
              borderRadius: 999,
              fontWeight: 700,
              transition: TRANSITION,
              flexShrink: 0,
            }}
          >
            ← Cockpit
          </Link>

          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <span style={{ fontSize: 14, color: brand.goldSoft, marginTop: 2 }}>{subtitle}</span>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {actions}
          <IntegrationStatusPill />
          <DeckClock />
        </header>

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24 }}>
          <CockpitErrorBoundary>
            <SetupRequiredBanner status={status} setupHref={setupHref} />
            {children}
          </CockpitErrorBoundary>
        </main>
      </div>
    </div>
  );
}
