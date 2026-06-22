import React from 'react';
import { warm, ink, info, success, warning, tier as TIER } from '../lib/colors.js';
import { events, reminders, today } from '../data/calendar.js';
import TierStripe from '../primitives/TierStripe.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Calendar + Reminders pillar (Doc B Section 11.3).
 * ~700px wide. Adaptive subdivision: 60/40 normal, 75/25 heavy cal, 50/50 heavy rem,
 * Shabbat 3h pre-shutdown collapses to hero.
 */
const splits = {
  normal:    { cal: 60, rem: 40 },
  'heavy-cal': { cal: 75, rem: 25 },
  'heavy-rem': { cal: 50, rem: 50 },
  'shabbat-pre-shutdown': { cal: 100, rem: 0 }
};

export default function CalendarRemindersPillar({ height }) {
  const { state } = useDemo();
  const split = splits[state.calendarMode] || splits.normal;
  const shabbat = state.calendarMode === 'shabbat-pre-shutdown';
  const todayEvents = events.filter((e) => e.date === today);

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
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        Calendar + Reminders
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Calendar section */}
        <div
          style={{
            flexBasis: `${split.cal}%`,
            flexGrow: 0,
            flexShrink: 0,
            overflowY: 'auto',
            padding: '14px 18px',
            borderBottom: split.rem > 0 ? `1px solid ${warm[600]}` : 'none'
          }}
        >
          {shabbat && (
            <div
              style={{
                background: warning[100],
                borderTop: `2px solid ${ink[700]}`,
                borderRight: `2px solid ${ink[700]}`,
                borderBottom: `2px solid ${ink[700]}`,
                borderLeft: `10px solid ${warning[500]}`,
                borderRadius: 10,
                padding: '16px 18px',
                marginBottom: 14
              }}
            >
              <div
                style={{
                  fontSize: '14.66px',
                  color: warning[700],
                  letterSpacing: '0.05em',
                  marginBottom: 6
                }}
              >
                PRE-SHUTDOWN LOCK
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>
                Shabbat onset in 2h 12m · wrap day
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: '16px',
              color: ink[500],
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 10,
              fontWeight: 700
            }}
          >
            Today
          </div>

          {todayEvents.map((e) => (
            <Event key={e.id} ev={e} />
          ))}

          {/* Friday Shabbat row + observance row (showcase the religious calendar visual) */}
          <ShabbatRow />
          <ObservanceRow />
        </div>

        {/* Reminders section */}
        {split.rem > 0 && (
          <div
            style={{
              flexBasis: `${split.rem}%`,
              flexGrow: 0,
              flexShrink: 0,
              overflowY: 'auto',
              padding: '14px 18px'
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: ink[500],
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
                fontWeight: 700
              }}
            >
              Reminders
            </div>
            {reminders.map((r) => (
              <Reminder key={r.id} rem={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Event({ ev }) {
  const isHebrew = ev.language === 'he';
  return (
    <div
      style={{
        position: 'relative',
        background: warm[50],
        border: `2px solid ${ink[700]}`,
        borderRadius: 10,
        padding: ev.tier ? '12px 16px 12px 22px' : '12px 16px',
        marginBottom: 8,
        direction: isHebrew ? 'rtl' : 'ltr',
        textAlign: isHebrew ? 'right' : 'left'
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <TierStripe tier={ev.tier} width={8} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: '18.66px',
            fontWeight: 700,
            color: info[500],
            minWidth: 70
          }}
        >
          {ev.time}
        </span>
        <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>{ev.title}</span>
      </div>
    </div>
  );
}

function ShabbatRow() {
  return (
    <div
      style={{
        background: warm[50],
        borderTop: `2px solid ${ink[700]}`,
        borderRight: `2px solid ${ink[700]}`,
        borderBottom: `2px solid ${ink[700]}`,
        borderLeft: `10px solid ${success[500]}`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 8
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: '18.66px', fontWeight: 700, color: success[700], minWidth: 70 }}>
          Fri 7:48
        </span>
        <span style={{ fontSize: '22px', fontWeight: 700 }}>Shabbat begins (Postville, IA)</span>
      </div>
    </div>
  );
}

function ObservanceRow() {
  return (
    <div
      style={{
        background: warm[50],
        borderTop: `2px solid ${ink[700]}`,
        borderRight: `2px solid ${ink[700]}`,
        borderBottom: `2px solid ${ink[700]}`,
        borderLeft: `10px solid ${warm[700]}`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 8
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: '18.66px', fontWeight: 700, color: ink[500], minWidth: 70 }}>
          May 13
        </span>
        <span style={{ fontSize: '22px', fontWeight: 700 }}>
          Eid al-Fitr · 1 contact observes (a contact)
        </span>
      </div>
    </div>
  );
}

function Reminder({ rem }) {
  const isHebrew = rem.language === 'he';
  const dueTime = new Date(rem.due).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <div
      style={{
        position: 'relative',
        background: warm[50],
        border: `2px solid ${ink[700]}`,
        borderRadius: 10,
        padding: rem.tier ? '10px 16px 10px 22px' : '10px 16px',
        marginBottom: 8,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        direction: isHebrew ? 'rtl' : 'ltr',
        textAlign: isHebrew ? 'right' : 'left'
      }}
      className={isHebrew ? 'hebrew' : ''}
    >
      <TierStripe tier={rem.tier} width={8} />
      <span style={{ fontSize: '16px', color: ink[500], minWidth: 60, fontWeight: 700 }}>
        {dueTime}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>{rem.title}</span>
    </div>
  );
}
