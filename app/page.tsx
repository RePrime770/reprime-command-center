'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ChatList from '@/components/chat/ChatList'
import MessageView from '@/components/chat/MessageView'
import ReplyBox from '@/components/chat/ReplyBox'
import PipedriveCard from '@/components/sidebar/PipedriveCard'
import TodayPanel from '@/components/sidebar/TodayPanel'
import NotesPanel from '@/components/sidebar/NotesPanel'
import InvestorChatPanel from '@/components/panels/InvestorChatPanel'
import type { DashboardMessage, DashboardThread, Panel } from '@/lib/timelines/types'

type SelectionMap = Record<Panel, DashboardThread | null>

type PanelViewProps = {
  panel: Panel
  selected: DashboardThread | null
  onSelect: (thread: DashboardThread | null) => void
}

function PanelView({ panel, selected, onSelect }: PanelViewProps) {
  const queryClient = useQueryClient()

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
          hideInvestors
        />
        {selected ? (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              <MessageView thread={selected} messages={messages || []} />
              <div style={{ padding: '0 1rem 0.75rem', background: headerBg, flexShrink: 0 }}>
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

export default function Dashboard() {
  const [selections, setSelections] = useState<SelectionMap>({ '718': null, '305': null })

  const select = useCallback(
    (panel: Panel) => (thread: DashboardThread | null) =>
      setSelections((prev) => ({ ...prev, [panel]: thread })),
    []
  )

  return (
    <>
      <TodayPanel />
      <main style={{ display: 'flex', flex: 1, minHeight: 0, width: '100vw' }}>
        {/* 718 — Personal */}
        <PanelView
          panel="718"
          selected={selections['718']}
          onSelect={select('718')}
        />
        {/* 305 — RePrime */}
        <PanelView
          panel="305"
          selected={selections['305']}
          onSelect={select('305')}
        />
        {/* ★ Investors — third full panel, always visible */}
        <InvestorChatPanel />
      </main>
      <NotesPanel />
    </>
  )
}
