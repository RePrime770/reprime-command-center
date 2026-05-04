'use strict';

// ── Message handler ───────────────────────────────────────────────────────────
// popup.js sends { type: 'claude', apiKey, model, systemPrompt, messages }
// and we call the Anthropic API from the service worker (avoids CORS issues
// that can occur in popup page contexts).

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type !== 'claude') return;

  callClaude(msg)
    .then((text) => respond({ text }))
    .catch((err) => respond({ error: friendlyError(err) }));

  return true; // keep message channel open for async response
});

// ── Anthropic API call ────────────────────────────────────────────────────────

async function callClaude({ apiKey, model, systemPrompt, messages }) {
  if (!apiKey) throw new Error('No API key configured. Open Settings to add one.');

  const body = {
    model:      model || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   messages.map((m) => ({ role: m.role, content: m.content })),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                            'application/json',
      'x-api-key':                               apiKey,
      'anthropic-version':                       '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `API error ${res.status}`;
    try {
      const j = await res.json();
      detail = j?.error?.message || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Claude.');
  return text;
}

// ── Error messages ────────────────────────────────────────────────────────────

function friendlyError(err) {
  const msg = err.message || String(err);
  if (msg.includes('401'))            return 'Invalid API key. Go to Settings and re-enter it.';
  if (msg.includes('429'))            return 'Rate limit hit. Wait a moment and try again.';
  if (msg.includes('529') || msg.includes('overloaded'))
                                      return 'Anthropic is overloaded right now. Try again in a few seconds.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
                                      return 'Network error — check your connection and try again.';
  return msg;
}
