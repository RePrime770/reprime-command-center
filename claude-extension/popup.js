'use strict';

const $ = (id) => document.getElementById(id);

const DEFAULT_SYSTEM = `You are Gideon's private AI assistant inside the RePrime Command Center — a real estate capital raising platform based in Florida.

Your jobs:
1. Draft investor outreach messages (WhatsApp, SMS, iMessage, email) — warm, direct, no corporate fluff
2. Summarize calls and meetings into 2–3 sharp bullet points
3. Recommend the single best next action for any investor or deal
4. Help compose Terminal-style invitation and follow-up messages
5. Answer quick questions about contacts, deals, tasks, or pipeline status

Tone for investor messages: confident, personal, friend-of-a-friend. Short sentences. No buzzwords. Never say "I hope this message finds you well."

Internal notes and summaries: plain English, active voice, 1–2 sentences max.

When given page content, extract only what's directly relevant to the question — don't dump the whole page back.

RePrime context:
- Two panels: 718 (Gideon's personal iPhone via BlueBubbles) and 305 (business line via Quo/OpenPhone)
- Investors are high-net-worth individuals invited into Florida commercial real estate deals
- The Terminal is the private invitation funnel — exclusivity-focused, high-touch
- Key contacts include David Cohen (Cohen Capital, $40M FL RE focus), Mendy Tuitou (500 Bailey term sheet), Levi Izhak Biton

Always end with a specific recommended action. Never say "it depends" without following it with a recommendation.`;

// ── View routing ──────────────────────────────────────────────────────────────

function showView(id) {
  for (const v of ['v-check', 'v-setup', 'v-chat']) {
    const el = $(v);
    if (el) el.style.display = v === id ? 'flex' : 'none';
  }
}

function setBadge(text, active) {
  const b = $('hdr-badge');
  b.textContent = text;
  b.className = 'hdr-badge' + (active ? ' active' : '');
}

// ── In-memory conversation (persisted to session storage) ─────────────────────

let messages = []; // { role: 'user'|'assistant', content: string }
let pageContext = null; // { title, text } | null

function loadHistory() {
  try {
    const raw = sessionStorage.getItem('rp-chat');
    if (raw) messages = JSON.parse(raw);
  } catch (_) { messages = []; }
}

function saveHistory() {
  try { sessionStorage.setItem('rp-chat', JSON.stringify(messages.slice(-40))); } catch (_) {}
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadHistory();

(async () => {
  const c = await chrome.storage.local.get(['apiKey', 'model', 'systemPrompt', 'enabled']);

  if (!c.apiKey) {
    showView('v-check');
    setBadge('SETUP', false);
    $('toggle-wrap').style.display = 'none';
    initChecklist();
    return;
  }

  // Configured — show chat
  $('toggle-wrap').style.display = 'flex';
  $('chk-enabled').checked = c.enabled !== false;
  setBadge(c.enabled !== false ? 'ACTIVE' : 'PAUSED', c.enabled !== false);
  $('model-label').textContent = (c.model || 'claude-sonnet-4-6').split('-').slice(0, 3).join('-');
  showView('v-chat');
  renderHistory();
  initChat();
  initToggle();
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
    $('f-prompt').value = DEFAULT_SYSTEM;
    $('setup-err').style.display = 'none';
    showView('v-setup');
    setBadge('SETUP', false);
  });
}

// ── VIEW 2 — Setup ────────────────────────────────────────────────────────────

$('btn-back-check').addEventListener('click', async () => {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) {
    showView('v-chat');
    setBadge('ACTIVE', true);
  } else {
    showView('v-check');
    setBadge('SETUP', false);
  }
});

$('btn-save').addEventListener('click', async () => {
  const key = $('f-key').value.trim();
  const errEl = $('setup-err');

  if (!key || !key.startsWith('sk-ant-')) {
    errEl.textContent = 'Enter a valid Anthropic API key starting with sk-ant-';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  $('btn-save').disabled = true;
  $('btn-save').textContent = 'Saving…';

  await chrome.storage.local.set({
    apiKey:       key,
    model:        $('f-model').value,
    systemPrompt: $('f-prompt').value.trim() || DEFAULT_SYSTEM,
    enabled:      true,
  });

  $('toggle-wrap').style.display = 'flex';
  $('chk-enabled').checked = true;
  setBadge('ACTIVE', true);
  $('model-label').textContent = $('f-model').value.split('-').slice(0, 3).join('-');
  showView('v-chat');
  renderHistory();
  initChat();
  initToggle();

  $('btn-save').disabled = false;
  $('btn-save').textContent = 'Save & Open Chat';
});

// ── Toggle ────────────────────────────────────────────────────────────────────

let toggleInitDone = false;
function initToggle() {
  if (toggleInitDone) return;
  toggleInitDone = true;
  $('chk-enabled').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    setBadge(e.target.checked ? 'ACTIVE' : 'PAUSED', e.target.checked);
  });
}

// ── VIEW 3 — Chat ─────────────────────────────────────────────────────────────

let chatInitDone = false;

function initChat() {
  if (chatInitDone) return;
  chatInitDone = true;

  const input = $('chat-input');
  const sendBtn = $('btn-send');

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });

  // Enter to send (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', send);

  // Attach page context
  $('btn-page').addEventListener('click', attachPage);
  $('btn-remove-page').addEventListener('click', () => {
    pageContext = null;
    $('page-badge').style.display = 'none';
  });

  // Clear chat
  $('btn-clear').addEventListener('click', () => {
    messages = [];
    saveHistory();
    pageContext = null;
    $('page-badge').style.display = 'none';
    renderHistory();
  });

  // Settings (click model label)
  $('model-label').style.cursor = 'pointer';
  $('model-label').title = 'Edit settings';
  $('model-label').addEventListener('click', openSettings);
}

async function openSettings() {
  const c = await chrome.storage.local.get(['apiKey', 'model', 'systemPrompt']);
  $('f-key').value     = c.apiKey || '';
  $('f-model').value   = c.model || 'claude-sonnet-4-6';
  $('f-prompt').value  = c.systemPrompt || DEFAULT_SYSTEM;
  $('setup-err').style.display = 'none';
  showView('v-setup');
  setBadge('SETUP', false);
}

async function attachPage() {
  const btn = $('btn-page');
  btn.textContent = '⏳';
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || location.hostname;
        // Grab visible text, skip scripts/styles
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const tag = node.parentElement?.tagName;
              if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
              return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
          }
        );
        const chunks = [];
        let node;
        while ((node = walker.nextNode())) chunks.push(node.textContent.trim());
        const text = chunks.join(' ').replace(/\s{2,}/g, ' ').slice(0, 6000);
        return { title, text };
      },
    });

    pageContext = result?.result || null;
    if (pageContext?.text) {
      $('page-badge-text').textContent = pageContext.title || 'Page attached';
      $('page-badge').style.display = 'flex';
    }
  } catch (err) {
    pageContext = null;
    console.warn('[claude-ext] attach page failed:', err.message);
  }

  btn.textContent = '📄';
  btn.disabled = false;
}

async function send() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const { enabled, apiKey, model, systemPrompt } = await chrome.storage.local.get([
    'enabled', 'apiKey', 'model', 'systemPrompt',
  ]);

  if (enabled === false) {
    appendMsg('error', 'Assistant is paused. Toggle it on in the header.');
    return;
  }

  // Build user content (optionally prepend page context)
  let userContent = text;
  if (pageContext?.text) {
    userContent = `[Page: "${pageContext.title}"]\n${pageContext.text}\n\n---\n${text}`;
    // Clear after use
    pageContext = null;
    $('page-badge').style.display = 'none';
  }

  // Reset input
  input.value = '';
  input.style.height = 'auto';
  $('btn-send').disabled = true;

  // Show user message (display only the original text, not the page dump)
  messages.push({ role: 'user', content: userContent });
  appendMsg('user', text);

  // Thinking indicator
  const thinkingEl = appendMsg('assistant', 'Thinking…', true);

  try {
    const reply = await chrome.runtime.sendMessage({
      type:         'claude',
      apiKey:       apiKey || '',
      model:        model || 'claude-sonnet-4-6',
      systemPrompt: systemPrompt || DEFAULT_SYSTEM,
      messages:     messages.slice(-20), // last 20 to keep context window small
    });

    thinkingEl.remove();

    if (reply.error) {
      messages.pop(); // remove failed user message from history
      appendMsg('error', reply.error);
    } else {
      messages.push({ role: 'assistant', content: reply.text });
      appendMsg('assistant', reply.text);
      saveHistory();
    }
  } catch (err) {
    thinkingEl.remove();
    messages.pop();
    appendMsg('error', err.message || 'Something went wrong.');
  }

  $('btn-send').disabled = false;
  input.focus();
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function appendMsg(role, text, isThinking = false) {
  const empty = $('chat-empty');
  if (empty) empty.remove();

  const wrap = $('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}${isThinking ? ' thinking' : ''}`;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'Claude' : '⚠ Error';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  div.appendChild(label);
  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function renderHistory() {
  const wrap = $('chat-messages');
  wrap.innerHTML = '';

  if (messages.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'chat-empty';
    empty.className = 'chat-empty';
    empty.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="10" width="30" height="22" rx="5" fill="#FFCC33"/>
        <path d="M14 32 L11 39 L20 34" fill="#FFCC33"/>
        <circle cx="18" cy="21" r="2.2" fill="#0E3470"/>
        <circle cx="24" cy="21" r="2.2" fill="#0E3470"/>
        <circle cx="30" cy="21" r="2.2" fill="#0E3470"/>
      </svg>
      <span>Ask anything — draft a message,<br>summarize a call, get a next step.</span>`;
    wrap.appendChild(empty);
    return;
  }

  for (const m of messages) {
    // Show display-friendly content (strip page context prefix if present)
    const display = m.content.includes('[Page:') && m.role === 'user'
      ? m.content.replace(/^\[Page:.*?\n.*?\n\n---\n/s, '')
      : m.content;
    appendMsg(m.role, display);
  }
}
