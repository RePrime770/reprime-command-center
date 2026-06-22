'use client';

// Client-side LIVE data provider for the cockpit.
//
// "Everything should be live, nothing should be stale." — live is the default
// path. The static mock data is exposed ONLY as a graceful fallback while the
// first fetch is in flight or after an error, so the cockpit never renders
// blank/broken. Once live data arrives, the context exposes live.
//
// Auth: /cockpit is Supabase-gated (g@reprime.com). Same-origin fetch('/api/...')
// carries the session cookie automatically — no tokens in the client.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

import {
  threads as mockThreads,
  threadsByChannel as mockThreadsByChannel,
  findThread as mockFindThread,
} from '../data/threads.js';
import { events as mockEvents, today as mockToday } from '../data/calendar.js';
import { morningBrief as mockMorningBrief } from '../data/morningBrief.js';
import { noraToYou as mockNoraToYou, youToNora as mockYouToNora } from '../data/noraDesk.js';
import { emails as mockEmails } from '../data/emails.js';

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

// Static fallback Nora's Desk (data/noraDesk.js shape) for use until the first
// successful live fetch. youToNora has no live source — always static.
const FALLBACK_NORA_DESK = {
  noraToYou: mockNoraToYou,
  youToNora: mockYouToNora,
};

// Static fallback value — used until the first successful live fetch.
const FALLBACK_VALUE = {
  threads: mockThreads,
  threadsByChannel: mockThreadsByChannel,
  findThread: mockFindThread,
  events: mockEvents,
  today: mockToday,
  morningBrief: mockMorningBrief,
  noraDesk: FALLBACK_NORA_DESK,
  emails: mockEmails,
  loading: true,
  error: null,
  lastUpdated: null,
  isLive: false,
};

export function CockpitLiveDataProvider({ children }) {
  const [value, setValue] = useState(FALLBACK_VALUE);
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
    // keep the static fallback rather than wiping the screen.
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

    const liveThreads = adaptThreads(rows305, rows718);
    const { threadsByChannel, findThread } = makeThreadHelpers(liveThreads);
    const { today, events } = adaptCalendar(asEventRows(calPayload));
    const morningBrief = briefPayload ? adaptBrief(briefPayload) : mockMorningBrief;

    // Nora's Desk: live cards from bucket + asks. youToNora has no live source,
    // so keep the static command log. If neither live source returned, fall
    // back to the full static desk rather than showing an empty box.
    let noraDesk = FALLBACK_NORA_DESK;
    if (bucketPayload || asksPayload) {
      const { noraToYou } = adaptNoraDesk(bucketPayload, asksPayload);
      noraDesk = {
        noraToYou: noraToYou.length > 0 ? noraToYou : mockNoraToYou,
        youToNora: mockYouToNora,
      };
    }

    // Email triage: live scored inbox. Fall back to static while unavailable.
    let emails = mockEmails;
    if (emailPayload) {
      const live = adaptEmails(emailPayload);
      emails = live.length > 0 ? live : mockEmails;
    }

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
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      isLive: true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) load();
    };
    tick();
    const interval = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  return (
    <CockpitLiveDataContext.Provider value={value}>
      {children}
    </CockpitLiveDataContext.Provider>
  );
}

/**
 * Read live cockpit data. Falls back to static mock values when used outside a
 * provider (defensive) or before the first live fetch resolves.
 */
export function useLiveData() {
  const ctx = useContext(CockpitLiveDataContext);
  return ctx ?? FALLBACK_VALUE;
}
