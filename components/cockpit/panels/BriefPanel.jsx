import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ink, tier as TIER, semantic, brand } from '../lib/colors.js';
import { ListenButton } from '../lib/voice.jsx';
import { isHebrew } from '../lib/format.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import PanelShell from './PanelShell.jsx';

export default function BriefPanel({ width }) {
  const { morningBrief } = useLiveData();
  const [tab, setTab] = useState('morning');
  return (
    <PanelShell width={width} accent="#1E88E5" title="BRIEF" subtitle="MORNING + EVENING">
      <div
        style={{
          display: 'flex',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          flexShrink: 0
        }}
      >
        {[
          { id: 'morning', label: 'Morning', icon: Sun, color: '#F9A825' },
          { id: 'evening', label: 'Evening', icon: Moon, color: '#5C6BC0' }
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 10px',
                background: active ? t.color : 'transparent',
                color: active ? '#FFFFFF' : ink[500],
                border: 'none',
                borderBottom: active ? `3px solid ${t.color}` : '3px solid transparent',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <t.icon size={13} strokeWidth={2.4} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6, background: '#F1F5F9' }}>
        {tab === 'morning' ? <MorningContent morningBrief={morningBrief} /> : <EveningContent />}
      </div>
    </PanelShell>
  );
}

function MorningContent({ morningBrief }) {
  const { apex, sections = [] } = morningBrief || {};
  if (!apex && sections.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: ink[500], fontSize: 15, lineHeight: 1.5 }}>
        No brief items yet.
      </div>
    );
  }
  return (
    <>
      {/* Hero card for the apex item. Live data may omit apex — render only when present. */}
      {apex && (
        <div
          style={{
            position: 'relative',
            padding: '10px 12px 10px 18px',
            background: brand.navy,
            color: '#FFFFFF',
            borderRadius: 8,
            marginBottom: 6,
            boxShadow: '0 4px 12px rgba(14, 52, 112, 0.30)'
          }}
        >
          {apex.tier && <span className="tier-stripe" style={{ background: TIER[apex.tier]?.hex, width: 7 }} />}
          <div style={{ fontSize: 13, fontWeight: 800, color: brand.gold, letterSpacing: '0.14em', marginBottom: 2 }}>
            APEX{apex.tier ? ` · ${TIER[apex.tier]?.label}` : ''}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>{apex.title}</div>
          <div style={{ fontSize: 16, lineHeight: 1.45, opacity: 0.95 }}>{apex.body}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(apex.actions || []).map((a) => (
              <button
                key={a}
                type="button"
                style={{
                  background: brand.gold,
                  color: brand.navy,
                  border: 'none',
                  borderRadius: 6,
                  padding: '3px 10px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {a}
              </button>
            ))}
            <ListenButton compact text={[apex.title, apex.body].filter(Boolean).join('. ')} />
          </div>
        </div>
      )}

      {sections.map((sec) => (
        <Section key={sec.id} sec={sec} />
      ))}
    </>
  );
}

function Section({ sec }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          padding: '4px 8px',
          fontSize: 13,
          letterSpacing: '0.14em',
          color: ink[500],
          fontWeight: 800,
          textTransform: 'uppercase'
        }}
      >
        {sec.title}
      </div>
      {(sec.items || []).map((it) => {
        const tierHex = it.tier ? TIER[it.tier]?.hex : null;
        const isHe = isHebrew(it.headline);
        return (
          <div
            key={it.id}
            style={{
              position: 'relative',
              padding: '6px 10px 6px 14px',
              background: '#FFFFFF',
              border: `1px solid ${semantic.divider}`,
              borderRadius: 6,
              marginBottom: 3,
              direction: isHe ? 'rtl' : 'ltr',
              textAlign: isHe ? 'right' : 'left'
            }}
          >
            {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 5 }} />}
            <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 16, fontWeight: 600, color: ink[700], lineHeight: 1.3 }}>
              {it.headline}
            </div>
            <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 14, color: ink[500], marginTop: 2, lineHeight: 1.4 }}>
              {it.summary}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EveningContent() {
  // No live source for an evening wrap-up yet (the briefing API returns the
  // morning brief only). Show an honest empty state rather than stale mock
  // business strings.
  return (
    <div
      style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: ink[500],
        fontSize: 15,
        lineHeight: 1.5
      }}
    >
      Evening wrap-up isn't wired to live data yet.
    </div>
  );
}

function Card({ title, color, children }) {
  return (
    <div
      style={{
        padding: '7px 10px',
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 6,
        marginBottom: 5
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: '0.14em', color, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 16, color: ink[700], marginTop: 3, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}
