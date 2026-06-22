// Pure adapters mapping LIVE API shapes -> the exact cockpit data shapes.
// Target shapes are defined by the static mock data files:
//   - ../data/threads.js       (thread row shape)
//   - ../data/calendar.js      ({ today, events } shape)
//   - ../data/morningBrief.js  (morningBrief object shape)
//
// Rules:
//   - Never fabricate values. Adapt real fields; omit what has no live source.
//   - Defensive: tolerate array vs { threads } / { events } envelopes upstream
//     (the provider normalizes envelopes; these functions assume arrays/objects).

const HEBREW_RE = /[א-ת]/; // /[א-ת]/

/**
 * Detect language from free text. Hebrew chars -> 'he', else 'en'.
 * @param {string | null | undefined} text
 * @returns {'he' | 'en'}
 */
function detectLanguage(text) {
  return text && HEBREW_RE.test(text) ? 'he' : 'en';
}

/**
 * Map a live whatsapp_threads row -> cockpit thread shape.
 * Live row keys (verified against /api/whatsapp/threads):
 *   { panel, channel_type, phone, contact_name, is_group, jid,
 *     last_message_at, last_message_preview, unread_count,
 *     pipedrive_contact_id, is_investor }
 * @param {Record<string, unknown>} row
 */
function adaptThreadRow(row) {
  const preview = typeof row.last_message_preview === 'string' ? row.last_message_preview : '';
  const panel = row.panel === '305' ? '305' : row.panel === '718' ? '718' : null;
  // Only the WhatsApp channel is wired live this pass; map panel -> channel key.
  const channel = panel === '305' ? '305-WA' : panel === '718' ? '718-WA' : '305-WA';
  return {
    // phone is the stable key across reloads (the route dedups on panel:phone)
    id: row.phone || row.jid || `${row.panel}:${row.contact_name}`,
    channel,
    contactId: row.pipedrive_contact_id ?? null,
    contactName: row.contact_name || 'Unknown',
    language: detectLanguage(preview || row.contact_name),
    isInvestor: row.is_investor === true,
    lastTs: row.last_message_at || null,
    unread: typeof row.unread_count === 'number' ? row.unread_count : 0,
    preview,
    messages: [], // loaded on demand — see provider note. Empty = graceful state.
    noraBlock: null, // no live equivalent yet
  };
}

/**
 * Adapt the two panel thread lists into the unified cockpit thread array.
 * @param {Array<Record<string, unknown>>} rows305
 * @param {Array<Record<string, unknown>>} rows718
 * @returns {Array<object>}
 */
export function adaptThreads(rows305, rows718) {
  const a = Array.isArray(rows305) ? rows305 : [];
  const b = Array.isArray(rows718) ? rows718 : [];
  return [...a, ...b].map(adaptThreadRow);
}

/**
 * Derive an event time 'HH:MM' (24h, local) from an ISO start string.
 * @param {string} iso
 * @returns {string}
 */
function timeFromISO(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'all-day';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Derive duration in minutes from start/end ISO, default 30.
 * @param {string} startISO
 * @param {string | null | undefined} endISO
 * @returns {number}
 */
function durationMinutes(startISO, endISO) {
  if (!endISO) return 30;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 30;
  return Math.round((e - s) / 60000);
}

/** YYYY-MM-DD for "now" in local time. */
function todayLocalDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adapt live calendar events -> { today, events } matching data/calendar.js.
 * Live event shape: { id, startTime, endTime?, title, location?, hangoutLink? }
 * @param {Array<Record<string, unknown>>} liveEvents
 * @returns {{ today: string, events: Array<object> }}
 */
export function adaptCalendar(liveEvents) {
  const today = todayLocalDate();
  const list = Array.isArray(liveEvents) ? liveEvents : [];
  const events = list.map((e) => {
    const start = typeof e.startTime === 'string' ? e.startTime : '';
    const title = typeof e.title === 'string' ? e.title : '';
    const hasZoom =
      Boolean(e.hangoutLink) ||
      Boolean(e.zoomLink) ||
      /zoom/i.test(title);
    return {
      id: e.id || `${start}-${title}`,
      date: today,
      time: start ? timeFromISO(start) : 'all-day',
      duration: durationMinutes(start, e.endTime),
      title,
      type: hasZoom ? 'zoom' : 'standard',
      location: e.location || (hasZoom ? 'zoom' : ''),
    };
  });
  return { today, events };
}

/**
 * Build a Morning Brief object from the live /api/briefing/today payload.
 * Only populates sections that have real live data; omits the rest rather
 * than fabricating. Apex is the top active deal, else the next meeting.
 * @param {Record<string, any>} live
 * @returns {object}
 */
export function adaptBrief(live) {
  const safe = live && typeof live === 'object' ? live : {};
  const meetings = safe.meetings?.items ?? [];
  const deals = Array.isArray(safe.active_deals) ? safe.active_deals : [];
  const investors = Array.isArray(safe.recent_investors) ? safe.recent_investors : [];
  const followups = Array.isArray(safe.pending_followups) ? safe.pending_followups : [];
  const unreadTotal = safe.unread?.total ?? 0;

  const sections = [];

  if (deals.length > 0) {
    sections.push({
      id: 'sec-deals',
      title: 'Active Deals',
      items: deals.slice(0, 5).map((d, i) => ({
        id: `item-deal-${d.id ?? i}`,
        tier: null,
        headline: d.title || 'Untitled deal',
        summary: [d.stage, formatMoney(d.value, d.currency)].filter(Boolean).join(' · '),
      })),
    });
  }

  if (investors.length > 0) {
    sections.push({
      id: 'sec-investors',
      title: 'Investor Pulse',
      items: investors.slice(0, 5).map((t, i) => ({
        id: `item-inv-${t.id ?? i}`,
        tier: null,
        headline: t.contact_name || t.phone || 'Investor',
        summary: t.last_message_preview || 'Recent activity',
      })),
    });
  }

  if (meetings.length > 0) {
    sections.push({
      id: 'sec-calendar',
      title: 'Today',
      items: meetings.slice(0, 6).map((m, i) => ({
        id: `item-mtg-${m.id ?? i}`,
        tier: null,
        headline: `${m.startTime ? timeFromISO(m.startTime) : ''} — ${m.title || 'Meeting'}`.trim(),
        summary: m.zoomLink ? 'Zoom link available' : '',
      })),
    });
  }

  if (followups.length > 0) {
    sections.push({
      id: 'sec-tasks',
      title: 'Pending Follow-ups',
      items: followups.slice(0, 5).map((t, i) => ({
        id: `item-fu-${t.id ?? i}`,
        tier: null,
        headline: t.contact_name || t.phone || 'Follow-up',
        summary: t.last_message_preview || `${t.unread_count ?? 0} unread`,
      })),
    });
  }

  // Apex: top active deal, else next meeting, else a neutral unread summary.
  let apex = null;
  if (deals.length > 0) {
    const d = deals[0];
    apex = {
      id: `apex-deal-${d.id ?? 0}`,
      tier: null,
      title: d.title || 'Top active deal',
      body: [d.stage, formatMoney(d.value, d.currency)].filter(Boolean).join(' · ') || 'Open deal',
      actions: ['Open deal'],
    };
  } else if (meetings.length > 0) {
    const m = safe.meetings?.nextUp ?? meetings[0];
    apex = {
      id: `apex-mtg-${m.id ?? 0}`,
      tier: null,
      title: m.title || 'Next meeting',
      body: m.startTime ? `Starts ${timeFromISO(m.startTime)}` : 'Scheduled today',
      actions: m.zoomLink ? ['Join Zoom'] : [],
    };
  }

  return {
    date: safe.date || todayLocalDate(),
    greeting: 'Boker tov, Gideon.',
    apex,
    sections,
    // Surface that some live sources were degraded so the UI is honest.
    degraded: safe.degraded === true,
    unreadTotal,
  };
}

/**
 * @param {number | undefined} value
 * @param {string | undefined} currency
 * @returns {string}
 */
function formatMoney(value, currency) {
  if (typeof value !== 'number' || value <= 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

/**
 * Build threadsByChannel / findThread helpers over a LIVE adapted threads array.
 * Mirrors the semantics in data/threads.js exactly.
 * @param {Array<object>} threads
 */
export function makeThreadHelpers(threads) {
  const list = Array.isArray(threads) ? threads : [];
  const threadsByChannel = (channelFamily) => {
    const filter = (t) => {
      if (channelFamily === '305') return t.channel.startsWith('305-') && !t.staffTag;
      if (channelFamily === '718') return t.channel.startsWith('718-') && !t.staffTag;
      if (channelFamily === 'investors') return t.isInvestor;
      if (channelFamily === 'staff') return t.staffTag === true;
      return true;
    };
    return [...list]
      .filter(filter)
      .sort((a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0));
  };
  const findThread = (id) => list.find((t) => t.id === id);
  return { threadsByChannel, findThread };
}
