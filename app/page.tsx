'use client'

import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import CallButton from '@/components/chat/CallButton'
import ChatList from '@/components/chat/ChatList'
import MessageView from '@/components/chat/MessageView'
import ReplyBox from '@/components/chat/ReplyBox'
import TopBarConcierge from '@/components/chat/TopBarConcierge'
import PipedriveCard from '@/components/sidebar/PipedriveCard'
import TodayPanel from '@/components/sidebar/TodayPanel'
import NotesPanel from '@/components/sidebar/NotesPanel'
import InvestorChatPanel from '@/components/panels/InvestorChatPanel'
import BookingsPanel from '@/components/bookings/BookingsPanel'
import type { DashboardMessage, DashboardThread, Panel } from '@/lib/timelines/types'

// ── Import-names CSV button ───────────────────────────────────────────────────
function ImportNamesButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState('')

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('csv', file)
      const res = await fetch('/api/contacts/import-names', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setStatus('err')
        setMsg(json.message || json.error || `Error ${res.status}`)
      } else {
        setStatus('ok')
        setMsg(`✓ ${json.updated} updated, ${json.skipped} skipped`)
        setTimeout(() => { setStatus('idle'); setMsg('') }, 5000)
      }
    } catch (ex: unknown) {
      setStatus('err')
      setMsg((ex as Error).message)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const color =
    status === 'ok' ? '#22c55e' : status === 'err' ? '#ef4444' : 'rgba(188,156,69,0.85)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <button
        type="button"
        disabled={status === 'loading'}
        onClick={() => inputRef.current?.click()}
        title="Import contact names from CSV (columns: phone, name)"
        style={{
          background: 'transparent',
          color,
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '0.45rem 1rem',
          fontSize: 13,
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.02em',
          opacity: status === 'loading' ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {status === 'loading' ? '⏳' : '📋'} Import Names
      </button>
      {msg && (
        <span style={{ fontSize: 10, color, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {msg}
        </span>
      )}
    </div>
  )
}

// ── Panel view ────────────────────────────────────────────────────────────────

type PanelViewProps = {
  panel: Panel
  selected: DashboardThread | null
  onSelect: (thread: DashboardThread | null) => void
}

function PanelView({ panel, selected, onSelect }: PanelViewProps) {
  const queryClient = useQueryClient()
  const [showPipedrive, setShowPipedrive] = useState(false)

  const { data: messages } = useQuery({
    queryKey: ['messages', selected?.id],
    enabled: !!selected,
    queryFn: async (): Promise<DashboardMessage[]> => {
      if (!selected) return []
      const res = await fetch(`/api/whatsapp/messages?thread_id=${selected.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { messages: DashboardMessage[] }
      return json.messages
    },
    refetchOnWindowFocus: false,
  })

  const onOptimistic = useCallback(
    (m: DashboardMessage) => {
      if (!selected) return
      queryClient.setQueryData<DashboardMessage[]>(['messages', selected.id], (prev) => [
        ...(prev || []),
        m,
      ])
    },
    [queryClient, selected]
  )

  const onStatus = useCallback(
    (tempId: string, status: 'ok' | 'fail', real?: DashboardMessage) => {
      if (!selected) return
      queryClient.setQueryData<DashboardMessage[]>(['messages', selected.id], (prev) => {
        if (!prev) return prev
        if (status === 'ok' && real) {
          return prev.map((m) => (m.id === tempId ? real : m))
        }
        return prev.map((m) =>
          m.id === tempId ? { ...m, status: 'Failed' } : m
        )
      })
      if (status === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['threads', panel] })
      }
    },
    [queryClient, selected, panel]
  )

  const is718 = panel === '718'
  const headerBg = is718 ? 'var(--personal-bg)' : 'var(--rp-navy)'
  const headerText = is718 ? 'var(--personal-text)' : 'var(--rp-gold)'
  const headerMuted = is718 ? 'var(--personal-muted)' : 'var(--rp-gold-lite)'
  const borderColor = is718 ? 'var(--personal-border)' : 'var(--rp-border)'
  const phoneLabel = is718 ? '+1 (718) 550-5500' : '+1 (305) 778-4861'
  const title = is718 ? '718 — Personal' : '305 — RePrime'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: headerBg,
        color: headerText,
        borderRight: `1px solid ${borderColor}`,
        minWidth: 0,
      }}
    >
      <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: headerText, fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{title}</h1>
          <p style={{ color: headerMuted, margin: '0.1rem 0 0', fontSize: 12 }}>{phoneLabel}</p>
        </div>
        {selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <CallButton
              panel={panel}
              phone={selected.phone}
              isGroup={selected.is_group}
              contactName={selected.contact_name}
            />
            <button
              type="button"
              onClick={() => setShowPipedrive((v) => !v)}
              title={showPipedrive ? 'Hide CRM info' : 'Show CRM info'}
              style={{
                background: showPipedrive ? headerText : 'transparent',
                color: showPipedrive ? headerBg : headerMuted,
                border: `1px solid ${borderColor}`,
                borderRadius: 6,
                padding: '0.25rem 0.55rem',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
              }}
            >
              CRM
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ChatList
          panel={panel}
          selectedThreadId={selected?.id ?? null}
          onSelect={onSelect}
          hideInvestors
        />
        {selected ? (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 1rem 0', background: headerBg, flexShrink: 0 }}>
                <ReplyBox
                  panel={panel}
                  threadId={selected.id}
                  threadHistory={messages || []}
                  contact={{ name: selected.contact_name, phone: selected.phone }}
                  onOptimistic={onOptimistic}
                  onStatus={onStatus}
                />
              </div>
              <MessageView thread={selected} messages={messages || []} />
            </div>
            {showPipedrive && <PipedriveCard thread={selected} panel={panel} />}
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: headerMuted,
              fontSize: 13,
            }}
          >
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

type SelectionMap = Record<Panel, DashboardThread | null>

export default function Dashboard() {
  const [selections, setSelections] = useState<SelectionMap>({ '718': null, '305': null })
  const [activeThread, setActiveThread] = useState<DashboardThread | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)

  const select = useCallback(
    (panel: Panel) => (thread: DashboardThread | null) => {
      setSelections((prev) => ({ ...prev, [panel]: thread }))
      if (thread) setActiveThread(thread)
    },
    []
  )

  return (
    <>
      <TodayPanel />

      {/* ── Top control bar ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.28rem 0.9rem',
          background: '#080F24',
          borderBottom: '1px solid rgba(188,156,69,0.18)',
          gap: 10,
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {/* Utility buttons */}
        <ImportNamesButton />
        <button
          type="button"
          onClick={() => setShowTerminal(true)}
          style={{
            background: 'transparent',
            color: 'rgba(188,156,69,0.85)',
            border: '1px solid rgba(188,156,69,0.45)',
            borderRadius: 6,
            padding: '0.45rem 1rem',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          ✉ Terminal
        </button>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(188,156,69,0.2)', flexShrink: 0 }} />

        {/* Concierge quick-actions — target whoever's chat is open */}
        <TopBarConcierge activeThread={activeThread} />

        {/* Active-thread indicator */}
        {activeThread && (
          <span
            style={{
              fontSize: 10,
              color: 'rgba(188,156,69,0.55)',
              flexShrink: 0,
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            → {activeThread.contact_name || activeThread.phone}
          </span>
        )}
      </div>

      {showTerminal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(10,20,48,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTerminal(false) }}
        >
          <BookingsPanel onClose={() => setShowTerminal(false)} />
        </div>
      )}

      <main style={{ display: 'flex', flex: 1, minHeight: 0, width: '100vw' }}>
        {/* ── 305 — RePrime (left) ── */}
        <PanelView
          panel="305"
          selected={selections['305']}
          onSelect={select('305')}
        />
        {/* ── 718 — Personal (center) ── */}
        <PanelView
          panel="718"
          selected={selections['718']}
          onSelect={select('718')}
        />
        {/* ── Investors (right) ── */}
        <InvestorChatPanel />
      </main>
      <NotesPanel />
    </>
  )
}
