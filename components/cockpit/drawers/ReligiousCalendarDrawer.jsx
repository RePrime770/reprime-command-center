import React from 'react';
import { warm, ink, info, success, warning } from '../lib/colors.js';
import DrawerShell from './DrawerShell.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Religious calendar drawer — Hebcal API mock. Shows upcoming Shabbat/Yom Tov +
 * third-party observances. "Tag contact observance" section.
 */
const upcoming = [
  { date: '2026-05-15', label: 'Shabbat begins · 7:48 PM (Postville)', kind: 'shabbat' },
  { date: '2026-05-15', label: 'Pre-shutdown lock · 4:48 PM', kind: 'pre-shutdown' },
  { date: '2026-05-13', label: 'Eid al-Fitr · a contact observes', kind: 'third-party' },
  { date: '2026-05-22', label: 'Lag BaOmer', kind: 'minor' },
  { date: '2026-06-01', label: 'Shavuot · Day 1', kind: 'yomtov' },
  { date: '2026-06-02', label: 'Shavuot · Day 2', kind: 'yomtov' }
];

const stripeColor = (k) => {
  if (k === 'shabbat' || k === 'yomtov') return success[500];
  if (k === 'pre-shutdown') return warning[500];
  if (k === 'third-party') return warm[400];
  return warm[600];
};

export default function ReligiousCalendarDrawer() {
  const { state, set } = useDemo();
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
