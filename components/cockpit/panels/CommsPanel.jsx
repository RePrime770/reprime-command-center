import React, { useState, useEffect } from 'react';
import { Send, X, Star, Mic, Calendar, Paperclip, Clock, Video, Home } from 'lucide-react';
import { brand, ink, channel as CH, tier as TIER, semantic } from '../lib/colors.js';
import { fmtRelative } from '../lib/format.js';
import { ListenButton, DictateButtons } from '../lib/voice.jsx';
import { useDemo } from '../demo/DemoContext.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import PanelShell from './PanelShell.jsx';

/**
 * Comms Panel — 4 sub-pillars side-by-side: 305 / 718 / Investors / Staff.
 *
 * Channel-variant headers per dispatch fix #6:
 *   - 305 sub-pillar header shows "305 TEXT" + "305 WHATSAPP" with channel-color bands
 *   - 718 sub-pillar header shows "718 TEXT" + "718 WHATSAPP" + "718 iMESSAGE" bands
 *   - Investors stays unified (channel-color indicator per row)
 *   - Staff stays unified (teal #0D9488) — threads where thread.staffTag === true
 *
 * Exclusivity (mirror of investor rule §B31): staff threads are pulled OUT of 305/718
 *   and shown ONLY in the Staff lane. Investor threads stay out of 305/718 too.
 *
 * Thread expansion per dispatch fix #1:
 *   - Stays inside its sub-pillar lane. NEVER collapses other sub-pillars to thin bars.
 */
const SUB_PILLARS = [
  {
    id: '305',
    label: '305 RePrime',
    bands: [
      { variant: 'TEXT',     color: CH['305-SMS'].hex, channelKey: '305-SMS' },
      { variant: 'WHATSAPP', color: CH['305-WA'].hex,  channelKey: '305-WA' }
    ]
  },
  {
    id: '718',
    label: '718 Personal',
    bands: [
      { variant: 'TEXT',     color: CH['718-SMS'].hex, channelKey: '718-SMS' },
      { variant: 'WHATSAPP', color: CH['718-WA'].hex,  channelKey: '718-WA' },
      { variant: 'iMESSAGE', color: CH['718-iM'].hex,  channelKey: '718-iM' }
    ]
  },
  {
    id: 'staff',
    label: 'Staff',
    unified: true,
    bands: [{ variant: 'STAFF', color: CH.staff.hex, channelKey: 'staff' }]
  },
  {
    id: 'inv',
    label: 'Investors',
    unified: true,
    bands: [{ variant: 'INVESTOR', color: CH.investor.hex, channelKey: 'investor' }]
  }
];

export default function CommsPanel({ width }) {
  const { state, set } = useDemo();
  const { threads, threadsByChannel, findThread } = useLiveData();
  const [openThread, setOpenThread] = useState({ '305': null, '718': null, inv: null, staff: null });

  // Per-message 1-hour reminders — lifted into the panel so the gold "set" state
  // survives thread open/close and lane reflow. Mock-only: fixed 1h, no picker.
  const [remindIds, setRemindIds] = useState(() => new Set());
  const toggleRemind = (threadId) => {
    setRemindIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const setOpen = (sub, id) => {
    setOpenThread((s) => ({ ...s, [sub]: id }));
  };

  // External signal from InvestorsPanel — open chat in inv sub-pillar
  useEffect(() => {
    const tid = state.openInvestorChat;
    if (!tid) return;
    if (typeof tid === 'string' && tid.startsWith('no-thread:')) {
      setOpen('inv', null);
    } else {
      setOpen('inv', tid);
    }
    set('openInvestorChat', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.openInvestorChat]);

  // Open a conversation from the RECENT strips — route to the right lane by tag/channel.
  useEffect(() => {
    const tid = state.openChat;
    if (!tid) return;
    const t = findThread(tid);
    if (t) {
      let sub = '305';
      if (t.isInvestor) sub = 'inv';
      else if (t.staffTag) sub = 'staff';
      else if (t.channel && t.channel.startsWith('718')) sub = '718';
      setOpen(sub, tid);
    }
    set('openChat', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.openChat]);

  // Fixed equal-width columns — they NEVER collapse to stripes. Each lane independently
  // shows its thread list, OR (when a thread is open in it) that conversation in place.
  // Several lanes can be open at once, side by side; the others stay full & readable.
  return (
    <PanelShell width={width} accent={CH.investor.hex} title="COMMS" subtitle="305 · 718 · STAFF · INVESTORS">
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {SUB_PILLARS.map((sp, i) => (
          <SubPillar
            key={sp.id}
            sp={sp}
            openId={openThread[sp.id]}
            setOpen={(id) => setOpen(sp.id, id)}
            divider={i < SUB_PILLARS.length - 1}
            remindIds={remindIds}
            toggleRemind={toggleRemind}
            threads={threads}
            threadsByChannel={threadsByChannel}
            findThread={findThread}
          />
        ))}
      </div>
    </PanelShell>
  );
}

function SubPillar({ sp, openId, setOpen, divider, remindIds, toggleRemind, threads, threadsByChannel, findThread }) {
  // Staff lane filters by thread.staffTag === true (mirrors the isInvestor pattern).
  // 305/718 still pull from threadsByChannel; inv pulls the investor cohort.
  const allThreads =
    sp.id === 'staff'
      ? threads.filter((t) => t.staffTag === true)
      : threadsByChannel(sp.id === 'inv' ? 'investors' : sp.id);
  // v4 §B31 — Exclusivity: investors AND staff are pulled OUT of 305 / 718 sub-pillars
  // and shown only in their own lane (Staff = teal). inv/staff lanes keep their own cohort as-is.
  const list =
    sp.id === 'inv' || sp.id === 'staff'
      ? allThreads
      : allThreads.filter((t) => !t.isInvestor && !t.staffTag);
  const open = openId ? findThread(openId) : null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: divider ? `1px solid ${semantic.divider}` : 'none',
        minWidth: 0,
        background: '#FFFFFF'
      }}
    >
      {/* Channel-variant header bands */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            padding: '8px 12px',
            background: '#F8FAFC',
            borderBottom: `1px solid ${semantic.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 800, color: ink[700], letterSpacing: '0.08em' }}>
            {sp.label}
            {open && (
              <span style={{ marginLeft: 8, fontSize: 13, color: CH.investor.hex, fontWeight: 800, letterSpacing: '0.14em' }}>
                · OPEN
              </span>
            )}
          </span>
          <span style={{ fontSize: 14, color: ink[300], fontWeight: 700 }}>
            {list.length} threads
          </span>
        </div>
        <div style={{ display: 'flex', height: 22 }}>
          {sp.bands.map((b, idx) => (
            <div
              key={b.channelKey}
              style={{
                flex: 1,
                background: b.color,
                color: contrastOn(b.color),
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: idx < sp.bands.length - 1 ? '1px solid rgba(0,0,0,0.16)' : 'none'
              }}
            >
              {sp.id === 'inv' ? '★ INVESTOR' : sp.id === 'staff' ? '◆ STAFF' : `${sp.id} ${b.variant}`}
            </div>
          ))}
        </div>
      </div>

      {/* Body — conversation in place when open, else the thread list. Lane never collapses. */}
      {open ? (
        <ThreadView
          thread={open}
          onClose={() => setOpen(null)}
          reminded={remindIds?.has(open.id)}
          onToggleRemind={() => toggleRemind?.(open.id)}
        />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {list.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              onOpen={() => setOpen(t.id)}
              reminded={remindIds?.has(t.id)}
              onToggleRemind={() => toggleRemind?.(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadRow({ thread, onOpen, reminded = false, onToggleRemind }) {
  const isHe = thread.language === 'he';
  const ch = CH[thread.channel];
  const tierHex = thread.tier ? TIER[thread.tier]?.hex : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        padding: '8px 12px 8px 18px',
        background: '#FFFFFF',
        border: 'none',
        borderBottom: `1px solid ${semantic.divider}`,
        cursor: 'pointer',
        textAlign: isHe ? 'right' : 'left',
        direction: isHe ? 'rtl' : 'ltr',
        fontFamily: 'inherit'
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 7 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: ch?.hex || ink[300],
            flexShrink: 0
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 700, color: ink[700], flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {thread.isInvestor && <Star size={10} fill={CH.investor.hex} stroke={CH.investor.hex} style={{ display: 'inline', marginRight: 3 }} />}
          {thread.contactName}
        </span>
        {thread.unread > 0 && (
          <span
            style={{
              background: ch?.hex || '#1E88E5',
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '0 6px',
              fontSize: 14,
              fontWeight: 800,
              minWidth: 16,
              textAlign: 'center'
            }}
          >
            {thread.unread}
          </span>
        )}
        <span style={{ fontSize: 14, color: ink[300] }}>{fmtRelative(thread.lastTs)}</span>
        <RemindBell reminded={reminded} onToggle={onToggleRemind} />
      </div>
      <div
        className={isHe ? 'hebrew' : ''}
        style={{
          fontSize: 16,
          color: ink[500],
          lineHeight: 1.35,
          maxHeight: 30,
          overflow: 'hidden'
        }}
      >
        {thread.preview}
      </div>
    </button>
  );
}

/**
 * ThreadView — v4 §B5 (Nora-on-top + combined reply zone + faded card bg)
 *
 * Order top→bottom (locked, handoff §3.10):
 *   1. Header (channel · name · ★ Profile · Schedule · Zoom · Listen · remind 1h · X)
 *   2. Nora's elevated read (no size cap, always present) — AUTOMATIC
 *   3. Reply zone (combined with Nora's draft, AUTOMATIC) — NORA DRAFT + Attach / Voice note / Listen / Record / Send
 *   4. Newest message (the one being replied to)
 *   5. Older messages push down
 *
 * Faded card bg = channel.faded on the WHOLE opened thread.
 * Reply box border + Send button pick up channel color so you always know which channel you're on.
 */
function ThreadView({ thread, onClose, reminded = false, onToggleRemind }) {
  const { set } = useDemo();
  const isHe = thread.language === 'he';
  const isFamily = thread.familyTag === true;
  const ch = CH[thread.channel];
  const fadedBg = ch?.faded || '#F9FAFB';

  // Newest first sort
  const sortedMessages = [...(thread.messages || [])].sort(
    (a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)
  );
  const newestMessage = sortedMessages[0];
  const olderMessages = sortedMessages.slice(1);

  // Nora drafts AUTOMATICALLY — her suggested reply pre-fills the box on open (mode 'draft').
  const defaultDraft = thread.noraDraft
    || `${thread.contactName?.split(' ')[0] || 'Hi'} — got it. Reviewing now; I'll revert with our position shortly. — Gideon`;
  // Family is private — Nora does NOT auto-suggest. Box opens empty for you to write.
  const [replyMode, setReplyMode] = React.useState(isFamily ? 'cleared' : 'draft');
  const [replyText, setReplyText] = React.useState(isFamily ? '' : defaultDraft);

  // Invite-to-Zoom — drop a realistic fake zoom.us/j/<11 digits> link into the reply box for review.
  // Never auto-sends: it switches the box into editing so Gideon sees + can tweak the link before Send.
  const dropZoomLink = () => {
    const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    const link = `https://zoom.us/j/${digits}`;
    setReplyText((prev) => (prev && prev.trim() ? `${prev}\n${link}` : link));
    setReplyMode('editing');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: fadedBg }}>
      {/* Header */}
      <div
        style={{
          padding: '8px 10px',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          flexShrink: 0
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 999, background: ch?.hex || ink[300] }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ink[700] }}>{thread.contactName}</div>
          <div style={{ fontSize: 14, color: ch?.hex, fontWeight: 700, letterSpacing: '0.08em' }}>{ch?.label}</div>
        </div>
        {thread.isInvestor && thread.contactId && (
          <button
            type="button"
            onClick={() => { set('investorOpenId', thread.contactId); set('investorState', 'profile-conversation'); }}
            style={headerActionStyle(CH.investor.hex, '#FFFFFF')}
            title="Open Profile (★ only way to surface drawer)"
          >
            <Star size={11} fill="#FFFFFF" stroke="#FFFFFF" /> Profile
          </button>
        )}
        <button
          type="button"
          onClick={dropZoomLink}
          style={headerActionStyle('#2D8CFF')}
          title="Invite to Zoom — drops a meeting link into the reply box for review (does not auto-send)"
        >
          <Video size={11} strokeWidth={2.4} /> Zoom
        </button>
        <ListenButton compact />
        <ReminderPicker />
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: ink[500], cursor: 'pointer', padding: 4 }}
          title="Close thread (this sub-pillar restores; other sub-pillars reflow)"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* Nora's elevated read — but Family is private (Nora stays out) */}
      {isFamily
        ? <FamilyPrivateNote />
        : <NoraElevatedRead block={thread.noraBlock} channel={ch} />}

      {/* Combined reply zone — NORA DRAFT + Send / Edit / Clear & write my own (handoff §3.10 #3) */}
      <ReplyZone
        ch={ch}
        defaultDraft={defaultDraft}
        replyMode={replyMode}
        setReplyMode={setReplyMode}
        replyText={replyText}
        setReplyText={setReplyText}
        isHe={isHe}
      />

      {/* Newest message (the one being replied to) — handoff §3.10 #4 */}
      {newestMessage && (
        <div style={{ padding: '6px 8px 0', flexShrink: 0 }} dir={isHe ? 'rtl' : 'ltr'}>
          <Message m={newestMessage} ch={ch} contactName={thread.contactName} isHe={isHe} highlight />
        </div>
      )}

      {/* Older messages push down — handoff §3.10 #5 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        {olderMessages.map((m) => (
          <Message key={m.id} m={m} ch={ch} contactName={thread.contactName} isHe={isHe} />
        ))}
      </div>
    </div>
  );
}

function NoraElevatedRead({ block, channel: ch }) {
  if (!block) {
    return (
      <div
        style={{
          margin: '8px',
          padding: '8px 12px',
          background: '#FFFFFF',
          border: `1px dashed ${semantic.border}`,
          borderRadius: 8,
          fontSize: 16,
          color: ink[300],
          fontStyle: 'italic',
          flexShrink: 0
        }}
      >
        Nora's read landing as the thread loads…
      </div>
    );
  }
  const tierHex = TIER[block.tier]?.hex || '#FFCC33';
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: ink[500], letterSpacing: '0.12em' }}>
            NORA · ELEVATED READ
          </span>
          <span
            style={{
              background: tierHex,
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '1px 7px',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.06em'
            }}
          >
            {TIER[block.tier]?.label}
          </span>
        </div>
        <ListenButton compact />
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.55, color: ink[700], marginBottom: 8 }}>
        {block.content}
      </div>
      {block.actions && block.actions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {block.actions.map((a) => (
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
      )}
    </div>
  );
}

function ReplyZone({ ch, defaultDraft, replyMode, setReplyMode, replyText, setReplyText, isHe }) {
  const channelColor = ch?.hex || '#1E88E5';
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
        padding: 0,
        background: '#FFFFFF',
        border: `2px solid ${channelColor}`,
        borderRadius: 8,
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {/* Status label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 10px',
          background: ch?.faded || '#F8FAFC',
          borderBottom: `1px solid ${channelColor}33`
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: ch?.textOnFaded || ink[500], letterSpacing: '0.12em' }}>
          {labelText}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: ch?.textOnFaded || ink[300], letterSpacing: '0.08em' }}>
          → {ch?.label || 'channel'}
        </span>
      </div>

      {/* Draft body */}
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
            padding: '8px 12px',
            fontSize: 19,
            lineHeight: 1.5,
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
            padding: '8px 12px',
            fontSize: 19,
            lineHeight: 1.5,
            color: ink[700],
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 60,
            direction: isHe ? 'rtl' : 'ltr'
          }}
        />
      )}
      {replyMode === 'cleared' && (
        <input
          autoFocus
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Speak or type your own reply"
          className={isHe ? 'hebrew' : ''}
          style={{
            display: 'block',
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '10px 12px',
            fontSize: 19,
            color: ink[700],
            fontFamily: 'inherit',
            direction: isHe ? 'rtl' : 'ltr'
          }}
        />
      )}

      {/* Actions row */}
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
          onClick={() => { /* fire send */ }}
          style={{
            background: channelColor,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Send size={12} strokeWidth={2.6} /> {sendLabel}
        </button>
        {/* Dictation — two explicit language buttons (Gideon 2026-06-16): tap the language you'll speak */}
        <DictateButtons />
        {/* Attachment — WhatsApp-style paperclip (mock: no real file picker) */}
        <button
          type="button"
          onClick={() => { /* mock attach */ }}
          style={replyIconActionStyle()}
          title="Attach a file"
          aria-label="Attach a file"
        >
          <Paperclip size={15} strokeWidth={2.2} />
        </button>
        {/* Voice message — records & "sends" a voice NOTE (distinct from the dictation Record button) */}
        <VoiceNoteButton channelColor={channelColor} />
        {replyMode !== 'editing' && (
          <button
            type="button"
            onClick={() => setReplyMode('editing')}
            style={replyActionStyle()}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => { setReplyText(''); setReplyMode('cleared'); }}
          style={replyActionStyle()}
          title="Clear & write my own (this reply only — Nora drafts again next round)"
        >
          Clear &amp; write my own
        </button>
        {replyMode !== 'draft' && (
          <button
            type="button"
            onClick={() => { setReplyText(defaultDraft); setReplyMode('draft'); }}
            style={replyActionStyle()}
            title="Restore Nora's draft"
          >
            ↺ Nora draft
          </button>
        )}
        <span style={{ flex: 1 }} />
        {/* Listen (TTS) on every reply box — dictation is the two language buttons above */}
        <ListenButton compact />
      </div>
    </div>
  );
}

function Message({ m, ch, contactName, isHe, highlight }) {
  return (
    <div
      className={isHe ? 'hebrew' : ''}
      style={{
        padding: '6px 10px 6px 16px',
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderLeft: `4px solid ${ch?.hex || ink[300]}`,
        boxShadow: highlight ? `0 0 0 2px ${ch?.hex || '#FFCC33'}55` : 'none',
        borderRadius: 6,
        alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        fontSize: 18,
        lineHeight: 1.4,
        color: ink[700]
      }}
    >
      <div style={{ fontSize: 13, color: ink[300], marginBottom: 2, fontWeight: 700, letterSpacing: '0.05em' }}>
        {m.from === 'me' ? 'GIDEON' : (contactName || '').toUpperCase()}
        {highlight && <span style={{ marginLeft: 6, color: ch?.hex, fontWeight: 800 }}>· NEWEST</span>}
      </div>
      {m.body}
    </div>
  );
}

/**
 * RemindBell — per-thread "remind in 1 hour" toggle. Fixed 1h, no picker (mock-only).
 * Rendered inside the always-visible meta row of a ThreadRow, which is itself a <button>.
 * MUST be a span role="button" with stopPropagation — never a nested real <button>.
 * Gold (#FFCC33) when a reminder is set; muted otherwise.
 */
function RemindBell({ reminded = false, onToggle }) {
  const gold = '#FFCC33';
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={reminded ? 'Reminder set for 1 hour — tap to clear' : 'Remind me in 1 hour'}
      title={reminded ? 'Reminder set · in 1 hour (tap to clear)' : 'Remind me in 1 hour'}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle?.(); }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
        cursor: 'pointer',
        borderRadius: 6,
        padding: '2px 5px',
        background: reminded ? `${gold}26` : 'transparent',
        border: `1px solid ${reminded ? gold : 'rgba(15,23,42,0.16)'}`,
        color: reminded ? '#92400E' : ink[300],
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.04em',
        lineHeight: 1
      }}
    >
      <Clock size={12} strokeWidth={2.4} color={reminded ? gold : undefined} />
      1h
    </span>
  );
}

/**
 * ReminderPicker — Gideon's change: a reminder with OPTIONS, not a fixed 1h.
 * 1h / 2h / 3h / 6h / Tomorrow. Lives in the open-thread header where there's room.
 * Mock: local single-select; gold when chosen.
 */
const REMIND_OPTIONS = ['1h', '2h', '3h', '6h', 'Tomorrow'];
function ReminderPicker() {
  const [sel, setSel] = React.useState(null);
  const gold = '#FFCC33';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, color: ink[300], letterSpacing: '0.04em' }}>
        <Clock size={12} strokeWidth={2.4} /> Remind:
      </span>
      {REMIND_OPTIONS.map((o) => {
        const on = sel === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => setSel(on ? null : o)}
            title={`Remind me in ${o}`}
            style={{
              background: on ? `${gold}26` : '#FFFFFF',
              border: `1px solid ${on ? gold : 'rgba(15,23,42,0.16)'}`,
              color: on ? '#92400E' : ink[500],
              borderRadius: 6,
              padding: '2px 7px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              lineHeight: 1
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * FamilyPrivateNote — replaces Nora's elevated read on Family threads.
 * Nora does not read or auto-suggest in the family lane.
 */
function FamilyPrivateNote() {
  return (
    <div
      style={{
        margin: '8px',
        padding: '8px 12px',
        background: 'rgba(67,160,71,0.08)',
        border: '1px solid rgba(67,160,71,0.35)',
        borderRadius: 8,
        fontSize: 16,
        color: '#2E7D32',
        fontWeight: 600,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      <Home size={14} strokeWidth={2.4} /> Family — private. Nora doesn’t read or suggest here.
    </div>
  );
}

function replyActionStyle() {
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

// Icon-only variant of the reply action button (paperclip etc.) — same chrome, square padding.
function replyIconActionStyle() {
  return {
    background: '#F8FAFC',
    color: ink[700],
    border: `1px solid ${semantic.border}`,
    borderRadius: 6,
    padding: '5px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
}

/**
 * VoiceNoteButton — records & "sends" a WhatsApp-style voice NOTE.
 * Distinct from RecordButton (which is dictation → transcribes into the text box).
 * Idle = "Voice note" mic; recording = red "Send note" stop affordance. Mock-only: no real audio.
 */
function VoiceNoteButton({ channelColor }) {
  const [recording, setRecording] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setRecording((r) => !r)}
      title={recording ? 'Stop & send voice note' : 'Record a voice note'}
      aria-label={recording ? 'Stop and send voice note' : 'Record a voice note'}
      style={{
        background: recording ? '#E53935' : '#F8FAFC',
        color: recording ? '#FFFFFF' : ink[700],
        border: `1px solid ${recording ? '#E53935' : semantic.border}`,
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }}
    >
      {recording
        ? <><Send size={13} strokeWidth={2.6} /> Send note</>
        : <><Mic size={13} strokeWidth={2.4} /> Voice note</>}
    </button>
  );
}

function contrastOn(hex) {
  if (!hex) return '#FFFFFF';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 170 ? '#1E293B' : '#FFFFFF';
}

function headerActionStyle(bg, fg) {
  return {
    background: bg,
    color: fg || '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0
  };
}
