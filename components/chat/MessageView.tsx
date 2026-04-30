'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { isHebrew } from '@/lib/timelines/parse'
import type { DashboardMessage, DashboardThread } from '@/lib/timelines/types'
import TagChips from './TagChips'

type Props = {
  thread: DashboardThread
  messages: DashboardMessage[]
}

const PANEL_THEME = {
  '718': {
    bg: 'var(--personal-bg)',
    surface: 'var(--personal-surface)',
    border: 'var(--personal-border)',
    text: 'var(--personal-text)',
    muted: 'var(--personal-muted)',
    outBg: 'var(--personal-accent)',
    outText: '#fff',
    inBg: 'var(--personal-surface)',
    inText: 'var(--personal-text)',
  },
  '305': {
    bg: 'var(--rp-navy)',
    surface: 'var(--rp-surface)',
    border: 'var(--rp-border)',
    text: 'var(--rp-white)',
    muted: 'var(--rp-gold-lite)',
    outBg: 'var(--rp-gold)',
    outText: 'var(--rp-navy)',
    inBg: 'var(--rp-surface)',
    inText: 'var(--rp-white)',
  },
} as const

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDay(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function MediaBlock({ msg }: { msg: DashboardMessage }) {
  const [expanded, setExpanded] = useState(false)
  if (!msg.media_url) return null
  if (msg.media_type === 'image') {
    return (
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'zoom-in', display: 'block' }}
      >
        <img
          src={msg.media_url}
          alt={msg.media_filename || 'image'}
          style={{
            maxWidth: expanded ? 600 : 220,
            maxHeight: expanded ? 600 : 220,
            borderRadius: 6,
            display: 'block',
          }}
        />
      </button>
    )
  }
  if (msg.media_type === 'audio') {
    return (
      <audio controls src={msg.media_url} style={{ maxWidth: 280, marginTop: 4 }}>
        Your browser does not support audio.
      </audio>
    )
  }
  if (msg.media_type === 'video') {
    return (
      <video controls src={msg.media_url} style={{ maxWidth: 320, maxHeight: 320, borderRadius: 6, marginTop: 4 }} />
    )
  }
  return (
    <a
      href={msg.media_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        color: 'inherit',
        marginTop: 4,
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.06)',
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <span style={{ fontSize: 18 }}>📄</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
        {msg.media_filename || 'attachment'}
      </span>
    </a>
  )
}

export default function MessageView({ thread, messages }: Props) {
  const theme = PANEL_THEME[thread.panel]
  const scrollRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const ta = a.sent_at ? new Date(a.sent_at).getTime() : 0
      const tb = b.sent_at ? new Date(b.sent_at).getTime() : 0
      return ta - tb
    })
  }, [messages])

  // Always scroll to bottom: when thread switches OR when new messages arrive
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [thread.id, sorted.length])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: theme.bg,
        color: theme.text,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: theme.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {thread.contact_name || thread.phone}
          </h2>
          <span style={{ color: theme.muted, fontSize: 12 }}>{thread.phone}</span>
          {thread.is_group && (
            <span style={{ color: theme.muted, fontSize: 11, marginLeft: 'auto' }}>group</span>
          )}
        </div>
        <TagChips threadId={thread.id} panel={thread.panel} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' }}>
        {sorted.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted, fontSize: 13 }}>No messages yet.</div>
        ) : (
        <>
        {/* Spacer: pushes messages to the bottom so reply box is right below the last message */}
        <div style={{ flex: '1 1 0' }} />
        {sorted.map((m, idx) => {
          const prev = sorted[idx - 1]
          const showDay =
            !prev ||
            (m.sent_at &&
              prev.sent_at &&
              new Date(m.sent_at).toDateString() !== new Date(prev.sent_at).toDateString())
          const isOut = m.direction === 'out'
          const rtl = isHebrew(m.body)
          return (
            <div key={m.id}>
              {showDay && (
                <div
                  style={{
                    textAlign: 'center',
                    color: theme.muted,
                    fontSize: 11,
                    margin: '12px 0 8px',
                  }}
                >
                  {formatDay(m.sent_at)}
                </div>
              )}
              {thread.is_group && !isOut && m.from_name && (
                <div
                  style={{
                    fontSize: 11,
                    color: theme.muted,
                    marginLeft: 6,
                    marginBottom: 2,
                  }}
                >
                  {m.from_name}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: isOut ? 'flex-end' : 'flex-start',
                  marginBottom: 6,
                }}
              >
                <div
                  dir={rtl ? 'rtl' : undefined}
                  style={{
                    background: isOut ? theme.outBg : theme.inBg,
                    color: isOut ? theme.outText : theme.inText,
                    padding: '0.45rem 0.7rem',
                    borderRadius: 12,
                    maxWidth: '70%',
                    fontSize: 14,
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
                  }}
                >
                  {m.body && (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  )}
                  <MediaBlock msg={m} />
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.7,
                      marginTop: 2,
                      textAlign: rtl ? 'left' : 'right',
                    }}
                  >
                    {formatTime(m.sent_at)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </>
        )}
      </div>
    </div>
  )
}
