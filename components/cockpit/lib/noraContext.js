// Build a COMPACT grounding-context object for Nora's chat from useLiveData().
//
// Goal: give Nora enough live signal to answer specific questions (who's
// waiting, what's on today, top deals) without dumping everything. Kept well
// under ~4KB — we summarize and truncate aggressively. Never fabricate: only
// fields that exist in the live data are included.

const MAX_THREADS = 15;
const MAX_EVENTS = 12;
const MAX_BRIEF_SECTIONS = 6;
const MAX_DEALS = 10;
const PREVIEW_CAP = 80;

/**
 * @param {string | null | undefined} s
 * @param {number} cap
 * @returns {string}
 */
function clip(s, cap = PREVIEW_CAP) {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  return t.length > cap ? `${t.slice(0, cap - 1)}…` : t;
}

/**
 * Build the compact context passed to POST /api/nora/chat.
 * @param {ReturnType<typeof import('../live/CockpitLiveData.jsx').useLiveData>} live
 * @returns {object}
 */
export function buildNoraContext(live) {
  const data = live && typeof live === 'object' ? live : {};

  const allThreads = Array.isArray(data.threads) ? data.threads : [];
  // Surface the most actionable threads first: unread, then most recent.
  const threads = [...allThreads]
    .sort((a, b) => {
      const ua = a.unread || 0;
      const ub = b.unread || 0;
      if (ub !== ua) return ub - ua;
      return new Date(b.lastTs || 0) - new Date(a.lastTs || 0);
    })
    .slice(0, MAX_THREADS)
    .map((t) => ({
      name: clip(t.contactName, 40),
      channel: t.channel,
      ...(t.isInvestor ? { investor: true } : {}),
      ...(t.unread ? { unread: t.unread } : {}),
      preview: clip(t.preview),
    }));

  const allEvents = Array.isArray(data.events) ? data.events : [];
  const events = allEvents.slice(0, MAX_EVENTS).map((e) => ({
    time: e.time,
    title: clip(e.title, 70),
    ...(e.type === 'zoom' ? { zoom: true } : {}),
  }));

  const brief = data.morningBrief && typeof data.morningBrief === 'object'
    ? {
        ...(data.morningBrief.apex
          ? {
              apex: {
                title: clip(data.morningBrief.apex.title, 70),
                body: clip(data.morningBrief.apex.body, 120),
              },
            }
          : {}),
        sections: (Array.isArray(data.morningBrief.sections)
          ? data.morningBrief.sections
          : []
        )
          .slice(0, MAX_BRIEF_SECTIONS)
          .map((s) => ({
            title: s.title,
            items: (Array.isArray(s.items) ? s.items : [])
              .slice(0, 5)
              .map((i) => clip(`${i.headline || ''} ${i.summary || ''}`, 90)),
          })),
        ...(typeof data.morningBrief.unreadTotal === 'number'
          ? { unreadTotal: data.morningBrief.unreadTotal }
          : {}),
      }
    : null;

  // Nora's open cards (work she's surfaced to Gideon) — names + asks only.
  const noraCards = Array.isArray(data.noraDesk?.noraToYou)
    ? data.noraDesk.noraToYou.slice(0, 8).map((c) => ({
        who: clip(c.who, 40),
        ...(c.urgent ? { urgent: true } : {}),
        ask: clip(c.ask, 60),
      }))
    : [];

  // Pipedrive pipeline — compact: totals + top deals by value. If Pipedrive
  // isn't configured we say so explicitly so Nora answers "CRM not connected"
  // instead of hallucinating. Omitted entirely when the fetch failed/never ran.
  const dealsSrc = data.deals && typeof data.deals === 'object' ? data.deals : null;
  let deals = null;
  if (dealsSrc?.status === 'setup_required') {
    deals = { status: 'setup_required' };
  } else if (Array.isArray(dealsSrc?.deals)) {
    deals = {
      count: dealsSrc.totals?.count ?? dealsSrc.deals.length,
      totalByCurrency: dealsSrc.totals?.byCurrency || {},
      top: dealsSrc.deals.slice(0, MAX_DEALS).map((d) => ({
        title: clip(d.title, 60),
        value: d.value,
        currency: d.currency,
        stage: clip(d.stageName || '', 30),
        ...(d.org ? { org: clip(d.org, 40) } : {}),
      })),
    };
  }

  return {
    today: data.today || null,
    threads,
    events,
    brief,
    noraCards,
    ...(deals ? { deals } : {}),
  };
}
