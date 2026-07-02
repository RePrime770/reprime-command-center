'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// useDeckData — the deck-side data hook (architecture §4). Defensive fetch of
// a RouteEnvelope endpoint ({ ok, data?, error?, status? } — lib/domains/
// status.ts) with optional visibility-gated polling. Decks poll independently
// and NEVER join the Flight Deck's 60s CockpitLiveData poll — zero added load
// on the kiosk.

const INITIAL_STATE = { loading: true, data: null, error: null, status: null };

/**
 * @template T
 * @param {string} endpoint            same-origin API route returning a RouteEnvelope
 * @param {{ refreshMs?: number }} [opts]  optional polling interval; omitted = fetch once
 * @returns {{
 *   loading: boolean,
 *   data: T | null,
 *   error: string | null,
 *   status: import('../../lib/domains/status').ModuleStatus | null,
 *   refresh: () => Promise<void>,
 * }}
 */
export default function useDeckData(endpoint, { refreshMs } = {}) {
  const [state, setState] = useState(INITIAL_STATE);
  // Monotonic sequence — stale in-flight responses (slow fetch overtaken by a
  // manual refresh, or resolving after unmount) are dropped, never applied.
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      // Same-origin credentialed fetch: /cockpit/* is Supabase-session-gated
      // by proxy.ts; the cookie rides along, no tokens in the client
      // (same contract as CockpitLiveData's fetchJsonSafe).
      const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (seq !== seqRef.current) return;

      if (!body || typeof body !== 'object') {
        // Non-envelope response (proxy redirect, empty body, HTML error page).
        setState((prev) => ({
          loading: false,
          data: prev.data, // keep last-good data over a transient bad response
          error: res.ok ? 'bad_envelope' : `http_${res.status}`,
          status: null,
        }));
        return;
      }

      if (body.ok === true) {
        setState({
          loading: false,
          data: body.data !== undefined ? body.data : null,
          error: null,
          status: body.status || null,
        });
        return;
      }

      // ok:false — a ModuleStatus (setup_required / migration_required) and/or
      // a stable error code from safeError. Never surface raw messages.
      setState({
        loading: false,
        data: null,
        error: typeof body.error === 'string' ? body.error : null,
        status: body.status || null,
      });
    } catch {
      if (seq !== seqRef.current) return;
      setState((prev) => ({
        loading: false,
        data: prev.data, // network blip — keep last-good data
        error: 'network_error',
        status: prev.status,
      }));
    }
  }, [endpoint]);

  useEffect(() => {
    const hasPoll = typeof refreshMs === 'number' && refreshMs > 0;

    // Visibility-gated polling — same pattern as CockpitLiveData: hidden tab
    // burns no API calls; on visibilitychange → visible we refresh immediately
    // so the user lands on fresh data, not interval-stale data.
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      load();
    };
    tick();

    if (!hasPoll) {
      return () => {
        seqRef.current += 1; // invalidate any in-flight response after unmount
      };
    }

    const interval = setInterval(tick, refreshMs);
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) tick();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      seqRef.current += 1;
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [load, refreshMs]);

  return {
    loading: state.loading,
    data: state.data,
    error: state.error,
    status: state.status,
    refresh: load,
  };
}
