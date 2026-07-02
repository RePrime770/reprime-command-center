'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { brand, slate } from '../cockpit/lib/colors.js';
import { TRANSITION } from '../cockpit/lib/buttonStyles.js';
// Deck route inventory owned by the CommandRegistry (batch 2.3). Extensionless
// import so it resolves whether the registry ships as .ts or .js.
import { DECK_ROUTES } from '../../lib/cockpit/commands';

// DeckRail — vertical nav rail rendered inside deck pages only (part of
// DeckShell, architecture §2.3 entry point #2). NEVER mounted on the Flight
// Deck. Back-to-cockpit is always the top item; below it, only ENABLED deck
// routes render — disabled/unshipped decks stay invisible (they surface in ⌘K
// with a "setup" chip instead, per §2.3 #1).

const RAIL_WIDTH = 76;
const ITEM_SIZE = 56; // ≥44pt kiosk touch target (_ops-context/kiosk-design-spec-v2.md §1.2)
const FONT = "var(--font-lexend), 'Lexend', 'Poppins', sans-serif";

/**
 * Two-letter monogram from a deck title: initials of the first two words,
 * else the first two letters. "System Health" → "SH", "Pipeline" → "PI".
 * @param {string} title
 * @returns {string}
 */
function monogram(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

function RailItem({ href, title, active }) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? 'page' : undefined}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textDecoration: 'none',
        background: active ? brand.gold : 'rgba(255,255,255,0.06)',
        color: active ? slate.dark900 : brand.goldSoft,
        border: `1px solid ${active ? brand.gold : 'rgba(255,204,51,0.22)'}`,
        transition: TRANSITION,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{monogram(title)}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          maxWidth: ITEM_SIZE - 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>
    </Link>
  );
}

/**
 * Normalize the registry to a flat list of { id, title, href, enabled }.
 * Shipped shape is Record<id, DeckRoute> (lib/cockpit/commands.ts); an array
 * form is tolerated too so a registry refactor can't break the rail.
 * @returns {Array<{ id: string, title: string, href: string, enabled: boolean }>}
 */
function deckRouteList() {
  if (Array.isArray(DECK_ROUTES)) {
    return DECK_ROUTES.filter((r) => r && typeof r.href === 'string');
  }
  if (DECK_ROUTES && typeof DECK_ROUTES === 'object') {
    return Object.entries(DECK_ROUTES)
      .filter(([, r]) => r && typeof r.href === 'string')
      .map(([id, r]) => ({ id, ...r }));
  }
  return [];
}

export default function DeckRail() {
  const pathname = usePathname();
  const routes = deckRouteList().filter((r) => r.enabled === true);

  return (
    <nav
      aria-label="Decks"
      style={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        background: slate.gradient,
        borderRight: `2px solid ${brand.goldSoft}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '14px 0',
        fontFamily: FONT,
        minHeight: '100vh',
      }}
    >
      {/* Back to the Flight Deck — always the top item. */}
      <RailItem href="/cockpit" title="Cockpit" active={pathname === '/cockpit'} />
      <div
        style={{
          width: ITEM_SIZE - 16,
          height: 1,
          background: 'rgba(255,204,51,0.22)',
          flexShrink: 0,
        }}
      />
      {routes.map((r) => (
        <RailItem
          key={r.id || r.href}
          href={r.href}
          title={r.title || r.id || ''}
          active={pathname === r.href}
        />
      ))}
    </nav>
  );
}
