import React, { useState, useEffect, useRef } from 'react';
import { Video, Phone, Coffee } from 'lucide-react';
import { ink, tier as TIER, semantic, brand } from '../lib/colors.js';
import { fmtTime } from '../lib/format.js';
import { ListenButton, DictateButtons } from '../lib/voice.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { useDemo } from '../demo/DemoContext.jsx';
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

// Parse "YYYY-MM-DD" + "HH:MM" into a local Date. Returns null on bad input.
function eventStart(ev) {
  if (!ev?.date || !ev?.time || ev.time === 'all-day') return null;
  const d = new Date(`${ev.date}T${ev.time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function eventEnd(ev) {
  const s = eventStart(ev);
  if (!s) return null;
  return new Date(s.getTime() + (ev.duration || 30) * 60_000);
}
function shiftDate(yyyy_mm_dd, days) {
  const d = new Date(`${yyyy_mm_dd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function fmtCountdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

export default function CalendarPanel({ width }) {
  const { events, today: todayDate } = useLiveData();
  const { set } = useDemo();
  const [memo, setMemo] = useState('');
  const [zmanim, setZmanim] = useState(null);
  const [view, setView] = useState('today');
  const [now, setNow] = useState(() => new Date());

  // Tick once a minute so NOW/NEXT indicators stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // SearchPalette event rows dispatch CustomEvent('calendar:reveal', { detail: { id } }).
  // Switch to Today (all live events are today's — adaptCalendar sets date: today),
  // scroll the row into view (also scrolls the horizontal <main> to this panel),
  // and flash it gold for 2s.
  const listRef = useRef(null);
  const flashTimer = useRef(null);
  const [flashId, setFlashId] = useState(null);
  useEffect(() => {
    const onReveal = (ev) => {
      const id = ev?.detail?.id;
      if (!id) return;
      setView('today');
      setFlashId(id);
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-event-id="${CSS.escape(String(id))}"]`);
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', inline: 'center' });
      });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashId(null), 2000);
    };
    window.addEventListener('calendar:reveal', onReveal);
    return () => {
      window.removeEventListener('calendar:reveal', onReveal);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const tomorrowDate = shiftDate(todayDate, 1);
  const weekDates = Array.from({ length: 8 }, (_, i) => shiftDate(todayDate, i));
  const today = events.filter((e) => e.date === todayDate);
  const tomorrow = events.filter((e) => e.date === tomorrowDate);
  const weekByDay = weekDates.map((d) => ({ date: d, items: events.filter((e) => e.date === d) }));

  // Find isNow + next future event across today's list (panel-header hint).
  const nowEvent = today.find((e) => {
    const s = eventStart(e); const en = eventEnd(e);
    return s && en && now >= s && now < en;
  });
  const nextEvent = today
    .map((e) => ({ e, s: eventStart(e) }))
    .filter((x) => x.s && x.s > now)
    .sort((a, b) => a.s.getTime() - b.s.getTime())[0]?.e;
  const headerHint = !nowEvent && nextEvent
    ? `NEXT ${fmtCountdown(eventStart(nextEvent).getTime() - now.getTime()).toUpperCase()}`
    : null;

  // Real candle-lighting from /api/religious-calendar (Hebcal, Postville IA);
  // falls back to the nextFridayLabel() heuristic if the fetch fails.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/religious-calendar', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.live) setZmanim(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build the religious-calendar pill text from real zmanim when available.
  let religiousLine = `שבת begins ${nextFridayLabel()} · candle-lighting ~sunset (Postville)`;
  if (zmanim?.candleLighting) {
    const cl = new Date(zmanim.candleLighting);
    const dLabel = cl.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const tLabel = cl.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    religiousLine = zmanim.isRestNow
      ? `שבת — havdalah ${zmanim.havdalah ? new Date(zmanim.havdalah).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''} (${zmanim.location})`
      : `שבת begins ${dLabel} · candle-lighting ${tLabel} (${zmanim.location})`;
  }
  // Listen reads back the dictated memo if present, else the live agenda.
  const agendaText = today.length
    ? `Today: ${today
        .map((e) => `${e.time ? `${e.time} ` : ''}${e.title || e.label || ''}`.trim())
        .filter(Boolean)
        .join('. ')}`
    : 'Nothing on the calendar today.';
  const _d = new Date(`${todayDate}T00:00:00`);
  const baseSubtitle = Number.isNaN(_d.getTime())
    ? ''
    : `${_d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} · ${_d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${_d.getDate()}`;
  const calSubtitle = headerHint ? `${baseSubtitle} · ${headerHint}` : baseSubtitle;
  return (
    <PanelShell width={width} accent="#00897B" title="CALENDAR" subtitle={calSubtitle}>
      {/* Religious calendar pill — click to open the full zmanim drawer */}
      <button
        type="button"
        onClick={() => set('religiousCalendarOpen', true)}
        title="Open religious calendar (candle-lighting, havdalah, upcoming Yom Tov)"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '12px 16px',
          background: '#FFF3E0',
          border: 'none',
          borderBottom: `1px solid #FFCC80`,
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0,
          transition: 'all 0.12s ease'
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: '0.12em', color: '#E65100', fontWeight: 800 }}>
          RELIGIOUS CALENDAR
        </div>
        <div style={{ fontSize: 17, color: '#5D4037', marginTop: 3, lineHeight: 1.3 }}>
          {religiousLine}
        </div>
      </button>

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
        <span style={{ fontSize: 16, fontWeight: 800, color: ink[500], letterSpacing: '0.08em' }}>Memo</span>
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
              fontSize: 15,
              fontWeight: 700,
              padding: '8px 10px',
              borderRadius: 7,
              transition: 'all 0.12s ease',
            }}
          >
            clear
          </button>
        </div>
      )}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 6px 0 6px', flexShrink: 0 }}>
        {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Week']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            style={{
              flex: 1,
              padding: '9px 14px',
              border: `1px solid ${semantic.divider}`,
              borderRadius: 8,
              background: view === key ? '#00897B' : '#FFFFFF',
              color: view === key ? '#FFFFFF' : ink[700],
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Agenda list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {view === 'today' && (today.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: ink[300], fontSize: 14, fontWeight: 600 }}>
            Nothing on the calendar today.
          </div>
        ) : today.map((e) => (
          <EventRow key={e.id} event={e} now={now} nowEventId={nowEvent?.id} nextEventId={nextEvent?.id} flash={flashId === e.id} />
        )))}
        {view === 'tomorrow' && (tomorrow.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: ink[300], fontSize: 14, fontWeight: 600 }}>
            Nothing on the calendar tomorrow.
          </div>
        ) : tomorrow.map((e) => (
          <EventRow key={e.id} event={e} now={now} />
        )))}
        {view === 'week' && weekByDay.map(({ date, items }) => {
          const dd = new Date(`${date}T00:00:00`);
          const label = dd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <div key={date}>
              <div style={{ padding: '6px 8px 2px', fontSize: 12, fontWeight: 800, color: ink[500], letterSpacing: '0.08em' }}>
                {label.toUpperCase()}
              </div>
              {items.length === 0 ? (
                <div style={{ padding: '2px 12px 6px', color: ink[300], fontSize: 13 }}>—</div>
              ) : items.map((e) => (
                <EventRow key={e.id} event={e} now={now} nowEventId={date === todayDate ? nowEvent?.id : undefined} nextEventId={date === todayDate ? nextEvent?.id : undefined} />
              ))}
            </div>
          );
        })}
      </div>

    </PanelShell>
  );
}

function EventRow({ event, now, nowEventId, nextEventId, flash }) {
  const Icon = ICON_BY_TYPE[event.type] || Coffee;
  const tierHex = event.tier ? TIER[event.tier]?.hex : null;
  const isHe = event.language === 'he';
  const isZoom = event.type === 'zoom';
  const isNow = nowEventId && event.id === nowEventId;
  const isNext = nextEventId && event.id === nextEventId;
  const accent = isNow ? '#00897B' : tierHex;
  const countdown = isNext && now ? fmtCountdown(eventStart(event).getTime() - now.getTime()) : null;
  return (
    <div
      data-event-id={event.id}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${flash ? brand.gold : isNow ? '#00897B' : semantic.divider}`,
        boxShadow: flash ? `0 0 0 3px ${brand.gold}55` : undefined,
        borderRadius: 8,
        padding: '8px 10px 8px 16px',
        marginBottom: 4,
        direction: isHe ? 'rtl' : 'ltr',
        textAlign: isHe ? 'right' : 'left'
      }}
    >
      {accent && <span className="tier-stripe" style={{ background: accent, width: 7 }} />}
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
        {countdown && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#00695C', letterSpacing: '0.04em' }}>
            {countdown}
          </span>
        )}
        {isNow && (
          <span style={{ background: '#00897B', color: '#FFFFFF', fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 999, letterSpacing: '0.08em' }}>
            NOW
          </span>
        )}
        <Icon size={16} strokeWidth={2.2} color="#00695C" />
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
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 17,
              fontWeight: 800,
              cursor: event.joinUrl ? 'pointer' : 'default',
              opacity: event.joinUrl ? 1 : 0.5,
              fontFamily: 'inherit',
              transition: 'all 0.12s ease',
              boxShadow: '0 1px 2px rgba(15,23,42,0.06)'
            }}
          >
            Join Zoom
          </button>
        </div>
      )}
    </div>
  );
}
