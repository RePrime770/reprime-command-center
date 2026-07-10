'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// useHealth — client fetch of GET /api/health for the Settings deck.
// /api/health is PLAIN JSON (env booleans + integrations[]), NOT a
// RouteEnvelope, so it is fetched directly instead of through useDeckData.
// Same defensive contract though: same-origin credentials, no-store, stable
// snake_case error codes only (never raw messages), visibility-gated polling,
// last-good data kept across transient failures.

const REFRESH_MS = 60 * 1000;
const INITIAL_STATE = { loading: true, health: null, error: null };

/**
 * @returns {{
 *   loading: boolean,
 *   health: import('../../../lib/decks/settings-view').HealthSnapshot | null,
 *   error: string | null,
 *   refresh: () => Promise<void>,
 * }}
 */
export default function useHealth() {
  const [state, setState] = useState(INITIAL_STATE);
  // Monotonic sequence — stale in-flight responses are dropped, never applied
  // (same guard as useDeckData).
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' });
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (seq !== seqRef.current) return;

      if (!res.ok) {
        setState((prev) => ({
          loading: false,
          health: prev.health, // keep last-good snapshot
          error: `http_${res.status}`,
        }));
        return;
      }

      if (!body || typeof body !== 'object') {
        setState((prev) => ({ loading: false, health: prev.health, error: 'bad_response' }));
        return;
      }

      setState({ loading: false, health: body, error: null });
    } catch {
      if (seq !== seqRef.current) return;
      setState((prev) => ({ loading: false, health: prev.health, error: 'network_error' }));
    }
  }, []);

  useEffect(() => {
    // Visibility-gated polling — hidden tab burns no API calls; returning to
    // the tab refreshes immediately (same pattern as useDeckData).
    const tick = () => {
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
      seqRef.current += 1; // invalidate in-flight responses after unmount
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [load]);

  return { loading: state.loading, health: state.health, error: state.error, refresh: load };
}
