'use strict';

const SUPABASE_PROJECT = 'yrnujfhzmoasodawqfri';
const VERCEL_PROJECT   = 'reprime-command-center';
const DASHBOARD_URL    = 'https://project-7e87w.vercel.app';

// ── Migration SQL ─────────────────────────────────────────────────────────────

const MIGRATION_SQL = `
create table if not exists public.phone_calls (
  id                uuid        primary key default gen_random_uuid(),
  external_id       text        not null unique,
  panel             text        not null,
  direction         text        not null,
  from_phone        text        not null,
  to_phone          text        not null,
  contact_phone     text,
  started_at        timestamptz,
  ended_at          timestamptz,
  duration_seconds  integer,
  status            text        not null default 'completed',
  channel_type      text        not null default 'call',
  recording_url     text,
  created_at        timestamptz not null default now()
);
create index if not exists phone_calls_contact_phone_idx
  on public.phone_calls (contact_phone, started_at desc);
create index if not exists phone_calls_panel_idx
  on public.phone_calls (panel, started_at desc);
alter table public.phone_calls enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='phone_calls' and policyname='service_role_all'
  ) then
    execute 'create policy "service_role_all" on public.phone_calls
             for all using (auth.role() = ''service_role'')';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='phone_calls' and policyname='authenticated_read'
  ) then
    execute 'create policy "authenticated_read" on public.phone_calls
             for select using (auth.role() = ''authenticated'')';
  end if;
end $$;
`.trim();

// ── Random secret generator ───────────────────────────────────────────────────

function makeSecret(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Progress helper ───────────────────────────────────────────────────────────

const STEP_KEYS = ['supa', 'webhook', 'v1', 'v2', 'v3', 'v4', 'bb'];

function initProgress() {
  return Object.fromEntries(
    STEP_KEYS.map((k, i) => [k, { status: 'wait', detail: '', num: String(i + 1) }])
  );
}

async function setStep(progress, key, status, detail = '') {
  progress[key] = { ...progress[key], status, detail };
  await chrome.storage.local.set({ setupProgress: progress });
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type !== 'run-setup') return;
  runSetup(msg).then(respond).catch((e) => respond({ error: e.message }));
  return true;
});

// ── Main setup orchestrator ───────────────────────────────────────────────────

async function runSetup({ supa, vercel, quo, bbUrl, bbPwd }) {
  const progress   = initProgress();
  const bbSecret   = makeSecret();
  const callSecret = makeSecret();
  let   webhookOk  = false;
  let   quoSecret  = '';

  // ── Step 1: Supabase migration ──────────────────────────────────────────────
  await setStep(progress, 'supa', 'run');
  try {
    await runSupabaseMigration(supa);
    await setStep(progress, 'supa', 'ok', 'phone_calls table ready');
  } catch (err) {
    await setStep(progress, 'supa', 'fail', err.message);
  }

  // ── Step 2: Register Quo webhook ────────────────────────────────────────────
  await setStep(progress, 'webhook', 'run');
  try {
    quoSecret = await registerQuoWebhook(quo);
    webhookOk = true;
    await setStep(progress, 'webhook', 'ok',
      quoSecret ? 'Webhook ready, secret captured' : 'Webhook already registered');
  } catch (err) {
    await setStep(progress, 'webhook', 'fail', `${err.message} — see manual instructions`);
    quoSecret = 'REPLACE_WITH_QUO_SIGNING_SECRET';
  }

  // ── Steps 3-6: Vercel env vars ──────────────────────────────────────────────
  const envVars = [
    { stepKey: 'v1', key: 'QUO_API_KEY',               value: quo },
    { stepKey: 'v2', key: 'QUO_WEBHOOK_SECRET',         value: quoSecret },
    { stepKey: 'v3', key: 'BLUEBUBBLES_WEBHOOK_SECRET', value: bbSecret },
    { stepKey: 'v4', key: 'BB_CALL_SECRET',             value: callSecret },
  ];

  let teamId = null;
  try { teamId = await getVercelTeamId(vercel); } catch (_) {}

  for (const { stepKey, key, value } of envVars) {
    await setStep(progress, stepKey, 'run');
    try {
      await upsertVercelEnv(vercel, teamId, key, value);
      await setStep(progress, stepKey, 'ok', `${key} saved`);
    } catch (err) {
      await setStep(progress, stepKey, 'fail', err.message);
    }
  }

  // ── Step 7: BlueBubbles webhook ─────────────────────────────────────────────
  if (bbUrl && bbPwd) {
    await setStep(progress, 'bb', 'run');
    try {
      await configureBlueBubblesWebhook(bbUrl, bbPwd, bbSecret);
      await setStep(progress, 'bb', 'ok', 'Webhook registered on BB Server');
    } catch (err) {
      await setStep(progress, 'bb', 'fail', err.message);
    }
  } else {
    await setStep(progress, 'bb', 'skip', 'BB URL/password not provided — skipped');
  }

  return { progress, bbSecret, callSecret, webhookOk };
}

// ── Supabase Management API ───────────────────────────────────────────────────

async function runSupabaseMigration(token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = `Supabase ${res.status}`;
    try { msg = JSON.parse(body)?.message || msg; } catch (_) {}
    throw new Error(msg);
  }
}

// ── Quo / OpenPhone API ───────────────────────────────────────────────────────

async function registerQuoWebhook(apiKey) {
  const targetUrl = `${DASHBOARD_URL}/api/phone/quo-webhook`;

  // Check if the webhook already exists — avoid duplicates
  const listRes = await fetch('https://api.openphone.com/v1/webhooks', {
    headers: { 'Authorization': apiKey },
  });
  if (listRes.ok) {
    const listData = await listRes.json();
    const existing = (listData?.data ?? []).find((w) => w.url === targetUrl);
    if (existing) return existing?.signingSecret ?? existing?.secret ?? '';
  }

  // Create it
  const res = await fetch('https://api.openphone.com/v1/webhooks', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      events: ['call.completed', 'recording.completed', 'message.received', 'message.sent'],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = `Quo API ${res.status}`;
    try { msg = JSON.parse(body)?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json().catch(() => ({}));
  return (
    data?.data?.signingSecret ??
    data?.signingSecret ??
    data?.secret ??
    data?.data?.secret ??
    ''
  );
}

// ── BlueBubbles Server API ────────────────────────────────────────────────────

async function configureBlueBubblesWebhook(bbUrl, bbPassword, secret) {
  const base = bbUrl.replace(/\/$/, '');
  const targetUrl = `${DASHBOARD_URL}/api/phone/bb-webhook`;

  // Verify connectivity
  const pingRes = await fetch(`${base}/api/v1/server/info`, {
    headers: { 'x-password': bbPassword },
  });
  if (!pingRes.ok) {
    throw new Error(`Cannot reach BB Server (${pingRes.status}) — check URL and password`);
  }

  // Check for existing webhook to avoid duplicates
  const listRes = await fetch(`${base}/api/v1/webhook`, {
    headers: { 'x-password': bbPassword },
  });
  if (listRes.ok) {
    const listData = await listRes.json();
    const webhooks = listData?.data ?? listData?.webhooks ?? [];
    if (webhooks.find((w) => w.url === targetUrl)) return; // already set
  }

  // Register webhook
  const createRes = await fetch(`${base}/api/v1/webhook`, {
    method: 'POST',
    headers: {
      'x-password':   bbPassword,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url:               targetUrl,
      isSubscribedToAll: true,
      headers:           { 'x-bb-secret': secret },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => '');
    let msg = `BB Server ${createRes.status}`;
    try { msg = JSON.parse(body)?.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }
}

// ── Vercel API ────────────────────────────────────────────────────────────────

async function getVercelTeamId(token) {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const id = data?.accountId ?? data?.link?.org ?? null;
  return id?.startsWith('team_') ? id : null;
}

async function upsertVercelEnv(token, teamId, key, value) {
  const qs = teamId ? `?teamId=${teamId}` : '';

  const createRes = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env${qs}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        key,
        value,
        type:   'encrypted',
        target: ['production', 'preview', 'development'],
      }),
    }
  );

  if (createRes.ok) return;

  const createBody = await createRes.json().catch(() => ({}));
  const alreadyExists =
    createRes.status === 400 &&
    (createBody?.error?.code === 'ENV_ALREADY_EXISTS' ||
     createBody?.error?.message?.includes('already exists'));

  if (!alreadyExists) {
    throw new Error(createBody?.error?.message || `Vercel ${createRes.status}`);
  }

  const listRes = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env${qs}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error(`Vercel list ${listRes.status}`);
  const listData = await listRes.json();
  const envs = listData?.envs ?? listData ?? [];
  const existing = envs.find((e) => e.key === key);
  if (!existing?.id) throw new Error(`${key} exists but couldn't find its ID to update`);

  const patchRes = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env/${existing.id}${qs}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ value }),
    }
  );
  if (!patchRes.ok) {
    const patchBody = await patchRes.json().catch(() => ({}));
    throw new Error(patchBody?.error?.message || `Vercel patch ${patchRes.status}`);
  }
}
