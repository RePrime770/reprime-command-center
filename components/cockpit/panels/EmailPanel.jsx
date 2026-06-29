import React, { useState, useEffect } from 'react';
import { PenSquare, X, Send, Reply, Star, Paperclip, Mic, Clock, Video, ArrowLeft } from 'lucide-react';
import { ink, channel as CH, tier as TIER, semantic, emailInbox as EI } from '../lib/colors.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { useDemo } from '../demo/DemoContext.jsx';
import { fmtRelative } from '../lib/format.js';
import { ListenButton, RecordButton, DictateButtons } from '../lib/voice.jsx';
import PanelShell from './PanelShell.jsx';

// v4 §M / §B1 — inbox colors per locked palette.
// The "All" tab is always present; per-mailbox tabs are derived dynamically
// from whichever accounts actually have triaged email this render (see
// buildInboxes). Short labels keep the tab row compact.
const ALL_INBOX = {
  k: 'all',
  label: 'All',
  color: EI.all.hex,
  faded: EI.all.faded,
  textOnFaded: EI.all.textOnFaded,
};

// Map a full mailbox email to a short tab label ('g@reprime.com' → 'g@reprime').
function shortInboxLabel(email) {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).split('.')[0];
  return `${local}@${domain}`;
}

// Build the inbox meta for one mailbox email, using the locked palette when
// known, else a neutral fallback so an unexpected account never crashes.
function inboxMetaFor(email) {
  const c = EI[email] || EI.all;
  return {
    k: email,
    label: shortInboxLabel(email),
    color: c.hex,
    faded: c.faded,
    textOnFaded: c.textOnFaded,
  };
}

// Derive the tab list from the emails present: 'All' + one tab per distinct
// account_email, in first-seen order. Single-account → ['All', that account].
// When `secondary` is { ok:false, email, ... } AND that mailbox has no rows
// yet, append a "Setup required" tab carrying its real email — the panel
// renders setup instructions instead of an inbox list.
function buildInboxes(emails, secondary) {
  const seen = [];
  for (const e of emails) {
    const inbox = e.inbox || '';
    if (inbox && !seen.includes(inbox)) seen.push(inbox);
  }
  const tabs = [ALL_INBOX, ...seen.map(inboxMetaFor)];
  if (secondary && secondary.ok === false && secondary.email && !seen.includes(secondary.email)) {
    const meta = inboxMetaFor(secondary.email);
    tabs.push({ ...meta, setupRequired: true, missingEnv: secondary.missingEnv || [] });
  }
  return tabs;
}

// Per-email meta resolver (used by row + opened views). 'all' or an unknown
// key resolves to a safe default so a single missing account never crashes.
function inboxMeta(key) {
  if (!key || key === 'all') return ALL_INBOX;
  return inboxMetaFor(key);
}

export default function EmailPanel({ width }) {
  // Live triaged inbox from the cockpit provider (GET /api/email/triage).
  // Falls back to static while the first fetch is in flight or on error.
  const { emails: liveEmails, emailSecondary } = useLiveData();
  const emails = Array.isArray(liveEmails) ? liveEmails : [];
  // Tabs reflect the mailboxes that actually have triaged email this render,
  // plus a "Setup required" tab for the secondary mailbox when its token is
  // unset (so the second account never silently disappears).
  const INBOXES = buildInboxes(emails, emailSecondary);
  const { state, set } = useDemo();
  const [inbox, setInbox] = useState('all');
  const [openedId, setOpenedId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [remindIds, setRemindIds] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const activeTab = INBOXES.find((t) => t.k === inbox) || ALL_INBOX;

  // Unread (fallback: total) count per inbox tab — feeds the tab pill badges.
  const unreadCountFor = (key) => {
    const scope = key === 'all' ? emails : emails.filter((e) => e.inbox === key);
    const unread = scope.filter((e) => e.unread === true || e.read === false).length;
    return unread > 0 ? unread : scope.length;
  };

  // The top-bar Concierge "Email" button sets emailComposeOpen; open the
  // composer here and clear the flag so it's a real action, not a dead key.
  useEffect(() => {
    if (state.emailComposeOpen) {
      setComposing(true);
      setOpenedId(null);
      set('emailComposeOpen', false);
    }
  }, [state.emailComposeOpen, set]);
  const toggleRemind = (id) =>
    setRemindIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const byInbox = inbox === 'all' ? emails : emails.filter((e) => e.inbox === inbox);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? byInbox.filter((e) =>
        [e.from, e.subject, e.preview]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : byInbox;
  const opened = openedId ? emails.find((e) => e.id === openedId) : null;

  return (
    <PanelShell width={width} accent={CH.email.hex} title="EMAIL TRIAGE" subtitle="TRIAGED">
      {/* Inbox tabs — v4 §B1 inbox color palette */}
      <div
        style={{
          padding: 6,
          display: 'flex',
          gap: 4,
          background: '#F8FAFC',
          borderBottom: `1px solid ${semantic.divider}`,
          flexShrink: 0
        }}
      >
        {INBOXES.map((ib) => {
          const count = unreadCountFor(ib.k);
          const active = inbox === ib.k;
          return (
            <button
              key={ib.k}
              type="button"
              onClick={() => { setInbox(ib.k); setOpenedId(null); }}
              style={{
                flex: 1,
                padding: '4px 6px',
                background: active ? ib.color : '#FFFFFF',
                color: active ? '#FFFFFF' : ib.color,
                border: `1px solid ${ib.color}55`,
                borderTop: `2px solid ${ib.color}`,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              {ib.label}
              <span style={{
                background: count > 0 ? (active ? '#FFFFFF' : ib.color) : '#E2E8F0',
                color: count > 0 ? (active ? ib.color : '#FFFFFF') : ink[500],
                borderRadius: 999,
                padding: '0 6px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.02em',
                minWidth: 16,
                textAlign: 'center'
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {composing && <ComposeEmail onClose={() => setComposing(false)} />}

      {!opened && !composing && activeTab.setupRequired && (
        <SetupRequiredPane meta={activeTab} />
      )}

      {!opened && !composing && !activeTab.setupRequired && (
        <>
          {/* Inbox search — filters by sender / subject / preview, client-side */}
          <div style={{ padding: '6px 8px', background: '#FFFFFF', borderBottom: `1px solid ${semantic.divider}`, flexShrink: 0, position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inbox (sender, subject, preview)…"
              style={{ width: '100%', border: `1px solid ${semantic.divider}`, borderRadius: 6, padding: '6px 28px 6px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: ink[500], cursor: 'pointer', padding: 2, display: 'inline-flex' }}
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            )}
          </div>
          {/* Compose — on TOP (Gideon 2026-06-16: controls go up top, never bottom) */}
          <div
            style={{
              padding: 6,
              background: '#FFFFFF',
              borderBottom: `1px solid ${semantic.divider}`,
              display: 'flex',
              gap: 6,
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={() => setComposing(true)}
              style={{
                flex: 1,
                background: CH.email.hex,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <PenSquare size={13} strokeWidth={2.4} /> Compose
            </button>
          </div>
          <div
            style={{
              padding: '6px 12px',
              background: '#EEF2FF',
              fontSize: 14,
              letterSpacing: '0.12em',
              color: '#283593',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            Inbox — {filtered.length} messages
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: ink[500], fontSize: 15, fontWeight: 600 }}>
                Inbox clear.
              </div>
            ) : (
              filtered.map((e) => (
                <EmailRow
                  key={e.id}
                  email={e}
                  onOpen={() => setOpenedId(e.id)}
                  reminded={remindIds.has(e.id)}
                  onToggleRemind={() => toggleRemind(e.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {opened && !composing && <OpenedEmail email={opened} onClose={() => setOpenedId(null)} />}
    </PanelShell>
  );
}

/**
 * ComposeEmail — a real new-message composer (replaces the dead Compose button
 * that had no onClick and the orphaned, fully-hardcoded EmailComposeDrawer).
 * Sends via /api/email/send (SendGrid, from g@reprime.com) with the same
 * confirm-before-send gate as replies. To/Subject/Body are real inputs.
 */
function ComposeEmail({ onClose }) {
  // From-account picker — defaults to primary (g@reprime.com). When the
  // secondary (g@floridastatetrust.com) refresh token is configured, the
  // user can flip to send from that mailbox. The /api/email/send route
  // resolves the `account` field via resolveReplyFrom() server-side.
  const { emailSecondary } = useLiveData();
  const secondaryOk = emailSecondary && emailSecondary.ok === true && typeof emailSecondary.email === 'string';
  const fromOptions = secondaryOk
    ? ['g@reprime.com', emailSecondary.email]
    : ['g@reprime.com'];
  const [from, setFrom] = useState(fromOptions[0]);
  // If options change (e.g. FST token comes online while composer is open),
  // keep the current selection valid.
  useEffect(() => {
    if (!fromOptions.includes(from)) setFrom(fromOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondaryOk]);
  const ib = inboxMeta(from);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendState, setSendState] = useState('idle'); // idle | confirm | sending | sent | error
  const emailOk = /.+@.+\..+/.test(to.trim());
  const canSend = emailOk && body.trim().length > 0 && sendState !== 'sending' && sendState !== 'confirm';

  const confirmSend = async () => {
    setSendState('sending');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim() || '(no subject)', body: body.trim(), account: from }),
      });
      setSendState(res.ok ? 'sent' : 'error');
      if (res.ok) setTimeout(onClose, 900);
    } catch {
      setSendState('error');
    }
  };

  const field = {
    width: '100%', border: `1px solid ${semantic.divider}`, borderRadius: 6,
    padding: '8px 10px', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 6,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: ib.faded }}>
      <div style={{ padding: '8px 10px', background: '#FFFFFF', borderBottom: `1px solid ${semantic.divider}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: ink[700] }}>New email</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: ink[500] }}>From:</span>
        {fromOptions.length > 1 ? (
          <select
            value={from}
            onChange={(e) => { setFrom(e.target.value); setSendState('idle'); }}
            disabled={sendState === 'sending' || sendState === 'confirm'}
            title="Pick the mailbox this message sends from"
            style={{ fontSize: 14, fontWeight: 700, color: ib.color, border: `1px solid ${ib.color}55`, background: '#FFFFFF', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {fromOptions.map((addr) => (
              <option key={addr} value={addr}>{inboxMeta(addr).label} ({addr})</option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: ib.color }}>{ib.label} ({from})</span>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} title="Close" style={{ background: 'transparent', border: 'none', color: ink[500], cursor: 'pointer', padding: 4 }}>
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
      <div style={{ padding: 10, overflowY: 'auto', flex: 1 }}>
        <input style={field} type="email" placeholder="To (email address)" value={to} onChange={(e) => { setTo(e.target.value); setSendState('idle'); }} />
        <input style={field} type="text" placeholder="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setSendState('idle'); }} />
        <textarea style={{ ...field, minHeight: 160, resize: 'vertical' }} placeholder="Write your message…" value={body} onChange={(e) => { setBody(e.target.value); setSendState('idle'); }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {sendState === 'confirm' ? (
            <>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink[700] }}>Send to <span style={{ color: ib.color }}>{to.trim()}</span>?</span>
              <button type="button" onClick={confirmSend} style={{ background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Send size={12} strokeWidth={2.6} /> Confirm send</button>
              <button type="button" onClick={() => setSendState('idle')} style={{ background: 'transparent', color: ink[500], border: `1px solid ${semantic.divider}`, borderRadius: 6, padding: '6px 12px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { if (canSend) setSendState('confirm'); }}
              disabled={!canSend && sendState !== 'error'}
              title={!emailOk ? 'Enter a valid recipient email' : 'Send (asks to confirm)'}
              style={{ background: sendState === 'sent' ? '#16A34A' : sendState === 'error' ? '#B91C1C' : ib.color, color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 17, fontWeight: 800, cursor: canSend || sendState === 'error' ? 'pointer' : 'default', opacity: canSend || sendState === 'sent' || sendState === 'error' ? 1 : 0.5, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Send size={12} strokeWidth={2.6} /> {sendState === 'sending' ? 'Sending…' : sendState === 'sent' ? 'Sent ✓' : sendState === 'error' ? 'Retry' : 'Send'}
            </button>
          )}
          <DictateButtons onText={(t) => { setBody((prev) => (prev ? `${prev} ${t}` : t)); setSendState('idle'); }} />
        </div>
      </div>
    </div>
  );
}

function EmailRow({ email, onOpen, reminded, onToggleRemind }) {
  const isHe = email.language === 'he';
  const tierHex = email.tier ? TIER[email.tier]?.hex : null;
  const ib = inboxMeta(email.inbox);
  const heightStyle = {
    tall:     { padding: '10px 10px 10px 16px', minHeight: 68 },
    standard: { padding: '7px 10px 7px 16px',   minHeight: 50 },
    compact:  { padding: '5px 10px 5px 16px',   minHeight: 36 }
  }[email.height || 'standard'];

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: isHe ? 'right' : 'left',
        background: '#FFFFFF',
        border: email.unread ? `1px solid ${ib.color}` : `1px solid ${semantic.divider}`,
        borderTop: `2px solid ${ib.color}`,
        borderRadius: 8,
        marginBottom: 4,
        cursor: 'pointer',
        direction: isHe ? 'rtl' : 'ltr',
        fontFamily: 'inherit',
        ...heightStyle
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 7 }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
          {email.unread && <span style={{ width: 6, height: 6, borderRadius: 999, background: ib.color, flexShrink: 0 }} />}
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.from}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RemindButton reminded={reminded} onToggle={onToggleRemind} />
          <span style={{ fontSize: 13, color: ib.color, fontWeight: 700, letterSpacing: '0.06em' }}>{ib.label}</span>
          <span style={{ fontSize: 14, color: ink[300], fontWeight: 600 }}>{fmtRelative(email.ts)}</span>
        </div>
      </div>
      <div
        className={isHe ? 'hebrew' : ''}
        style={{
          fontSize: email.height === 'tall' ? 13 : 12,
          fontWeight: 600,
          color: '#1E293B',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {email.subject}
      </div>
      {email.preview && email.height !== 'compact' && (
        <div
          className={isHe ? 'hebrew' : ''}
          style={{
            fontSize: email.height === 'tall' ? 16 : 13,
            color: ink[500],
            marginTop: 4,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: email.height === 'tall' ? 3 : 1,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {email.preview}
        </div>
      )}
      {/* Listen + Record on every row (shared contract: voice on every email) */}
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <ListenButton compact />
        <RecordButton label="Voice" />
      </div>
    </button>
  );
}

/**
 * OpenedEmail — v4 §B6 full-card opened-email view.
 *
 * Order top→bottom (mirror of CommsPanel ThreadView §3.10):
 *   1. Header (inbox badge · subject · from/to · Listen · X)
 *   2. Nora's elevated read (no size cap)
 *   3. Combined reply zone — NORA DRAFT label + Send / Edit / Clear & write my own
 *   4. Email body (the message being replied to)
 *   5. Older messages / thread below (push down)
 *
 * Faded card bg = inbox color faded (#DBEAFE / #CCFBF1 / #E0E7FF / #E2E8F0).
 */
function OpenedEmail({ email, onClose }) {
  const isHe = email.language === 'he';
  const ib = inboxMeta(email.inbox);
  const defaultDraft = email.noraDraft
    || `${(email.fromShort || email.from || '').split(/[ <]/)[0] || 'Hi'} — confirming receipt. Reviewing internally; I'll revert by EOD. — Gideon`;
  const [replyMode, setReplyMode] = useState('draft');
  const [replyText, setReplyText] = useState(defaultDraft);
  const [draftLoading, setDraftLoading] = useState(false);

  // Read/unread toggle via Gmail (needs gmail.modify on the token).
  const [isUnread, setIsUnread] = useState(email.unread === true);
  const [readBusy, setReadBusy] = useState(false);
  const toggleRead = async () => {
    if (readBusy) return;
    const markRead = isUnread; // currently unread -> mark read
    setReadBusy(true);
    setIsUnread(!markRead); // optimistic
    try {
      const res = await fetch('/api/email/mark-read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: email.id, read: markRead, account: email.inbox }),
      });
      if (!res.ok) setIsUnread(markRead); // revert on failure
    } catch {
      setIsUnread(markRead);
    } finally {
      setReadBusy(false);
    }
  };

  // Nora drafts the reply in Gideon's voice (POST /api/email/draft). Runs once
  // per opened email; replaces the placeholder only while still in 'draft' mode
  // (never clobbers an edit the user has started).
  useEffect(() => {
    let cancelled = false;
    setDraftLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/email/draft', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: email.subject,
            from: email.from,
            snippet: email.preview,
            language: email.language === 'he' ? 'he' : 'en',
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const draft = typeof data?.draft === 'string' ? data.draft.trim() : '';
        if (draft && !cancelled) {
          setReplyText((prev) => (replyMode === 'draft' ? draft : prev));
        }
      } catch {
        /* keep the placeholder draft on any failure */
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.id]);

  // Creates a REAL Zoom meeting via /api/zoom/create-meeting and drops the
  // join_url into the reply (was a random fake zoom.us/j/<digits> link). Never
  // fabricates a link — shows an inline error on failure.
  const [zoomBusy, setZoomBusy] = useState(false);
  const [zoomErr, setZoomErr] = useState(false);
  const inviteToZoom = async () => {
    if (zoomBusy) return;
    setZoomBusy(true);
    setZoomErr(false);
    try {
      const res = await fetch('/api/zoom/create-meeting', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName: email.fromShort || email.from }),
      });
      const data = res.ok ? await res.json() : null;
      const link = data?.joinUrl;
      if (!link) { setZoomErr(true); return; }
      setReplyText((t) => (t && t.trim() ? `${t}\n\nJoin Zoom: ${link}` : `Join Zoom: ${link}`));
      setReplyMode((m) => (m === 'draft' ? 'editing' : m));
    } catch {
      setZoomErr(true);
    } finally {
      setZoomBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: ib.faded
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 10px',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0
        }}
      >
        {/* Back pill — left-edge return-to-inbox affordance (mirrors WhatsApp panel) */}
        <button
          type="button"
          onClick={onClose}
          title="Back to inbox"
          aria-label="Back to inbox"
          style={{
            background: '#F1F5F9',
            color: ink[700],
            border: `1px solid ${semantic.border}`,
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            letterSpacing: '0.04em',
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.6} /> Back
        </button>
        <span
          style={{
            background: ib.color,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 4
          }}
        >
          {ib.label}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ink[700], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.subject}
          </div>
          <div style={{ fontSize: 14, color: ink[500], fontWeight: 600 }}>
            from {email.from} · {fmtRelative(email.ts)}
          </div>
        </div>
        <button
          type="button"
          onClick={inviteToZoom}
          disabled={zoomBusy}
          title={zoomErr ? 'Zoom unavailable — try again' : 'Invite to Zoom — creates a real meeting and drops the link into the reply'}
          style={{
            background: zoomErr ? '#E53935' : '#2D8CFF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 14,
            fontWeight: 800,
            cursor: zoomBusy ? 'wait' : 'pointer',
            opacity: zoomBusy ? 0.6 : 1,
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            letterSpacing: '0.04em'
          }}
        >
          <Video size={12} strokeWidth={2.6} /> {zoomBusy ? '…' : zoomErr ? 'Zoom ✗' : 'Zoom'}
        </button>
        <ListenButton
          compact
          language={isHe ? 'he' : 'en'}
          getText={() => [email.subject, `from ${email.from}`, email.preview].filter(Boolean).join('. ')}
        />
        <button
          type="button"
          onClick={toggleRead}
          disabled={readBusy}
          title={isUnread ? 'Mark as read' : 'Mark as unread'}
          aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}
          style={{
            background: isUnread ? ib.color : '#F1F5F9',
            color: isUnread ? '#FFFFFF' : ink[500],
            border: `1px solid ${isUnread ? ib.color : semantic.border}`,
            borderRadius: 6,
            padding: '4px 9px',
            fontSize: 13,
            fontWeight: 800,
            cursor: readBusy ? 'default' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.03em',
          }}
        >
          {isUnread ? '● unread' : '✓ read'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: ink[500], cursor: 'pointer', padding: 4 }}
          title="Close email"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* Nora's elevated read */}
      <NoraEmailRead email={email} ib={ib} />

      {/* Combined reply zone */}
      <EmailReplyZone
        ib={ib}
        defaultDraft={defaultDraft}
        replyMode={replyMode}
        setReplyMode={setReplyMode}
        replyText={replyText}
        setReplyText={setReplyText}
        isHe={isHe}
        toAddr={email.fromAddr}
        subject={email.subject}
        account={email.inbox}
      />

      {/* Email body (the message being replied to) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          dir: isHe ? 'rtl' : 'ltr'
        }}
      >
        <div
          className={isHe ? 'hebrew' : ''}
          style={{
            background: '#FFFFFF',
            border: `1px solid ${semantic.divider}`,
            borderLeft: `4px solid ${ib.color}`,
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 19,
            lineHeight: 1.55,
            color: ink[700],
            direction: isHe ? 'rtl' : 'ltr',
            textAlign: isHe ? 'right' : 'left'
          }}
        >
          <div style={{ fontSize: 14, color: ink[300], marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>
            {(email.from || '').toUpperCase()} · NEWEST
          </div>
          {email.body || email.preview || '(empty body — Nora hasn\'t cached this one yet)'}
        </div>

        {/* Older messages in thread */}
        {email.thread && email.thread.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ink[300], letterSpacing: '0.14em', margin: '4px 0' }}>
              EARLIER IN THIS THREAD
            </div>
            {email.thread.map((m, i) => (
              <div
                key={m.id || i}
                className={isHe ? 'hebrew' : ''}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${semantic.divider}`,
                  borderLeft: `3px solid ${ib.color}55`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  marginBottom: 4,
                  fontSize: 18,
                  lineHeight: 1.45,
                  color: ink[700],
                  direction: isHe ? 'rtl' : 'ltr',
                  textAlign: isHe ? 'right' : 'left'
                }}
              >
                <div style={{ fontSize: 13, color: ink[300], marginBottom: 2, fontWeight: 700 }}>
                  {(m.from || '').toUpperCase()} · {fmtRelative(m.ts)}
                </div>
                {m.body}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoraEmailRead({ email, ib }) {
  const tierHex = email.tier ? TIER[email.tier]?.hex : '#FFCC33';
  const fallback = email.noraBlock?.content
    || `Read: ${email.from?.split(/[ <]/)[0] || 'sender'} on ${email.subject}. Tier ${email.tier || 'L4'}. Suggested move below.`;
  // Real AI read of THIS email (was a hardcoded template). Fetched once per
  // opened email; falls back to the template string on any failure.
  const [summary, setSummary] = useState('');
  const [reading, setReading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setReading(true);
    (async () => {
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'email',
            from: email.from,
            subject: email.subject,
            text: email.preview || email.subject || '',
            language: email.language === 'he' ? 'he' : 'en',
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && typeof data?.summary === 'string' && data.summary.trim()) {
          setSummary(data.summary.trim());
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setReading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [email.id, email.from, email.subject, email.preview, email.language]);
  const noraContent = summary || fallback;
  const actions = email.noraBlock?.actions || ['Send Nora draft', 'Open thread', 'Snooze 2h'];
  return (
    <div
      style={{
        position: 'relative',
        margin: '8px',
        padding: '10px 12px 10px 18px',
        background: '#FFFFFF',
        border: `1px solid ${tierHex}66`,
        borderLeft: `5px solid ${tierHex}`,
        borderRadius: 8,
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: ink[500], letterSpacing: '0.12em' }}>
            NORA · ELEVATED READ
          </span>
          {email.tier && (
            <span style={{ background: tierHex, color: '#FFFFFF', borderRadius: 999, padding: '1px 7px', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em' }}>
              {TIER[email.tier]?.label}
            </span>
          )}
        </div>
        <ListenButton compact getText={() => noraContent} language={email.language === 'he' ? 'he' : 'en'} />
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.55, color: reading && !summary ? ink[300] : ink[700], marginBottom: 8, fontStyle: reading && !summary ? 'italic' : 'normal' }}>
        {reading && !summary ? 'Nora is reading this…' : noraContent}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            style={{
              background: '#F8FAFC',
              border: `1px solid ${semantic.border}`,
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 16,
              fontWeight: 600,
              color: ink[700],
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmailReplyZone({ ib, defaultDraft, replyMode, setReplyMode, replyText, setReplyText, isHe, toAddr, subject, account }) {
  const [sendState, setSendState] = useState('idle'); // idle | confirm | sending | sent | error
  const canSend = Boolean(toAddr) && replyText.trim().length > 0 && sendState !== 'sending' && sendState !== 'confirm';

  // Confirmation gate (mandated: never send on the user's behalf without an
  // explicit yes). First click → 'confirm' shows the recipient; Confirm → send.
  const requestSend = () => {
    if (!canSend) return;
    setSendState('confirm');
  };
  const cancelSend = () => setSendState('idle');
  const confirmSend = async () => {
    setSendState('sending');
    try {
      const replySubject = subject
        ? /^re:/i.test(subject) ? subject : `Re: ${subject}`
        : 'Re:';
      const res = await fetch('/api/email/send', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddr, subject: replySubject, body: replyText.trim(), account }),
      });
      setSendState(res.ok ? 'sent' : 'error');
    } catch {
      setSendState('error');
    }
  };

  const labelText = {
    draft:   'NORA DRAFT · tap to edit',
    editing: 'EDITING NORA’S DRAFT',
    cleared: 'WRITE YOUR OWN'
  }[replyMode];
  const sendLabel = replyMode === 'editing' ? 'Send my edit' : 'Send';

  return (
    <div
      style={{
        margin: '0 8px 8px',
        background: '#FFFFFF',
        border: `2px solid ${ib.color}`,
        borderRadius: 8,
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 10px',
          background: ib.faded,
          borderBottom: `1px solid ${ib.color}33`
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: ib.textOnFaded, letterSpacing: '0.12em' }}>
          {labelText}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: ib.textOnFaded, letterSpacing: '0.08em' }}>
          → reply via {ib.label}
        </span>
      </div>

      {replyMode === 'draft' && (
        <button
          type="button"
          onClick={() => setReplyMode('editing')}
          className={isHe ? 'hebrew' : ''}
          style={{
            display: 'block',
            width: '100%',
            textAlign: isHe ? 'right' : 'left',
            background: 'transparent',
            border: 'none',
            padding: '10px 14px',
            fontSize: 19,
            lineHeight: 1.55,
            color: ink[700],
            cursor: 'text',
            fontFamily: 'inherit'
          }}
        >
          {replyText}
        </button>
      )}
      {replyMode === 'editing' && (
        <textarea
          autoFocus
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          className={isHe ? 'hebrew' : ''}
          style={{
            display: 'block',
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '10px 14px',
            fontSize: 19,
            lineHeight: 1.55,
            color: ink[700],
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 80,
            direction: isHe ? 'rtl' : 'ltr'
          }}
        />
      )}
      {replyMode === 'cleared' && (
        <textarea
          autoFocus
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write your own reply"
          className={isHe ? 'hebrew' : ''}
          style={{
            display: 'block',
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '10px 14px',
            fontSize: 19,
            color: ink[700],
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 60,
            direction: isHe ? 'rtl' : 'ltr'
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          padding: '6px 10px',
          background: '#FFFFFF',
          borderTop: `1px solid ${semantic.divider}`
        }}
      >
        {sendState === 'confirm' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: ink[700] }}>
              Send to <span style={{ color: ib.color }}>{toAddr}</span> via {ib.label}?
            </span>
            <button
              type="button"
              onClick={confirmSend}
              style={{ background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Send size={12} strokeWidth={2.6} /> Confirm send
            </button>
            <button
              type="button"
              onClick={cancelSend}
              style={{ background: 'transparent', color: ink[500], border: `1px solid ${semantic.divider}`, borderRadius: 6, padding: '6px 12px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={requestSend}
            disabled={!canSend && sendState !== 'error'}
            title={!toAddr ? 'No sender address to reply to' : sendState === 'sent' ? 'Sent via g@reprime.com' : 'Send reply (asks to confirm)'}
            style={{
              background: sendState === 'sent' ? '#16A34A' : sendState === 'error' ? '#B91C1C' : ib.color,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 18,
              fontWeight: 800,
              cursor: canSend || sendState === 'error' ? 'pointer' : 'default',
              opacity: canSend || sendState === 'sent' || sendState === 'error' ? 1 : 0.5,
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Send size={12} strokeWidth={2.6} />{' '}
            {sendState === 'sending' ? 'Sending…' : sendState === 'sent' ? 'Sent ✓' : sendState === 'error' ? 'Retry' : sendLabel}
          </button>
        )}
        {/* Dictation — two explicit language buttons (Gideon 2026-06-16): transcript fills the reply */}
        <DictateButtons
          onText={(t) => {
            setReplyText((prev) => (prev ? `${prev} ${t}` : t));
            setReplyMode('editing');
            setSendState('idle');
          }}
        />
        {replyMode !== 'editing' && (
          <button type="button" onClick={() => setReplyMode('editing')} style={emailReplyActionStyle()}>Edit</button>
        )}
        <button
          type="button"
          onClick={() => { setReplyText(''); setReplyMode('cleared'); }}
          style={emailReplyActionStyle()}
          title="Clear & write my own (this reply only — Nora drafts again next round)"
        >
          Clear &amp; write my own
        </button>
        {replyMode !== 'draft' && (
          <button
            type="button"
            onClick={() => { setReplyText(defaultDraft); setReplyMode('draft'); }}
            style={emailReplyActionStyle()}
            title="Restore Nora's draft"
          >
            ↺ Nora draft
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          title="Attach a file"
          aria-label="Attach a file"
          style={emailReplyIconStyle()}
        >
          <Paperclip size={14} strokeWidth={2.4} />
        </button>
        <VoiceMessageButton />
        <ListenButton compact getText={() => replyText} language={isHe ? 'he' : 'en'} />
      </div>
    </div>
  );
}

/**
 * RemindButton — per-email "remind 1h" toggle.
 * Rows are <button>s, so this is a span role="button" with stopPropagation
 * (never a nested <button>). Gold #FFCC33 when set. Fixed 1 hour, no picker.
 */
function RemindButton({ reminded, onToggle }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle?.(); }
      }}
      title={reminded ? 'Reminder set · 1h' : 'Remind me in 1h'}
      aria-label={reminded ? 'Reminder set for 1 hour' : 'Remind me in 1 hour'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        background: reminded ? '#FFCC33' : 'transparent',
        color: reminded ? '#1E293B' : ink[300],
        border: `1px solid ${reminded ? '#FFCC33' : 'rgba(15,23,42,0.18)'}`,
        borderRadius: 999,
        padding: '1px 6px',
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer'
      }}
    >
      <Clock size={11} strokeWidth={2.6} />
      1h
    </span>
  );
}

/**
 * VoiceMessageButton — placeholder for an email-side voice-note action.
 *
 * Previously this mocked recording + send with setTimeout, which violated
 * the cockpit's "no fake success" rule. The actual voice-note pipeline
 * (MediaRecorder → upload → /api/voice/transcribe → attach to draft) isn't
 * wired here yet, so the button is intentionally disabled with explanation
 * until it is.
 */
function VoiceMessageButton() {
  return (
    <button
      type="button"
      disabled
      title="Email voice notes not wired yet — use the WhatsApp panel for voice messages."
      aria-label="Voice notes not configured"
      style={{
        background: '#F1F5F9',
        color: '#94A3B8',
        border: `1px solid ${semantic.border}`,
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'not-allowed',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        letterSpacing: '0.04em'
      }}
    >
      <Mic size={13} strokeWidth={2.4} />
      Voice note · not configured
    </button>
  );
}

/**
 * SetupRequiredPane — shown when a mailbox tab is rendered for an account whose
 * refresh token isn't set in the deployment environment. Tells Gideon exactly
 * which env var to set and where the runbook lives. No real token values
 * appear here — only the env var NAME (e.g. GOOGLE_REFRESH_TOKEN_2).
 */
function SetupRequiredPane({ meta }) {
  const envVar = Array.isArray(meta.missingEnv) && meta.missingEnv[0]
    ? meta.missingEnv[0]
    : 'GOOGLE_REFRESH_TOKEN_2';
  const targetEmail = meta.k && meta.k.includes('@') ? meta.k : 'g@floridastatetrust.com';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: meta.faded }}>
      <div
        style={{
          background: '#FFFFFF',
          border: `1px solid ${meta.color}55`,
          borderLeft: `5px solid ${meta.color}`,
          borderRadius: 8,
          padding: 16,
          maxWidth: 640,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: meta.textOnFaded, letterSpacing: '0.12em', marginBottom: 6 }}>
          SETUP REQUIRED
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: ink[700], marginBottom: 10 }}>
          Connect {targetEmail}
        </div>

        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1E40AF', marginBottom: 6 }}>
            One-click in-browser flow (recommended)
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: ink[700], marginBottom: 10 }}>
            Click the button below. Google opens, you sign in as <b>{targetEmail}</b>, click Allow, and the next screen shows the refresh token with a copy button.
          </div>
          <a
            href="/api/google/connect-secondary"
            style={{
              display: 'inline-block',
              background: meta.color,
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 800,
              padding: '8px 16px',
              borderRadius: 6,
              letterSpacing: '0.02em',
            }}
          >
            Connect {targetEmail}
          </a>
          <div style={{ fontSize: 12, color: ink[500], marginTop: 10, lineHeight: 1.5 }}>
            <b>One-time setup:</b> in Google Cloud Console, the OAuth client must have this redirect URI registered:
            <pre style={{ margin: '4px 0 0', padding: '6px 10px', background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, fontFamily: mono, overflowX: 'auto' }}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://project-7e87w.vercel.app'}/api/google/connect-secondary/callback
            </pre>
          </div>
        </div>

        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: ink[500] }}>Or use the CLI script</summary>
          <ol style={{ margin: '10px 0 0 20px', padding: 0, fontSize: 14, lineHeight: 1.6, color: ink[700] }}>
            <li style={{ marginBottom: 8 }}>
              From a terminal in this repo, run:
              <pre style={{ margin: '6px 0 0', padding: '8px 12px', background: '#F1F5F9', border: `1px solid ${semantic.divider}`, borderRadius: 6, fontSize: 13, fontFamily: mono, overflowX: 'auto' }}>
                node scripts/get-reprime-gmail-token.mjs
              </pre>
              <div style={{ fontSize: 12, color: ink[500], marginTop: 4 }}>
                A browser tab opens. <b>Sign in as {targetEmail}</b> and click <b>Allow</b>.
              </div>
            </li>
            <li>
              The script prints the refresh token. Copy it and paste into Vercel as <code style={{ fontFamily: mono }}>{envVar}</code>.
            </li>
          </ol>
        </details>

        <div style={{ fontSize: 13, color: ink[500], lineHeight: 1.5 }}>
          After the token lands on Vercel, this tab auto-replaces with the live inbox on the next refresh. Compose will gain a <b>From:</b> picker so you can send from either mailbox.
        </div>
      </div>
    </div>
  );
}

function emailReplyIconStyle() {
  return {
    background: '#F8FAFC',
    color: ink[700],
    border: `1px solid ${semantic.border}`,
    borderRadius: 6,
    padding: '6px 9px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
}

function emailReplyActionStyle() {
  return {
    background: '#F8FAFC',
    color: ink[700],
    border: `1px solid ${semantic.border}`,
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };
}
