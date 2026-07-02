'use client';

import { useEffect } from 'react';
import { parseCockpitParams } from '@/lib/cockpit/deep-links';

/**
 * Query-param → window-event bridge for Flight-Deck deep links.
 *
 * Deck pages link to '/cockpit?openThread=<id>' / '/cockpit?openEmail=<id>'
 * (built by lib/cockpit/deep-links.ts). On mount this reads
 * window.location.search, strips the params via history.replaceState (so a
 * refresh doesn't re-fire), then re-dispatches the cockpit's window
 * CustomEvent contracts:
 *
 *   - openEmail  → CustomEvent('cockpit:openEmail',  { detail: { id } })
 *     Existing listener: EmailPanel (same code path as a ⌘K palette row).
 *     EmailPanel keeps the id in state and resolves it against the live email
 *     list on every render, so dispatching before the emails have loaded is
 *     fine — the message opens as soon as its data arrives.
 *
 *   - openThread → CustomEvent('cockpit:openThread', { detail: { id } })
 *     FORWARD CONTRACT — no listener exists yet. Thread opening currently
 *     happens only through DemoContext state ('openChat' /
 *     'openInvestorChat'), which this bridge cannot reach: it mounts outside
 *     <DemoProvider> (inside components/cockpit/App.jsx). Thread deep links
 *     are inert until CommsPanel (or App-level chrome) adds
 *     window.addEventListener('cockpit:openThread', …) → set('openChat', id).
 *
 * Timing: CockpitClient renders a placeholder until after hydration, so the
 * panels (and their listeners) mount at least one effect tick after this
 * bridge. CustomEvents are not queued — a dispatch before the listener
 * registers is lost — so we re-dispatch on a short schedule (idempotent for
 * the listeners: EmailPanel just re-sets the same opened id) and give up
 * after ~5s. Known limit: we cannot detect whether an event was handled, so
 * if the user manually opens a different email/composer within that window a
 * late re-dispatch can override them; the schedule is front-loaded to keep
 * that window small.
 *
 * With no deep-link params present this renders null and does nothing —
 * /cockpit stays pixel-identical.
 */

// Front-loaded re-dispatch schedule (ms after mount). First fires immediately;
// later ones only cover unusually slow hydration/mount.
const DISPATCH_SCHEDULE_MS = [0, 250, 750, 1500, 3000, 5000];

function stripDeepLinkParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('openThread');
    url.searchParams.delete('openEmail');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  } catch (err) {
    // Non-fatal: worst case a refresh re-opens the same thread/email.
    console.error('[DeepLinkBridge] failed to strip deep-link params', err);
  }
}

export default function DeepLinkBridge() {
  useEffect(() => {
    const { openThread, openEmail } = parseCockpitParams(window.location.search);
    if (!openThread && !openEmail) return undefined;

    stripDeepLinkParams();

    const dispatchAll = () => {
      if (openEmail) {
        window.dispatchEvent(
          new CustomEvent('cockpit:openEmail', { detail: { id: openEmail } })
        );
      }
      if (openThread) {
        window.dispatchEvent(
          new CustomEvent('cockpit:openThread', { detail: { id: openThread } })
        );
      }
    };

    const timers = DISPATCH_SCHEDULE_MS.map((delay) =>
      setTimeout(dispatchAll, delay)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return null;
}
