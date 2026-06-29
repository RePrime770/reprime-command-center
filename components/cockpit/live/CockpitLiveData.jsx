'use client';

// Client-side LIVE data provider for the cockpit.
//
// "Everything should be live, nothing should be stale." — live is the ONLY
// data path. There is NO mock-data fallback: when a live source is empty or
// unavailable, the cockpit renders an empty/quiet state, never stale mock.
//
// Auth: /cockpit is Supabase-gated (g@reprime.com). Same-origin fetch('/api/...')
// carries the session cookie automatically — no tokens in the client.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';

import {
  adaptThreads,
  adaptCalendar,
  adaptBrief,
  adaptNoraDesk,
  adaptEmails,
  makeThreadHelpers,
} from './adapters.js';

const REFRESH_MS = 60_000;

const CockpitLiveDataContext = createContext(null);

/**
 * Fetch JSON defensively. Returns null on any failure (non-OK, network, parse).
 * Never throws.
 * @param {string} url
 * @returns {Promise<any | null>}
 */
async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Normalize a threads response: array | { threads: [...] } -> array.
 * @param {any} payload
 * @returns {Array<object>}
 */
function asThreadRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.threads)) return payload.threads;
  return [];
}

/**
 * Normalize a calendar response: array | { events: [...] } -> array.
 * @param {any} payload
 * @returns {Array<object>}
 */
function asEventRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.events)) return payload.events;
  return [];
}

// Empty initial value — NO mock. Used before the first live fetch resolves and
// as the out-of-provider default. Empty live data renders as empty/quiet state.
const EMPTY_VALUE = {
  threads: [],
  threadsByChannel: () => [],
  findThread: () => undefined,
  refresh: () => {},
  events: [],
  today: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })(),
  morningBrief: { date: '', greeting: 'Boker tov, Gideon.', apex: null, sections: [], degraded: false, unreadTotal: 0 },
  noraDesk: { noraToYou: [], youToNora: [] },
  emails: [],
  emailSecondary: null,
  loading: true,
  error: null,
  lastUpdated: null,
  isLive: false,
};

export function CockpitLiveDataProvider({ children }) {
  const [value, setValue] = useState(EMPTY_VALUE);
  const hasLiveRef = useRef(false);

  const load = useCallback(async () => {
    const [t305, t718, cal, brief, bucket, asks, emailTriage] =
      await Promise.allSettled([
        fetchJsonSafe('/api/whatsapp/threads?panel=305'),
        fetchJsonSafe('/api/whatsapp/threads?panel=718'),
        fetchJsonSafe('/api/calendar/today'),
        fetchJsonSafe('/api/briefing/today'),
        fetchJsonSafe('/api/bucket?status=open'),
        fetchJsonSafe('/api/secretary/asks'),
        fetchJsonSafe('/api/email/triage'),
      ]);

    const rows305 = t305.status === 'fulfilled' ? asThreadRows(t305.value) : [];
    const rows718 = t718.status === 'fulfilled' ? asThreadRows(t718.value) : [];
    const calPayload = cal.status === 'fulfilled' ? cal.value : null;
    const briefPayload = brief.status === 'fulfilled' ? brief.value : null;
    const bucketPayload = bucket.status === 'fulfilled' ? bucket.value : null;
    const asksPayload = asks.status === 'fulfilled' ? asks.value : null;
    const emailPayload = emailTriage.status === 'fulfilled' ? emailTriage.value : null;

    // If every source came back null/empty AND we have never had live data,
    // leave the EMPTY data in place and flag live as unavailable — never mock.
    const everySourceFailed =
      t305.status !== 'fulfilled' && t718.status !== 'fulfilled' &&
      !calPayload && !briefPayload && !bucketPayload && !asksPayload &&
      !emailPayload;

    if (everySourceFailed && !hasLiveRef.current) {
      setValue((prev) => ({
        ...prev,
        loading: false,
        error: 'live_unavailable',
      }));
      return;
    }

    // Pure live → adapt. Empty live stays empty; we never substitute mock.
    const liveThreads = adaptThreads(rows305, rows718);
    const { threadsByChannel, findThread } = makeThreadHelpers(liveThreads);
    const { today, events } = adaptCalendar(asEventRows(calPayload));
    const morningBrief = briefPayload ? adaptBrief(briefPayload) : EMPTY_VALUE.morningBrief;

    // Nora's Desk: live cards from bucket + asks (even when empty). youToNora
    // has no live source yet, so it stays empty — never mock.
    const { noraToYou } = adaptNoraDesk(bucketPayload, asksPayload);
    const noraDesk = { noraToYou, youToNora: [] };

    // Email triage: live scored inbox, empty when empty — never mock.
    const emails = emailPayload ? adaptEmails(emailPayload) : [];
    // Secondary-account setup status (e.g. GOOGLE_REFRESH_TOKEN_2 unset →
    // EmailPanel renders a "Setup required" tab). null if the route omits it.
    const emailSecondary =
      emailPayload && typeof emailPayload === 'object' && 'secondary' in emailPayload
        ? emailPayload.secondary
        : null;

    hasLiveRef.current = true;
    setValue({
      threads: liveThreads,
      threadsByChannel,
      findThread,
      events,
      today,
      morningBrief,
      noraDesk,
      emails,
      emailSecondary,
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      isLive: true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Visibility-gated polling — when the tab is hidden we don't burn API
    // calls or re-render the tree. On visibilitychange → visible we refresh
    // immediately so the user lands on fresh data, not 60s-stale data.
    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      load();
    };
    tick();
    const interval = setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) tick();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [load]);

  // Stable context value — without this memo, the spread mints a new object
  // on every render, invalidating every useLiveData() consumer ~60s/tick AND
  // on every descendant keystroke. See docs/PERFORMANCE_AUDIT.md finding #1.
  const ctxValue = useMemo(() => ({ ...value, refresh: load }), [value, load]);

  return (
    <CockpitLiveDataContext.Provider value={ctxValue}>
      {children}
    </CockpitLiveDataContext.Provider>
  );
}

/**
 * Read live cockpit data. Returns an EMPTY value (never mock) when used outside
 * a provider (defensive) or before the first live fetch resolves.
 */
export function useLiveData() {
  const ctx = useContext(CockpitLiveDataContext);
  return ctx ?? EMPTY_VALUE;
}
