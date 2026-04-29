'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ChatList from '@/components/chat/ChatList'
import MessageView from '@/components/chat/MessageView'
import type { DashboardMessage, DashboardThread, Panel } from '@/lib/timelines/types'

function PanelView({ panel }: { panel: Panel }) {
  const [selected, setSelected] = useState<DashboardThread | null>(null)

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
          <MessageView thread={selected} messages={messages || []} />
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
