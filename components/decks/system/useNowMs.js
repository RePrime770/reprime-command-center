'use client';

import { useEffect, useState } from 'react';

// useNowMs — mount-gated "now" for time-relative rendering (DeckClock
// pattern, DeckShell.jsx). Returns null until the component is mounted, so a
// statically prerendered deck page can never hydrate-mismatch on time text;
// then ticks so relative labels ("5 min ago") and overdue badges stay honest
// without a re-fetch.

const DEFAULT_TICK_MS = 30_000;

/**
 * @param {number} [tickMs] re-render cadence once mounted (default 30s)
 * @returns {number | null} Date.now() after mount, null during SSR/first paint
 */
export default function useNowMs(tickMs = DEFAULT_TICK_MS) {
  const [nowMs, setNowMs] = useState(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return nowMs;
}
