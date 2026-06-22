import React, { useState } from 'react';
import { Video, Phone, Coffee } from 'lucide-react';
import { ink, tier as TIER, semantic, brand } from '../lib/colors.js';
import { fmtTime } from '../lib/format.js';
import { ListenButton, DictateButtons } from '../lib/voice.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import PanelShell from './PanelShell.jsx';

const ICON_BY_TYPE = {
  zoom: Video,
  call: Phone,
  block: Coffee,
  work: Coffee,
  standard: Coffee
};

// Label for the upcoming Friday (Shabbat begins). Rolls to next week once
// Friday evening is underway. Local time.
function nextFridayLabel() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();              // 0 Sun .. 6 Sat
  const delta = (5 - day + 7) % 7;     // days until Friday
  d.setDate(d.getDate() + (delta === 0 && now.getHours() >= 20 ? 7 : delta));
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function CalendarPanel({ width }) {
  const { events, today: todayDate } = useLiveData();
  const today = events.filter((e) => e.date === todayDate);
  const [memo, setMemo] = useState('');
  // Listen reads back the dictated memo if present, else the live agenda.
  const agendaText = today.length
    ? `Today: ${today
        .map((e) => `${e.time ? `${e.time} ` : ''}${e.title || e.label || ''}`.trim())
        .filter(Boolean)
        .join('. ')}`
    : 'Nothing on the calendar today.';
  const _d = new Date(`${todayDate}T00:00:00`);
  const calSubtitle = Number.isNaN(_d.getTime())
    ? ''
    : `${_d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} · ${_d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${_d.getDate()}`;
  return (
    <PanelShell width={width} accent="#00897B" title="CALENDAR" subtitle={calSubtitle}>
      {/* Religious calendar pill */}
      <div
        style={{
          padding: '8px 12px',
          background: '#FFF3E0',
          borderBottom: `1px solid #FFCC80`,
          flexShrink: 0
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: '0.12em', color: '#E65100', fontWeight: 800 }}>
          RELIGIOUS CALENDAR
        </div>
        <div style={{ fontSize: 16, color: '#5D4037', marginTop: 2, lineHeight: 1.3 }}>
          שבת begins {nextFridayLabel()} · candle-lighting ~sunset (Postville)
        </div>
      </div>

      {/* Voice memo — controls on TOP (Gideon 2026-06-16) */}
      <div
        style={{
          padding: 6,
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: ink[500], letterSpacing: '0.08em' }}>Memo</span>
        <DictateButtons compact onText={(t) => setMemo((m) => (m ? `${m} ${t}` : t))} />
        <ListenButton compact getText={() => memo || agendaText} />
      </div>

      {memo && (
        <div
          style={{
            padding: '6px 12px',
            background: '#F1F5F9',
            borderBottom: `1px solid ${semantic.divider}`,
            fontSize: 14,
            color: ink[700],
            lineHeight: 1.4,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <span style={{ flex: 1 }}>{memo}</span>
          <button
            type="button"
            onClick={() => setMemo('')}
            title="Clear memo"
            style={{
              border: 'none',
              background: 'transparent',
              color: ink[300],
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            clear
          </button>
        </div>
      )}

      {/* Agenda list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {today.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: ink[300], fontSize: 14, fontWeight: 600 }}>
            Nothing on the calendar today.
          </div>
        ) : (
          today.map((e) => (
            <EventRow key={e.id} event={e} />
          ))
        )}
      </div>

    </PanelShell>
  );
}

function EventRow({ event }) {
  const Icon = ICON_BY_TYPE[event.type] || Coffee;
  const tierHex = event.tier ? TIER[event.tier]?.hex : null;
  const isHe = event.language === 'he';
  const isZoom = event.type === 'zoom';
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderRadius: 8,
        padding: '8px 10px 8px 16px',
        marginBottom: 4,
        direction: isHe ? 'rtl' : 'ltr',
        textAlign: isHe ? 'right' : 'left'
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 7 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: '#004D40',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 999,
            minWidth: 50,
            textAlign: 'center'
          }}
          className="mono"
        >
          {event.time === 'all-day' ? 'ALL DAY' : event.time}
        </span>
        <Icon size={13} strokeWidth={2.2} color="#00695C" />
        <span className={isHe ? 'hebrew' : ''} style={{ fontSize: 18, fontWeight: 600, color: ink[700], flex: 1, lineHeight: 1.3 }}>
          {event.title}
        </span>
      </div>
      {isZoom && (
        <div
          style={{
            marginTop: 6,
            padding: '6px 8px',
            background: '#004D40',
            color: '#FFFFFF',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.85, letterSpacing: '0.1em', fontWeight: 700 }}>
            STARTS
          </span>
          <span className="mono" style={{ fontSize: 21, fontWeight: 800 }}>
            {event.time === 'all-day' ? 'ALL DAY' : event.time}
          </span>
          <button
            type="button"
            onClick={() => {
              if (event.joinUrl) window.open(event.joinUrl, '_blank', 'noopener,noreferrer');
            }}
            disabled={!event.joinUrl}
            title={event.joinUrl ? 'Open the meeting link' : 'No join link on this event'}
            style={{
              background: brand.gold,
              color: brand.navy,
              border: 'none',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 16,
              fontWeight: 800,
              cursor: event.joinUrl ? 'pointer' : 'default',
              opacity: event.joinUrl ? 1 : 0.5,
              fontFamily: 'inherit'
            }}
          >
            Join Zoom
          </button>
        </div>
      )}
    </div>
  );
}
