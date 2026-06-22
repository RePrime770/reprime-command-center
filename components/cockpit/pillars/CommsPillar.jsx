import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { warm, ink, info, success, channel as CH, tier as TIER } from '../lib/colors.js';
import { threads, threadsByChannel, findThread } from '../data/threads.js';
import TierStripe from '../primitives/TierStripe.jsx';
import ChannelIcon from '../primitives/ChannelIcon.jsx';
import ListenButton from '../primitives/ListenButton.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Comms pillar — leftmost always-visible pillar.
 * 1555px FIXED width (Doc B Section 1.2 — never compresses).
 * 3 sub-pillars: 305 / 718 / Investors. Open-thread expands one; other two collapse to 24px bars.
 * Newest at TOP. Reply box at bottom of expanded thread.
 */
const subs = [
  { id: '305', label: '305',       filter: '305',       bandBg: warm[700], bandFg: warm[50] },
  { id: '718', label: '718',       filter: '718',       bandBg: success[500], bandFg: warm[50] },
  { id: 'inv', label: 'Investors', filter: 'investors', bandBg: info[500], bandFg: warm[50] }
];

export default function CommsPillar({ height }) {
  const { state, set } = useDemo();
  const [openThreadId, setOpenThreadId] = useState(null);
  const [activeSub, setActiveSub] = useState('305');

  const openThread = (id) => {
    setOpenThreadId(id);
    if (state.commsState === 'default') {
      set('commsState', 'open-with-nora-block');
    }
  };

  const closeThread = () => {
    setOpenThreadId(null);
    set('commsState', 'default');
  };

  const thread = openThreadId ? findThread(openThreadId) : null;
  const showNoraBlock =
    thread?.noraBlock && state.commsState !== 'open-without-nora-block';

  return (
    <div
      style={{
        width: 1555,
        height,
        background: warm[300],
        border: `2px solid ${ink[700]}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <PillarHeader title="Communications" />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Default 3-sub-pillar layout */}
        {!thread &&
          subs.map((s, i) => (
            <SubPillar
              key={s.id}
              label={s.label}
              filter={s.filter}
              bandBg={s.bandBg}
              bandFg={s.bandFg}
              borderRight={i < subs.length - 1}
              onOpen={openThread}
              active={activeSub === s.id}
            />
          ))}

        {/* Open thread: selected sub expands, others collapse to bars */}
        {thread && (
          <>
            {subs.map((s) =>
              s.filter === channelFamily(thread.channel) || (s.filter === 'investors' && thread.isInvestor)
                ? null
                : <CollapsedBar key={s.id} label={s.label} onClick={() => closeThread()} />
            )}
            <ThreadView
              thread={thread}
              showNoraBlock={showNoraBlock}
              onToggleNora={() =>
                set(
                  'commsState',
                  state.commsState === 'open-with-nora-block'
                    ? 'open-without-nora-block'
                    : 'open-with-nora-block'
                )
              }
              onClose={closeThread}
            />
          </>
        )}
      </div>
    </div>
  );
}

function channelFamily(ch) {
  if (ch.startsWith('305')) return '305';
  if (ch.startsWith('718')) return '718';
  return 'other';
}

function PillarHeader({ title }) {
  return (
    <div
      style={{
        padding: '14px 22px',
        background: warm[200],
        borderBottom: `2px solid ${ink[700]}`,
        fontSize: '24px',
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: ink[700],
        flexShrink: 0,
        textTransform: 'uppercase'
      }}
    >
      {title}
    </div>
  );
}

function CollapsedBar({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        background: warm[100],
        borderRight: `1px solid ${warm[700]}`,
        color: ink[500],
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}
    >
      {label}
    </button>
  );
}

function SubPillar({ label, filter, bandBg, bandFg, borderRight, onOpen }) {
  const list = threadsByChannel(filter);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: borderRight ? `2px solid ${ink[700]}` : 'none',
        minWidth: 0
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          background: bandBg,
          color: bandFg,
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderBottom: `2px solid ${ink[700]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: '16px', opacity: 0.95 }}>{list.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: warm[300] }}>
        {list.map((t) => (
          <ThreadRow key={t.id} thread={t} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function ThreadRow({ thread, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(thread.id)}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: thread.language === 'he' ? 'right' : 'left',
        direction: thread.language === 'he' ? 'rtl' : 'ltr',
        background: warm[50],
        border: 'none',
        borderBottom: `2px solid ${ink[700]}`,
        padding: '14px 20px 14px 36px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: ink[700],
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}
    >
      <TierStripe tier={thread.tier} width={8} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ChannelIcon channel={thread.channel} size={18} />
        <span
          style={{
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.03em'
          }}
        >
          {thread.contactName}
        </span>
        {thread.unread > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              background: info[500],
              color: '#FCF6EA',
              borderRadius: 9999,
              padding: '2px 10px',
              fontSize: '14px',
              fontWeight: 700
            }}
          >
            {thread.unread}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '22px',
          color: ink[500],
          lineHeight: 1.4,
          maxHeight: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '0.02em'
        }}
        className={thread.language === 'he' ? 'hebrew' : ''}
      >
        {thread.preview}
      </div>
    </button>
  );
}

function ThreadView({ thread, showNoraBlock, onToggleNora, onClose }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: warm[100],
        minWidth: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          background: warm[200],
          borderBottom: `2px solid ${ink[700]}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <ChannelIcon channel={thread.channel} size={22} />
        <span style={{ fontSize: '22px', fontWeight: 700 }}>{thread.contactName}</span>
        <span style={{ fontSize: '16px', color: ink[500] }}>
          {CH[thread.channel]?.label}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onClose}
          style={{
            background: warm[200],
            border: `1px solid ${warm[700]}`,
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '14.66px',
            fontWeight: 700,
            cursor: 'pointer',
            color: ink[700],
            fontFamily: 'inherit'
          }}
        >
          Close
        </button>
      </div>

      {/* Nora block */}
      {showNoraBlock && (
        <div
          style={{
            position: 'relative',
            margin: '16px 20px 0',
            padding: '18px 22px 18px 28px',
            background: warm[200],
            border: `1px solid ${warm[700]}`,
            borderRadius: 10
          }}
        >
          <TierStripe tier={thread.noraBlock.tier} width={4} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: ink[500], marginBottom: 8 }}>
            NORA · {TIER[thread.noraBlock.tier]?.label}
          </div>
          <div style={{ fontSize: '22px', lineHeight: 1.4, marginBottom: 12 }}>
            {thread.noraBlock.content}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {thread.noraBlock.actions.map((a) => (
              <button
                key={a}
                style={{
                  background: warm[100],
                  border: `1px solid ${warm[700]}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: ink[700]
                }}
              >
                {a}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <ListenButton />
            <button
              type="button"
              onClick={onToggleNora}
              style={{
                background: 'transparent',
                border: `1px solid ${warm[600]}`,
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '14.66px',
                color: ink[500],
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Hush
            </button>
          </div>
        </div>
      )}

      {/* Messages — newest at TOP */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 12
        }}
        dir={thread.language === 'he' ? 'rtl' : 'ltr'}
      >
        {thread.messages.map((m) => (
          <div
            key={m.id}
            style={{
              position: 'relative',
              padding: '12px 18px 12px 26px',
              background: m.from === 'me' ? warm[50] : warm[100],
              border: `2px solid ${ink[700]}`,
              borderLeft: `8px solid ${CH[thread.channel]?.hex || ink[700]}`,
              borderRadius: 10,
              alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
              maxWidth: '78%'
            }}
            className={thread.language === 'he' ? 'hebrew' : ''}
          >
            <div style={{ fontSize: '14.66px', color: ink[500], marginBottom: 4 }}>
              {m.from === 'me' ? 'Gideon' : thread.contactName}
            </div>
            <div style={{ fontSize: '22px', lineHeight: 1.4 }}>{m.body}</div>
          </div>
        ))}
      </div>

      {/* Reply */}
      <div
        style={{
          padding: '14px 20px',
          background: warm[50],
          borderTop: `1px solid ${warm[600]}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <input
          type="text"
          placeholder="Speak or type — Nora drafts in voice"
          style={{
            flex: 1,
            padding: '12px 14px',
            background: warm[400],
            border: `1px solid ${warm[700]}`,
            borderRadius: 8,
            fontSize: '22px',
            fontFamily: 'inherit',
            color: ink[700],
            letterSpacing: '0.04em'
          }}
        />
        <button
          type="button"
          style={{
            background: info[500],
            color: '#FCF6EA',
            border: `1px solid ${info[700]}`,
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Send size={18} strokeWidth={2.4} /> Send
        </button>
      </div>
    </div>
  );
}
