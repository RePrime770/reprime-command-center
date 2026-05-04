'use strict';

// ── Alarm setup ───────────────────────────────────────────────────────────────

const ALARM = 'reprime-call-sync';
const POLL_MINS = 2;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(ALARM, { periodInMinutes: POLL_MINS });
  syncCalls();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(ALARM, { periodInMinutes: POLL_MINS });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) syncCalls();
});

// ── Message handler (popup can trigger an immediate sync) ─────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'sync-now') {
    syncCalls()
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }
});

// ── Core sync ─────────────────────────────────────────────────────────────────

async function syncCalls() {
  const c = await chrome.storage.local.get([
    'bbUrl', 'bbPassword', 'dashUrl', 'callSecret',
    'panel', 'enabled', 'syncedIds', 'totalSynced',
  ]);

  if (!c.enabled || !c.bbUrl || !c.callSecret) return;

  const bbBase   = c.bbUrl.replace(/\/$/, '');
  const dashBase = (c.dashUrl || 'https://project-7e87w.vercel.app').replace(/\/$/, '');
  const panel    = c.panel || '718';
  const ourNum   = panel === '718' ? '7185505500' : '3057784861';

  // ── 1. Fetch recent calls from BlueBubbles ──────────────────────────────────
  let calls = [];
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (c.bbPassword) headers['x-password'] = c.bbPassword;

    const res = await fetch(`${bbBase}/api/v1/call?limit=100&sort=DESC`, { headers });

    if (!res.ok) {
      throw new Error(
        `BlueBubbles returned ${res.status}. ` +
        (res.status === 404
          ? 'The /api/v1/call endpoint was not found — make sure BlueBubbles Server v2026+ is running.'
          : res.statusText)
      );
    }

    const json = await res.json();
    // BlueBubbles wraps results in { data: [...] } or returns a bare array
    calls = Array.isArray(json)
      ? json
      : (json.data ?? json.calls ?? json.results ?? []);

    if (!Array.isArray(calls)) {
      throw new Error('Unexpected response format from BlueBubbles — expected an array of calls.');
    }
  } catch (err) {
    await chrome.storage.local.set({
      lastError: err.message,
      lastSyncAt: Date.now(),
    });
    return;
  }

  // ── 2. Deduplicate and forward new calls ────────────────────────────────────
  const synced = new Set(c.syncedIds || []);
  let added = 0;

  for (const call of calls) {
    // Try every field name BlueBubbles might use for a unique call ID
    const id = String(
      call.id ?? call.rowid ?? call.guid ?? call.callUUID ?? call.ROWID ?? ''
    );
    if (!id || synced.has(id)) continue;

    const isOut =
      call.originate === 1 ||
      call.originated === 1 ||
      call.direction === 'outbound' ||
      call.isFromMe === true ||
      call.isOutgoing === true;

    const remote = String(
      call.address ??
      call.phone ??
      call.handle?.address ??
      call.handle ??
      ''
    );

    // BlueBubbles may send date as:
    //   CoreData epoch  (seconds since 2001-01-01, ~10 digits)
    //   Unix seconds    (~10 digits — same range, so we check context)
    //   Unix ms         (~13 digits)
    //   Unix µs         (~16 digits)
    //   Unix ns         (~19 digits)
    let startedAt = null;
    const rawDate = call.date ?? call.dateCreated ?? call.ZDATE ?? null;
    if (rawDate != null) {
      const n = Number(rawDate);
      let ms;
      if      (n > 1e15) ms = Math.floor(n / 1e6);   // nanoseconds
      else if (n > 1e12) ms = Math.floor(n / 1e3);   // microseconds
      else if (n > 2e12) ms = n;                       // unix ms (far future guard)
      else if (n > 1e9)  ms = n > 1e10 ? n : n * 1000; // unix s or ms
      else               ms = (n + 978307200) * 1000; // CoreData (secs since 2001-01-01)
      startedAt = new Date(ms).toISOString();
    }

    const duration =
      call.duration != null ? Math.round(Number(call.duration)) : null;

    const answered =
      call.answered === 1 ||
      call.answered === true ||
      call.status === 'completed' ||
      call.callStatus === 'completed';

    const payload = {
      event           : 'call.completed',
      call_id         : id,
      panel,
      direction       : isOut ? 'outbound' : 'inbound',
      from_phone      : isOut ? `+1${ourNum}` : remote,
      to_phone        : isOut ? remote        : `+1${ourNum}`,
      started_at      : startedAt,
      duration_seconds: duration,
      status          : answered ? 'completed' : 'missed',
    };

    try {
      const res = await fetch(`${dashBase}/api/phone/call-event`, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': `Bearer ${c.callSecret}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        synced.add(id);
        added++;
      }
    } catch (_) {
      // Network hiccup — this call will be retried next poll cycle
    }
  }

  // ── 3. Persist results ──────────────────────────────────────────────────────
  await chrome.storage.local.set({
    syncedIds  : [...synced].slice(-1000), // cap at 1 000 to avoid unbounded growth
    lastSyncAt : Date.now(),
    totalSynced: (c.totalSynced || 0) + added,
    lastError  : null,
  });
}
