import React from 'react';
import { warm, ink, info, success, warning } from '../lib/colors.js';
import DrawerShell from './DrawerShell.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Religious calendar drawer. Shows the upcoming Shabbat window. The precise
 * candle-lighting/zmanim time needs a zmanim API we don't have yet, so we show
 * the dynamically-computed upcoming Friday date and a "~sunset" approximation
 * rather than stale fixed dates. The "Tag contact observance" section below is
 * a static helper, not date-bound.
 */
function buildUpcoming() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();              // 0 Sun .. 6 Sat
  const delta = (5 - day + 7) % 7;     // days until Friday
  d.setDate(d.getDate() + (delta === 0 && now.getHours() >= 20 ? 7 : delta));
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [
    { date: iso, label: 'Shabbat begins · ~sunset (Postville)', kind: 'shabbat' },
    { date: iso, label: 'Pre-shutdown lock · before candle-lighting', kind: 'pre-shutdown' }
  ];
}

const stripeColor = (k) => {
  if (k === 'shabbat' || k === 'yomtov') return success[500];
  if (k === 'pre-shutdown') return warning[500];
  if (k === 'third-party') return warm[400];
  return warm[600];
};

export default function ReligiousCalendarDrawer() {
  const { state, set } = useDemo();
  const upcoming = buildUpcoming();
  return (
    <DrawerShell
      open={state.religiousCalendarOpen}
      title="Religious calendar"
      onClose={() => set('religiousCalendarOpen', false)}
    >
      <div style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '22px', margin: 0, marginBottom: 12 }}>Upcoming</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map((u) => (
            <div
              key={u.date + u.label}
              style={{
                background: warm[200],
                border: `1px solid ${warm[600]}`,
                borderLeft: `5px solid ${stripeColor(u.kind)}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'baseline'
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  color: ink[500],
                  minWidth: 90,
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                {u.date}
              </span>
              <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>{u.label}</span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '22px', marginTop: 28, marginBottom: 12 }}>Tag contact observance</h3>
        <div style={{ background: warm[200], border: `1px solid ${warm[700]}`, borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: '18.66px', color: ink[500], marginBottom: 10 }}>
            Voice: "Nora, tag a contact observes Eid al-Fitr"
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Christmas', 'Easter', 'Eid al-Fitr', 'Eid al-Adha', 'July 4', 'Thanksgiving', 'Diwali', 'Chinese New Year'].map((o) => (
              <span
                key={o}
                style={{
                  background: warm[100],
                  border: `1px solid ${warm[700]}`,
                  borderRadius: 9999,
                  padding: '6px 12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: info[500]
                }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
