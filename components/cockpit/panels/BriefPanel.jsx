import React, { useState, useEffect } from 'react';
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
  // Live end-of-day recap from GET /api/briefing/evening (same-origin cookie).
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/briefing/evening', { credentials: 'same-origin' });
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <div style={{ padding: '24px 16px', textAlign: 'center', color: ink[300], fontSize: 15 }}>Loading evening wrap-up…</div>;
  }
  if (status === 'error' || !data) {
    return <div style={{ padding: '24px 16px', textAlign: 'center', color: ink[500], fontSize: 15 }}>Evening wrap-up unavailable right now.</div>;
  }

  const { handled = {}, open = {}, loose_ends = [] } = data;
  const stats = [
    { label: 'Handled today', value: handled.replies_closed_today ?? 0, color: '#16A34A' },
    { label: 'Meetings today', value: handled.meetings_today ?? 0, color: '#5C6BC0' },
    { label: 'Still unread', value: open.unread_total ?? 0, color: '#F9A825' },
    { label: 'Overdue follow-ups', value: open.overdue_followups ?? 0, color: '#E53935' },
    { label: 'Open tasks', value: open.open_tasks ?? 0, color: '#7C3AED' },
    { label: 'Expiring invites', value: open.expiring_invitations ?? 0, color: '#0EA5E9' },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#FFFFFF', border: `1px solid ${semantic.divider}`, borderLeft: `4px solid ${s.color}`, borderRadius: 6, padding: '6px 10px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ink[500], letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '4px 8px', fontSize: 13, letterSpacing: '0.14em', color: ink[500], fontWeight: 800, textTransform: 'uppercase' }}>
        Loose ends
      </div>
      {loose_ends.length === 0 ? (
        <div style={{ padding: '12px', textAlign: 'center', color: ink[300], fontSize: 14, fontWeight: 600 }}>
          Nothing left hanging. Clean close.
        </div>
      ) : (
        loose_ends.map((it) => {
          const isHe = isHebrew(it.who) || isHebrew(it.detail);
          return (
            <div
              key={it.id}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${semantic.divider}`,
                borderRadius: 6,
                padding: '6px 10px',
                marginBottom: 3,
                direction: isHe ? 'rtl' : 'ltr',
                textAlign: isHe ? 'right' : 'left',
              }}
            >
              <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 16, fontWeight: 700, color: ink[700] }}>{it.who}</div>
              <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 14, color: ink[500], marginTop: 1, lineHeight: 1.4 }}>{it.detail}</div>
            </div>
          );
        })
      )}
    </>
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
