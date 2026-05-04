'use strict';

const $ = (id) => document.getElementById(id);

function showView(id) {
  for (const v of ['v-creds', 'v-progress', 'v-done']) {
    const el = $(v);
    if (el) el.style.display = v === id ? 'block' : 'none';
  }
}

// ── Run button ────────────────────────────────────────────────────────────────

$('btn-run').addEventListener('click', async () => {
  const supa   = $('f-supa').value.trim();
  const vercel = $('f-vercel').value.trim();
  const quo    = $('f-quo').value.trim();
  const errEl  = $('creds-err');

  if (!supa || !vercel || !quo) {
    errEl.textContent = 'All three fields are required before running setup.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  showView('v-progress');

  // Tell background to run setup; receive step-by-step updates via storage
  chrome.runtime.sendMessage(
    { type: 'run-setup', supa, vercel, quo },
    (result) => {
      if (chrome.runtime.lastError) {
        showView('v-creds');
        $('creds-err').textContent = chrome.runtime.lastError.message;
        $('creds-err').style.display = 'block';
        return;
      }
      showResults(result);
    }
  );

  // Poll for progress updates while background runs
  const pollId = setInterval(async () => {
    const s = await chrome.storage.local.get('setupProgress');
    if (s.setupProgress) renderProgress(s.setupProgress);
  }, 300);

  // Clean up poll once result arrives (done in callback above)
  window._pollId = pollId;
});

// ── Progress rendering ────────────────────────────────────────────────────────

function renderProgress(steps) {
  for (const [key, state] of Object.entries(steps)) {
    const iconEl  = $(`s-${key}-icon`);
    const detailEl = $(`s-${key}-detail`);
    if (!iconEl) continue;

    iconEl.className = `step-icon ${state.status}`;

    if (state.status === 'wait') {
      iconEl.textContent = iconEl.dataset.num || '·';
      detailEl.textContent = 'Waiting…';
      detailEl.className = 'step-detail';
    } else if (state.status === 'run') {
      iconEl.textContent = '⏳';
      detailEl.textContent = 'Running…';
      detailEl.className = 'step-detail';
    } else if (state.status === 'ok') {
      iconEl.textContent = '✓';
      detailEl.textContent = state.detail || 'Done';
      detailEl.className = 'step-detail';
    } else if (state.status === 'fail') {
      iconEl.textContent = '✗';
      detailEl.textContent = state.detail || 'Failed';
      detailEl.className = 'step-detail err';
    } else if (state.status === 'skip') {
      iconEl.textContent = '—';
      detailEl.textContent = state.detail || 'Skipped';
      detailEl.className = 'step-detail';
    }
  }
}

// ── Results screen ────────────────────────────────────────────────────────────

function showResults(result) {
  clearInterval(window._pollId);

  // Render final progress state
  if (result.progress) renderProgress(result.progress);

  // Show generated secrets
  $('r-bb-secret').textContent   = result.bbSecret   || '(not set)';
  $('r-call-secret').textContent = result.callSecret || '(not set)';

  // Show manual webhook note if Quo registration failed
  if (!result.webhookOk) {
    $('webhook-manual').style.display = 'block';
  }

  showView('v-done');
}

// ── Copy helper ───────────────────────────────────────────────────────────────

function copyVal(elId, btn) {
  const val = $(elId)?.textContent;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => {
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
}

// expose globally for inline onclick
window.copyVal = copyVal;
