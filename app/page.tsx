'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ChatList from '@/components/chat/ChatList'
import MessageView from '@/components/chat/MessageView'
import ReplyBox from '@/components/chat/ReplyBox'
import PipedriveCard from '@/components/sidebar/PipedriveCard'
import TodayPanel from '@/components/sidebar/TodayPanel'
import NotesPanel from '@/components/sidebar/NotesPanel'
import InvestorPanel, { type InvestorPanelJump } from '@/components/panels/InvestorPanel'
import type { DashboardMessage, DashboardThread, Panel } from '@/lib/timelines/types'

type SelectionMap = Record<Panel, DashboardThread | null>

type PanelViewProps = {
  panel: Panel
  selected: DashboardThread | null
  onSelect: (thread: DashboardThread | null) => void
  pendingThreadId: string | null
  onPendingConsumed: () => void
}

function PanelView({ panel, selected, onSelect, pendingThreadId, onPendingConsumed }: PanelViewProps) {
  const queryClient = useQueryClient()

  const messagesKey = ['messages', selected?.id] as const

  const { data: messages } = useQuery({
    queryKey: messagesKey,
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

  // If a jump from InvestorPanel asked for a specific thread on this panel,
  // pick it from the threads cache once it lands.
  const cachedThreads = queryClient.getQueryData<DashboardThread[]>(['threads', panel])
  useEffect(() => {
    if (!pendingThreadId) return
    const list = cachedThreads
    if (!list) return
    const match = list.find((t) => t.id === pendingThreadId)
    if (match) {
      onSelect(match)
      onPendingConsumed()
    }
  }, [pendingThreadId, cachedThreads, onSelect, onPendingConsumed])

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

  const isPersonal = panel === '718'
  const headerBg = isPersonal ? 'var(--personal-bg)' : 'var(--rp-navy)'
  const headerText = isPersonal ? 'var(--personal-text)' : 'var(--rp-gold)'
  const headerMuted = isPersonal ? 'var(--personal-muted)' : 'var(--rp-gold-lite)'
  const borderColor = isPersonal ? 'var(--personal-border)' : 'var(--rp-border)'
  const phoneLabel = isPersonal ? '+1 (718) 550-5500' : '+1 (305) 778-4861'
  const title = isPersonal ? '718 — Personal' : '305 — RePrime'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: headerBg,
        color: headerText,
        borderRight: isPersonal ? `1px solid ${borderColor}` : undefined,
        minWidth: 0,
      }}
    >
      <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${borderColor}` }}>
        <h1 style={{ color: headerText, fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{title}</h1>
        <p style={{ color: headerMuted, margin: '0.1rem 0 0', fontSize: 12 }}>{phoneLabel}</p>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ChatList
          panel={panel}
          selectedThreadId={selected?.id ?? null}
          onSelect={onSelect}
        />
        {selected ? (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <MessageView thread={selected} messages={messages || []} />
              <div style={{ padding: '0 1rem 0.75rem', background: headerBg }}>
                <ReplyBox
                  panel={panel}
                  threadId={selected.id}
                  threadHistory={messages || []}
                  contact={{ name: selected.contact_name, phone: selected.phone }}
                  onOptimistic={onOptimistic}
                  onStatus={onStatus}
                />
              </div>
            </div>
            <PipedriveCard thread={selected} panel={panel} />
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

function useViewportWidth(): number {
  const [w, setW] = useState(() =>
    typeof window === 'undefined' ? 1920 : window.innerWidth
  )
  useEffect(() => {
    const onResize = () => setW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return w
}

export default function Dashboard() {
  const width = useViewportWidth()
  const layout: 'three-col' | 'drawer' | 'mobile' = useMemo(() => {
    if (width >= 1800) return 'three-col'
    if (width >= 1200) return 'drawer'
    return 'mobile'
  }, [width])

  const [selections, setSelections] = useState<SelectionMap>({ '718': null, '305': null })
  const [pendingByPanel, setPendingByPanel] = useState<Record<Panel, string | null>>({
    '718': null,
    '305': null,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const select = useCallback(
    (panel: Panel) => (thread: DashboardThread | null) =>
      setSelections((prev) => ({ ...prev, [panel]: thread })),
    []
  )

  const consumePending = useCallback(
    (panel: Panel) => () => setPendingByPanel((prev) => ({ ...prev, [panel]: null })),
    []
  )

  const handleJump = useCallback((target: InvestorPanelJump) => {
    setPendingByPanel((prev) => ({ ...prev, [target.panel]: target.threadId }))
    if (layout === 'drawer') setDrawerOpen(false)
  }, [layout])

  const investorWidth = layout === 'three-col' ? 360 : 380

  return (
    <>
      <TodayPanel />
      <main style={{ display: 'flex', flex: 1, minHeight: 0, width: '100vw', position: 'relative' }}>
      <PanelView
        panel="718"
        selected={selections['718']}
        onSelect={select('718')}
        pendingThreadId={pendingByPanel['718']}
        onPendingConsumed={consumePending('718')}
      />
      <PanelView
        panel="305"
        selected={selections['305']}
        onSelect={select('305')}
        pendingThreadId={pendingByPanel['305']}
        onPendingConsumed={consumePending('305')}
      />

      {layout === 'three-col' && (
        <div style={{ width: investorWidth, flexShrink: 0, borderLeft: '1px solid var(--rp-border, rgba(188,156,69,0.25))' }}>
          <InvestorPanel onJump={handleJump} />
        </div>
      )}

      {layout === 'drawer' && (
        <>
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Toggle investor panel"
            style={{
              position: 'absolute',
              top: 12,
              right: drawerOpen ? investorWidth + 12 : 12,
              zIndex: 20,
              background: '#0A1430',
              color: 'var(--rp-gold, #BC9C45)',
              border: '1px solid var(--rp-gold, #BC9C45)',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'right 0.2s ease',
            }}
          >
            {drawerOpen ? 'Close investors' : 'Investors'}
          </button>
          {drawerOpen && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: investorWidth,
                zIndex: 15,
                boxShadow: '-4px 0 16px rgba(0,0,0,0.35)',
              }}
            >
              <InvestorPanel onJump={handleJump} />
            </div>
          )}
        </>
      )}
      </main>
      <NotesPanel />
    </>
  )
}
