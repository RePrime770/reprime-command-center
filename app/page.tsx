'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ChatList from '@/components/chat/ChatList'
import MessageView from '@/components/chat/MessageView'
import ReplyBox from '@/components/chat/ReplyBox'
import PipedriveCard from '@/components/sidebar/PipedriveCard'
import type { DashboardMessage, DashboardThread, Panel } from '@/lib/timelines/types'

function PanelView({ panel }: { panel: Panel }) {
  const [selected, setSelected] = useState<DashboardThread | null>(null)
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
          onSelect={setSelected}
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

export default function Dashboard() {
  return (
    <main style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <PanelView panel="718" />
      <PanelView panel="305" />
    </main>
  )
}
