import React from 'react';
import { Star, Home, Users } from 'lucide-react';
import { channel as CH, ink, semantic, roleChip } from '../lib/colors.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * RECENT strips — peripheral signal at the very top (Peripheral Awareness Covenant).
 *
 * Gideon 2026-06-16: THREE strips, all the SAME size, Family in the CENTER.
 *   · Investors — anyone tagged investor
 *   · Family    — wife + kids (private; center, most prominent tint)
 *   · Others    — everyone else (brokers, vendors, unknowns)
 *
 * NOT the comms lanes (305 / 718 / Staff / Investors) — those live in the Comms hub below.
 * Click a chip → opens that conversation in the Comms hub (set openChat).
 */
const byRecent = (a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0);

export default function RecentlyActiveStrip({ top }) {
  // Live threads from the cockpit provider (falls back to static mock while the
  // first fetch is in flight). familyTag/staffTag have no live source yet, so
  // Family degrades to empty and Others = everyone not flagged investor.
  const { threads } = useLiveData();
  const list = Array.isArray(threads) ? threads : [];

  const investorThreads = list.filter((t) => t.isInvestor).sort(byRecent).slice(0, 8);
  const familyThreads   = list.filter((t) => t.familyTag).sort(byRecent).slice(0, 8);
  const otherThreads    = list
    .filter((t) => !t.isInvestor && !t.staffTag && !t.familyTag)
    .sort(byRecent)
    .slice(0, 8);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: 60,
        background: '#FFFFFF',
        borderBottom: `1px solid ${semantic.divider}`,
        display: 'flex',
        zIndex: 39,
        fontFamily: 'inherit'
      }}
    >
      <Strip
        icon={Star}
        title="INVESTORS"
        accent={CH.investor.hex}
        tint="rgba(219, 39, 119, 0.04)"
        list={investorThreads}
        empty="No investor activity yet."
      />
      <Strip
        icon={Home}
        title="FAMILY"
        accent={roleChip.family.hex}
        tint="rgba(67, 160, 71, 0.10)"
        list={familyThreads}
        empty="Quiet at home."
        center
      />
      <Strip
        icon={Users}
        title="OTHERS"
        accent={ink[300]}
        tint="rgba(100, 116, 139, 0.05)"
        list={otherThreads}
        empty="Nothing else right now."
      />
    </div>
  );
}

function Strip({ icon: Icon, title, accent, tint, list, empty, center }) {
  const { set } = useDemo();
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '6px 14px',
        gap: 10,
        background: tint,
        borderLeft: center ? `2px solid ${accent}44` : 'none',
        borderRight: center ? `2px solid ${accent}44` : 'none'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0, lineHeight: 1.05 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 800, color: accent, letterSpacing: '0.12em' }}>
          <Icon size={12} strokeWidth={2.6} /> {title}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: ink[300], letterSpacing: '0.08em' }}>
          {list.length} recent
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
        {list.map((t) => {
          const ch = CH[t.channel];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => set('openChat', t.id)}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${accent}44`,
                borderLeft: `4px solid ${ch?.hex || accent}`,
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
                lineHeight: 1.1,
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: ink[700], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {t.unread > 0 && (
                  <span style={{ background: ch?.hex || accent, color: '#FFFFFF', borderRadius: 999, padding: '0 5px', fontSize: 12, fontWeight: 800 }}>
                    {t.unread}
                  </span>
                )}
                {t.contactName}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ch?.hex || ink[300] }}>
                {ch?.label || t.channel}
              </span>
            </button>
          );
        })}
        {list.length === 0 && (
          <span style={{ fontSize: 14, color: ink[300], fontStyle: 'italic', alignSelf: 'center' }}>
            {empty}
          </span>
        )}
      </div>
    </div>
  );
}
