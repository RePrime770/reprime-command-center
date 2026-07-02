import React, { useEffect, useRef, useState } from 'react';
import { Search, X, MessageSquare, Calendar, Mail, Star, Command as CommandIcon } from 'lucide-react';
import { ink, semantic, channel as CH, brand } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { listCommands } from '../../../lib/cockpit/commands';

/**
 * Global command / search palette — the "find anyone, any message, any meeting"
 * line. Opened by the Concierge "Search" button (state.searchOpen) or Ctrl/Cmd+K.
 * Searches LIVE data (threads, calendar events, triaged emails) from useLiveData.
 * Every row is actionable: threads open in the Comms hub (set openChat), emails
 * open in EmailPanel (CustomEvent 'cockpit:openEmail'), events open their join
 * link or reveal themselves in CalendarPanel (CustomEvent 'calendar:reveal').
 * No fabrication: empty until there's live data; matches only what exists.
 *
 * Commands: enabled CommandRegistry entries (lib/cockpit/commands.ts) render
 * ABOVE threads — navigate commands hard-route via window.location.assign,
 * action commands invoke run(). Every seeded deck command ships disabled, so
 * the section is invisible until a deck flips its DECK_ROUTES flag.
 */
export default function SearchPalette() {
  const { state, set } = useDemo();
  const { threads, events, emails } = useLiveData();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const open = !!state.searchOpen;

  // Ctrl/Cmd+K toggles the palette from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        set('searchOpen', !state.searchOpen);
      } else if (e.key === 'Escape' && state.searchOpen) {
        set('searchOpen', false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.searchOpen, set]);

  useEffect(() => {
    if (open) { setQ(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  // Reset cursor when search text changes.
  useEffect(() => { setCursor(0); }, [q]);

  const query = q.trim().toLowerCase();
  const threadList = Array.isArray(threads) ? threads : [];
  const eventList = Array.isArray(events) ? events : [];
  const emailList = Array.isArray(emails) ? emails : [];

  const matchThreads = !query ? threadList.slice(0, 8) : threadList.filter((t) =>
    `${t.contactName || ''} ${t.preview || ''} ${t.id || ''}`.toLowerCase().includes(query)
  ).slice(0, 12);
  const matchEvents = !query ? [] : eventList.filter((e) =>
    `${e.title || ''}`.toLowerCase().includes(query)
  ).slice(0, 8);
  const matchEmails = !query ? [] : emailList.filter((e) =>
    `${e.from || ''} ${e.subject || ''} ${e.preview || ''}`.toLowerCase().includes(query)
  ).slice(0, 8);
  // Enabled palette commands (lib/cockpit/commands.ts). All deck commands ship
  // disabled, so this is [] today and the Commands section renders nothing.
  const matchCommands = listCommands(query).slice(0, 6);

  // Commands: navigate → hard route change; action → run(). Close first so the
  // palette never lingers over a new page.
  const runCommand = (c) => {
    set('searchOpen', false);
    if (c.kind === 'navigate' && c.href) {
      window.location.assign(c.href);
    } else if (c.kind === 'action') {
      c.run?.();
    }
  };

  const openThread = (t) => {
    set('openChat', t.id);
    set('searchOpen', false);
  };

  // Email rows → open that message in EmailPanel via a window CustomEvent
  // (EmailPanel owns the listener; payload is the adapted email id = Gmail message_id).
  const openEmailRow = (m) => {
    window.dispatchEvent(new CustomEvent('cockpit:openEmail', { detail: { id: m.id } }));
    set('searchOpen', false);
  };

  // Event rows → best available action: open the join link when the event has
  // one; otherwise reveal + flash the row in CalendarPanel.
  const openEventRow = (ev) => {
    if (ev.joinUrl) {
      window.open(ev.joinUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.dispatchEvent(new CustomEvent('calendar:reveal', { detail: { id: ev.id } }));
    }
    set('searchOpen', false);
  };

  // Flat list of selectable rows: commands, then threads, events, emails (matches render order).
  const items = [
    ...matchCommands.map((c) => ({ key: `c:${c.id}`, onOpen: () => runCommand(c) })),
    ...matchThreads.map((t) => ({ key: `t:${t.id}`, onOpen: () => openThread(t) })),
    ...matchEvents.map((ev) => ({ key: `e:${ev.id}`, onOpen: () => openEventRow(ev) })),
    ...matchEmails.map((m) => ({ key: `m:${m.id}`, onOpen: () => openEmailRow(m) })),
  ];

  // The keydown handler must see the CURRENT items, not the snapshot from when
  // the effect last ran — the 60s live poll can re-sort threads without
  // changing items.length, and Enter would open the wrong row. Mirror items
  // into a ref every commit and read it at event time.
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; });

  // Keyboard navigation (registered only while open).
  useEffect(() => {
    if (!open) return undefined;
    const onNav = (e) => {
      const list = itemsRef.current;
      const max = list.length - 1;
      if (max < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        setCursor((c) => Math.min(max, c + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        list[Math.min(cursor, max)]?.onOpen?.();
      }
    };
    window.addEventListener('keydown', onNav);
    return () => window.removeEventListener('keydown', onNav);
  }, [open, cursor]);

  // Auto-scroll highlighted row into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-row-idx="${cursor}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor, open]);

  if (!open) return null;

  return (
    <div
      onClick={() => set('searchOpen', false)}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'rgba(2,6,23,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: '92%', background: '#FFFFFF', borderRadius: 12, boxShadow: '0 24px 64px rgba(2,6,23,0.45)', overflow: 'hidden', maxHeight: '70%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${semantic.divider}` }}>
          <Search size={20} strokeWidth={2.4} color={ink[300]} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, messages, meetings, email…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 20, fontFamily: 'inherit', color: ink[700], background: 'transparent' }}
          />
          <kbd style={{ fontSize: 12, color: ink[300], border: `1px solid ${semantic.border}`, borderRadius: 4, padding: '1px 6px' }}>esc</kbd>
          <button type="button" onClick={() => set('searchOpen', false)} style={{ background: 'transparent', border: 'none', color: ink[300], cursor: 'pointer', padding: 2 }}>
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: 'auto', padding: 8 }}>
          {matchCommands.length > 0 && (
            <Group icon={CommandIcon} label="Commands" count={matchCommands.length}>
              {matchCommands.map((c, idx) => {
                const active = idx === cursor;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => runCommand(c)}
                    onMouseEnter={() => setCursor(idx)}
                    data-row-idx={idx}
                    style={{ ...rowStyle, background: active ? ink[100] : 'transparent', borderLeft: `3px solid ${active ? brand.navy : 'transparent'}`, paddingLeft: 7 }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: ink[700], flex: 1, textAlign: 'left' }}>{c.title}</span>
                    <span style={{ fontSize: 13, color: ink[300], fontWeight: 700 }}>{c.kind === 'navigate' ? c.href : 'Run'}</span>
                  </button>
                );
              })}
            </Group>
          )}

          <Group icon={MessageSquare} label={query ? 'Conversations' : 'Recent conversations'} count={matchThreads.length}>
            {matchThreads.map((t, i) => {
              const idx = matchCommands.length + i;
              const ch = CH[t.channel];
              const active = idx === cursor;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t)}
                  onMouseEnter={() => setCursor(idx)}
                  data-row-idx={idx}
                  style={{
                    ...rowStyle,
                    background: active ? ink[100] : 'transparent',
                    borderLeft: `3px solid ${active ? brand.navy : 'transparent'}`,
                    paddingLeft: 7,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: ch?.hex || ink[300], flexShrink: 0 }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: ink[700], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {t.isInvestor && <Star size={11} fill={CH.investor.hex} stroke={CH.investor.hex} />}
                    {t.contactName || t.id}
                  </span>
                  <span style={{ fontSize: 13, color: ch?.hex || ink[300] }}>{ch?.label || t.channel}</span>
                  {t.preview && <span style={{ fontSize: 13, color: ink[300], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {t.preview}</span>}
                </button>
              );
            })}
            {matchThreads.length === 0 && <Empty>No matching conversations.</Empty>}
          </Group>

          {matchEvents.length > 0 && (
            <Group icon={Calendar} label="Today's meetings" count={matchEvents.length}>
              {matchEvents.map((e, i) => {
                const idx = matchCommands.length + matchThreads.length + i;
                const active = idx === cursor;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => openEventRow(e)}
                    onMouseEnter={() => setCursor(idx)}
                    data-row-idx={idx}
                    style={{ ...rowStyle, background: active ? ink[100] : 'transparent', borderLeft: `3px solid ${active ? brand.navy : 'transparent'}`, paddingLeft: 7 }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: ink[700], flex: 1, textAlign: 'left' }}>{e.time} — {e.title}</span>
                    {e.joinUrl
                      ? <span style={{ fontSize: 13, color: '#2D8CFF', fontWeight: 700 }}>Join ↗</span>
                      : <span style={{ fontSize: 13, color: ink[300], fontWeight: 700 }}>Show in calendar</span>}
                  </button>
                );
              })}
            </Group>
          )}

          {matchEmails.length > 0 && (
            <Group icon={Mail} label="Email" count={matchEmails.length}>
              {matchEmails.map((e, i) => {
                const idx = matchCommands.length + matchThreads.length + matchEvents.length + i;
                const active = idx === cursor;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => openEmailRow(e)}
                    onMouseEnter={() => setCursor(idx)}
                    data-row-idx={idx}
                    style={{ ...rowStyle, background: active ? ink[100] : 'transparent', borderLeft: `3px solid ${active ? brand.navy : 'transparent'}`, paddingLeft: 7 }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: ink[700] }}>{e.from}</span>
                    <span style={{ fontSize: 14, color: ink[500], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {e.subject || e.preview}</span>
                  </button>
                );
              })}
            </Group>
          )}

          {query && matchCommands.length === 0 && matchThreads.length === 0 && matchEvents.length === 0 && matchEmails.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: ink[300], fontSize: 15 }}>
              Nothing matches “{q}”.
            </div>
          )}
        </div>

        <div style={{ padding: '8px 18px', borderTop: `1px solid ${semantic.divider}`, fontSize: 12, color: ink[300], display: 'flex', gap: 14 }}>
          <span><kbd style={kbdStyle}>⌘K</kbd> open/close</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: brand.navy, fontWeight: 700 }}>Click to open — conversations, emails, meetings</span>
        </div>
      </div>
    </div>
  );
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  background: 'transparent', border: 'none', borderRadius: 8,
  padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
};
const kbdStyle = { border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, padding: '0 5px' };

function Group({ icon: Icon, label, count, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, fontWeight: 800, color: ink[300], letterSpacing: '0.10em' }}>
        <Icon size={13} strokeWidth={2.4} /> {label.toUpperCase()} <span style={{ color: ink[100] }}>· {count}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: '6px 14px', fontSize: 14, color: ink[300], fontStyle: 'italic' }}>{children}</div>;
}
