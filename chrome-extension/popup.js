'use strict';

const $ = (id) => document.getElementById(id);

// ── View routing ──────────────────────────────────────────────────────────────

function showView(id) {
  for (const v of ['v-check', 'v-setup', 'v-status']) {
    const el = $(v);
    if (el) el.style.display = v === id ? 'block' : 'none';
  }
}

function setBadge(text, active) {
  const b = $('hdr-badge');
  b.textContent = text;
  b.style.background = active ? 'rgba(255,204,51,0.2)' : 'rgba(255,204,51,0.08)';
  b.style.color = active ? '#FFCC33' : 'rgba(255,204,51,0.5)';
}

// ── Boot ──────────────────────────────────────────────────────────────────────

(async () => {
  const c = await chrome.storage.local.get([
    'bbUrl', 'callSecret', 'enabled',
    'lastSyncAt', 'totalSynced', 'lastError',
  ]);

  if (!c.bbUrl || !c.callSecret) {
    showView('v-check');
    setBadge('SETUP', false);
    initChecklist();
  } else {
    showView('v-status');
    setBadge(c.enabled ? 'ACTIVE' : 'PAUSED', !!c.enabled);
    renderStatus(c);
    initStatus();
  }
})();

// ── VIEW 1 — Checklist ────────────────────────────────────────────────────────

function initChecklist() {
  const checks = document.querySelectorAll('.pre-check');
  const btn = $('btn-to-setup');

  checks.forEach((cb) => {
    cb.addEventListener('change', () => {
      btn.disabled = ![...checks].every((c) => c.checked);
    });
  });

  btn.addEventListener('click', () => {
    $('f-bbUrl').value = 'http://localhost:1234';
    $('f-dashUrl').value = 'https://project-7e87w.vercel.app';
    $('setup-err').style.display = 'none';
    showView('v-setup');
    setBadge('SETUP', false);
  });
}

// ── VIEW 2 — Setup form ───────────────────────────────────────────────────────

$('btn-back-check').addEventListener('click', async () => {
  // If already configured, go back to status; otherwise back to checklist
  const { bbUrl, callSecret } = await chrome.storage.local.get(['bbUrl', 'callSecret']);
  if (bbUrl && callSecret) {
    const c = await chrome.storage.local.get([
      'enabled', 'lastSyncAt', 'totalSynced', 'lastError',
    ]);
    showView('v-status');
    setBadge(c.enabled ? 'ACTIVE' : 'PAUSED', !!c.enabled);
    renderStatus(c);
    initStatus();
  } else {
    showView('v-check');
    setBadge('SETUP', false);
  }
});

$('btn-save').addEventListener('click', async () => {
  const bbUrl     = $('f-bbUrl').value.trim();
  const callSecret = $('f-secret').value.trim();
  const errEl     = $('setup-err');

  if (!bbUrl) {
    errEl.textContent = 'Server URL is required.';
    errEl.style.display = 'block';
    return;
  }
  if (!callSecret) {
    errEl.textContent = 'BB_CALL_SECRET is required.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  $('btn-save').disabled = true;
  $('btn-save').textContent = 'Saving…';

  await chrome.storage.local.set({
    bbUrl,
    bbPassword : $('f-bbPw').value,
    dashUrl    : $('f-dashUrl').value.trim() || 'https://project-7e87w.vercel.app',
    callSecret,
    panel      : $('f-panel').value,
    enabled    : true,
    syncedIds  : [],
    totalSynced: 0,
    lastError  : null,
  });

  // Kick off first sync immediately
  chrome.runtime.sendMessage({ type: 'sync-now' });

  const c = await chrome.storage.local.get([
    'enabled', 'lastSyncAt', 'totalSynced', 'lastError',
  ]);
  showView('v-status');
  setBadge('ACTIVE', true);
  renderStatus(c);
  initStatus();

  $('btn-save').disabled = false;
  $('btn-save').textContent = 'Save & Enable';
});

// ── VIEW 3 — Status ───────────────────────────────────────────────────────────

let statusInitDone = false;

function initStatus() {
  if (statusInitDone) return; // avoid stacking listeners
  statusInitDone = true;

  // Enable / disable toggle
  $('chk-enabled').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    if (e.target.checked) chrome.runtime.sendMessage({ type: 'sync-now' });
    const c = await chrome.storage.local.get([
      'enabled', 'lastSyncAt', 'totalSynced', 'lastError',
    ]);
    setBadge(c.enabled ? 'ACTIVE' : 'PAUSED', !!c.enabled);
    renderStatus(c);
  });

  // Sync Now button
  $('btn-sync-now').addEventListener('click', () => {
    const btn = $('btn-sync-now');
    btn.disabled = true;
    btn.textContent = 'Syncing…';

    chrome.runtime.sendMessage({ type: 'sync-now' }, async () => {
      // Small delay so storage writes from background have settled
      await new Promise((r) => setTimeout(r, 800));
      const c = await chrome.storage.local.get([
        'enabled', 'lastSyncAt', 'totalSynced', 'lastError',
      ]);
      renderStatus(c);
      btn.disabled = false;
      btn.textContent = 'Sync Now';
    });
  });

  // Settings button → pre-fill form and show setup view
  $('btn-edit').addEventListener('click', async () => {
    const c = await chrome.storage.local.get([
      'bbUrl', 'bbPassword', 'dashUrl', 'callSecret', 'panel',
    ]);
    $('f-bbUrl').value    = c.bbUrl     || '';
    $('f-bbPw').value     = c.bbPassword || '';
    $('f-dashUrl').value  = c.dashUrl   || 'https://project-7e87w.vercel.app';
    $('f-secret').value   = c.callSecret || '';
    $('f-panel').value    = c.panel     || '718';
    $('setup-err').style.display = 'none';
    showView('v-setup');
    setBadge('SETUP', false);
  });

  // Auto-refresh stats every 15 s while popup is open
  setInterval(async () => {
    const c = await chrome.storage.local.get([
      'enabled', 'lastSyncAt', 'totalSynced', 'lastError',
    ]);
    renderStatus(c);
  }, 15_000);
}

function renderStatus(c) {
  const enabled    = !!c.enabled;
  const lastError  = c.lastError || null;
  const lastSyncAt = c.lastSyncAt || null;
  const total      = c.totalSynced ?? 0;

  // Toggle knob
  $('chk-enabled').checked = enabled;
  $('toggle-lbl').textContent = enabled ? 'ON' : 'OFF';

  // Status dot + label
  const dot    = $('dot');
  const label  = $('status-text');
  if (!enabled) {
    dot.className = 'dot dot-off';
    label.textContent = 'Paused';
  } else if (lastError) {
    dot.className = 'dot dot-err';
    label.textContent = 'Error';
  } else {
    dot.className = 'dot dot-ok';
    label.textContent = 'Active — polls every 2 min';
  }

  // Stats
  if (lastSyncAt) {
    const mins = Math.floor((Date.now() - lastSyncAt) / 60_000);
    $('stat-sync').innerHTML =
      `Last sync: <strong>${mins < 1 ? 'just now' : `${mins}m ago`}</strong>`;
  } else {
    $('stat-sync').textContent = 'Not synced yet';
  }
  $('stat-total').innerHTML = `Total synced: <strong>${total} call${total !== 1 ? 's' : ''}</strong>`;

  // Error message
  const errEl = $('error-msg');
  if (lastError) {
    errEl.textContent = lastError;
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
}
