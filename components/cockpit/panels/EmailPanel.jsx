import React, { useState, useEffect } from 'react';
import { PenSquare, X, Send, Reply, Star, Paperclip, Mic, Clock, Video } from 'lucide-react';
import { ink, channel as CH, tier as TIER, semantic, emailInbox as EI } from '../lib/colors.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
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
function buildInboxes(emails) {
  const seen = [];
  for (const e of emails) {
    const inbox = e.inbox || '';
    if (inbox && !seen.includes(inbox)) seen.push(inbox);
  }
  return [ALL_INBOX, ...seen.map(inboxMetaFor)];
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
  const { emails: liveEmails } = useLiveData();
  const emails = Array.isArray(liveEmails) ? liveEmails : [];
  // Tabs reflect the mailboxes that actually have triaged email this render.
  const INBOXES = buildInboxes(emails);
  const [inbox, setInbox] = useState('all');
  const [openedId, setOpenedId] = useState(null);
  const [remindIds, setRemindIds] = useState(() => new Set());
  const toggleRemind = (id) =>
    setRemindIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const filtered = inbox === 'all' ? emails : emails.filter((e) => e.inbox === inbox);
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
        {INBOXES.map((ib) => (
          <button
            key={ib.k}
            type="button"
            onClick={() => { setInbox(ib.k); setOpenedId(null); }}
            style={{
              flex: 1,
              padding: '4px 6px',
              background: inbox === ib.k ? ib.color : '#FFFFFF',
              color: inbox === ib.k ? '#FFFFFF' : ib.color,
              border: `1px solid ${ib.color}55`,
              borderTop: `2px solid ${ib.color}`,
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em'
            }}
          >
            {ib.label}
          </button>
        ))}
      </div>

      {!opened && (
        <>
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

      {opened && <OpenedEmail email={opened} onClose={() => setOpenedId(null)} />}
    </PanelShell>
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

  const inviteToZoom = () => {
    const digits = String(Math.floor(10000000000 + Math.random() * 89999999999)); // 11 digits
    const link = `https://zoom.us/j/${digits}`;
    setReplyText((t) => (t && t.trim() ? `${t}\n\nJoin Zoom: ${link}` : `Join Zoom: ${link}`));
    setReplyMode((m) => (m === 'draft' ? 'editing' : m));
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
          title="Invite to Zoom — drops a link into the reply"
          style={{
            background: '#2D8CFF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            letterSpacing: '0.04em'
          }}
        >
          <Video size={12} strokeWidth={2.6} /> Zoom
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
  const noraContent = email.noraBlock?.content
    || `Read: ${email.from?.split(/[ <]/)[0] || 'sender'} on ${email.subject}. Tier ${email.tier || 'L4'}. Suggested move below.`;
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
        <ListenButton compact />
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.55, color: ink[700], marginBottom: 8 }}>
        {noraContent}
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
  const [sendState, setSendState] = useState('idle'); // idle | sending | sent | error
  const canSend = Boolean(toAddr) && replyText.trim().length > 0 && sendState !== 'sending';

  const doSend = async () => {
    if (!canSend) return;
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
        <button
          type="button"
          onClick={doSend}
          disabled={!canSend}
          title={!toAddr ? 'No sender address to reply to' : sendState === 'sent' ? 'Sent via g@reprime.com' : 'Send reply'}
          style={{
            background: sendState === 'sent' ? '#16A34A' : sendState === 'error' ? '#B91C1C' : ib.color,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 18,
            fontWeight: 800,
            cursor: canSend ? 'pointer' : 'default',
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
 * VoiceMessageButton — records & "sends" a voice note (mock).
 * Distinct from RecordButton (dictation): this produces a voice MESSAGE,
 * mirroring WhatsApp's hold-to-record mic. Mock-only — no real send.
 */
function VoiceMessageButton() {
  const [state, setState] = useState('idle'); // idle → recording → sent
  const click = () => {
    if (state === 'recording') {
      setState('sent');
      setTimeout(() => setState('idle'), 1400);
    } else if (state === 'idle') {
      setState('recording');
    }
  };
  const recording = state === 'recording';
  const sent = state === 'sent';
  return (
    <button
      type="button"
      onClick={click}
      title="Send a voice message"
      aria-label="Send a voice message"
      style={{
        background: recording ? '#E53935' : sent ? '#43A047' : '#F8FAFC',
        color: recording || sent ? '#FFFFFF' : ink[700],
        border: `1px solid ${recording ? '#E53935' : sent ? '#43A047' : semantic.border}`,
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        letterSpacing: '0.04em'
      }}
    >
      <Mic size={13} strokeWidth={2.4} />
      {recording ? 'Recording… tap to send' : sent ? 'Voice note sent' : 'Voice note'}
    </button>
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
