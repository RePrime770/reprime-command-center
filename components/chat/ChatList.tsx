'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatPhoneDisplay } from '@/lib/timelines/parse'
import type { DashboardThread, Panel } from '@/lib/timelines/types'

type Props = {
  panel: Panel
  selectedThreadId: string | null
  onSelect: (thread: DashboardThread) => void
  /** When true, investor-tagged threads are hidden from this panel (they live in the Investors panel) */
  hideInvestors?: boolean
}

type SortMode = 'recent' | 'unread'
type FilterMode = 'direct' | 'groups' | 'all'

const PANEL_THEME = {
  '718': {
    bg: 'var(--personal-bg)',
    surface: 'var(--personal-surface)',
    border: 'var(--personal-border)',
    text: 'var(--personal-text)',
    muted: 'var(--personal-muted)',
    accent: 'var(--personal-accent)',
    selected: 'var(--personal-warm)',
    inputBg: '#fff',
  },
  '305': {
    bg: 'var(--rp-navy)',
    surface: 'var(--rp-surface)',
    border: 'var(--rp-border)',
    text: 'var(--rp-white)',
    muted: 'var(--rp-gold-lite)',
    accent: 'var(--rp-gold)',
    selected: 'var(--rp-blue)',
    inputBg: 'var(--rp-surface)',
  },
} as const

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function initials(name: string | null, phone: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '#'
  }
  return phone.replace(/\D/g, '').slice(-2) || '#'
}

function truncate(s: string | null, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export default function ChatList({ panel, selectedThreadId, onSelect, hideInvestors = false }: Props) {
  const theme = PANEL_THEME[panel]
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [filter, setFilter] = useState<FilterMode>('all')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['threads', panel],
    queryFn: async (): Promise<DashboardThread[]> => {
      const res = await fetch(`/api/whatsapp/threads?panel=${panel}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { threads: DashboardThread[] }
      return json.threads
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`threads-${panel}`)
      .on(
        'postgres_changes',
        {
          // INSERT only — '*' causes an infinite loop because the threads
          // GET endpoint itself upserts (UPDATE) on every call, which fires
          // realtime → invalidates → refetches → upserts again → ∞
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_threads',
          filter: `panel=eq.${panel}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['threads', panel] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload: any) => {
          if (payload.new?.thread_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', payload.new.thread_id],
            })
          }
          queryClient.invalidateQueries({ queryKey: ['threads', panel] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [panel, queryClient])

  const threads = useMemo<DashboardThread[]>(() => {
    let list = data || []
    // Remove investor-tagged contacts from 718/305 panels — they live in the Investors panel
    if (hideInvestors) {
      list = list.filter((t) => !t.is_investor)
    }
    if (filter === 'direct') {
      list = list.filter((t) => !t.is_group)
    } else if (filter === 'groups') {
      list = list.filter((t) => t.is_group)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          (t.contact_name || '').toLowerCase().includes(q) ||
          (t.phone || '').toLowerCase().includes(q)
      )
    }
    if (sort === 'unread') {
      list = [...list].sort((a, b) => {
        const ua = a.unread_count || 0
        const ub = b.unread_count || 0
        if (ub !== ua) return ub - ua
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return tb - ta
      })
    }
    return list
  }, [data, filter, search, sort])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: theme.bg,
        color: theme.text,
        borderRight: `1px solid ${theme.border}`,
        minWidth: 280,
        maxWidth: 360,
      }}
    >
      <div style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            padding: '0.4rem 0.6rem',
            fontFamily: 'inherit',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            style={{
              background: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: '0.3rem 0.4rem',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            <option value="recent">Last activity</option>
            <option value="unread">Unread first</option>
          </select>
          <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', background: theme.surface, borderRadius: 999, padding: 2 }}>
            {(['direct', 'groups', 'all'] as FilterMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                style={{
                  background: filter === m ? theme.accent : 'transparent',
                  color: filter === m ? (panel === '305' ? 'var(--rp-navy)' : '#fff') : theme.muted,
                  border: 'none',
                  borderRadius: 999,
                  padding: '0.2rem 0.6rem',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && (
          <div style={{ padding: '1rem', color: theme.muted, fontSize: 13 }}>Loading threads…</div>
        )}
        {error && (
          <div style={{ padding: '1rem', color: '#FF7474', fontSize: 13 }}>
            Error loading threads.{' '}
            <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', textDecoration: 'underline' }}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && threads.length === 0 && !error && (
          <div style={{ padding: '1rem', color: theme.muted, fontSize: 13 }}>
            No conversations.
            {hideInvestors && (
              <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5 }}>
                Investor-tagged contacts appear in the <strong style={{ color: theme.accent }}>★ Investors</strong> panel on the right.
              </div>
            )}
          </div>
        )}
        {threads.map((t) => {
          const isSelected = t.id === selectedThreadId
          const formattedPhone = formatPhoneDisplay(t.phone)
          const nameIsDigits = !t.contact_name || /^\+?\d[\d\s\-()]*$/.test(t.contact_name.trim())
          const displayName = nameIsDigits ? (formattedPhone || t.phone) : t.contact_name!
          const showPhoneLine = !nameIsDigits && formattedPhone && formattedPhone !== displayName
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 0.75rem',
                border: 'none',
                background: isSelected ? theme.selected : 'transparent',
                color: theme.text,
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: `1px solid ${theme.border}`,
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: theme.accent,
                  color: panel === '305' ? 'var(--rp-navy)' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initials(t.contact_name, t.phone)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                    {t.is_investor && (
                      <span style={{ marginLeft: 6, color: theme.accent, fontSize: 11 }}>★</span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: theme.muted, flexShrink: 0 }}>
                    {relativeTime(t.last_message_at)}
                  </span>
                </div>
                {showPhoneLine && (
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formattedPhone}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: theme.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncate(t.last_message_preview, 40)}
                  </span>
                  {t.unread_count > 0 && (
                    <span
                      style={{
                        background: theme.accent,
                        color: panel === '305' ? 'var(--rp-navy)' : '#fff',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        flexShrink: 0,
                      }}
                    >
                      {t.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {isFetching && !isLoading && (
        <div style={{ padding: '0.3rem 0.75rem', fontSize: 11, color: theme.muted, borderTop: `1px solid ${theme.border}` }}>
          Refreshing…
        </div>
      )}
    </div>
  )
}
