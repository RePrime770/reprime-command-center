'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ConciergeButtons from './ConciergeButtons'

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  zoomLink: string | null
  attendees: string[]
}

interface CalendarPayload {
  events: CalendarEvent[]
  cached: boolean
}

const REFETCH_MS = 5 * 60 * 1000

function formatAbsolute(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatRelative(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = d.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < -60) return `${Math.round(-diffMin / 60)}h ago`
  if (diffMin < -1) return `${-diffMin}m ago`
  if (diffMin <= 1 && diffMin >= -1) return 'now'
  if (diffMin < 60) return `in ${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  return `in ${diffHr}h`
}

function findNextUpId(events: CalendarEvent[], now: Date): string | null {
  let bestId: string | null = null
  let bestDelta = Infinity
  for (const ev of events) {
    const t = new Date(ev.startTime).getTime()
    if (Number.isNaN(t)) continue
    const delta = t - now.getTime()
    if (delta >= -5 * 60_000 && delta < bestDelta) {
      bestDelta = delta
      bestId = ev.id
    }
  }
  return bestId
}

export default function TodayPanel() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', 'today'],
    queryFn: async (): Promise<CalendarPayload> => {
      const res = await fetch('/api/calendar/today', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as CalendarPayload
    },
    refetchInterval: REFETCH_MS,
    staleTime: REFETCH_MS,
  })

  const events = data?.events ?? []
  const nextUpId = findNextUpId(events, now)

  const containerStyle: React.CSSProperties = {
    background: 'var(--rp-navy)',
    color: 'var(--rp-white)',
    borderBottom: '1px solid var(--rp-border)',
    padding: '0.6rem 0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    overflowX: 'auto',
    minHeight: 56,
  }

  const labelStyle: React.CSSProperties = {
    color: 'var(--rp-gold)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
  }

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={labelStyle}>Today</div>
        <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>Loading…</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={containerStyle}>
        <div style={labelStyle}>Today</div>
        <div style={{ color: 'var(--rp-red)', fontSize: 12 }}>
          Calendar failed: {(error as Error).message}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={labelStyle}>Today</div>
        <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>No meetings today</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>Today</div>
      {events.map((ev) => {
        const isNextUp = ev.id === nextUpId
        const rowStyle: React.CSSProperties = {
          flexShrink: 0,
          background: 'var(--rp-surface)',
          borderLeft: isNextUp ? '3px solid var(--rp-gold)' : '3px solid transparent',
          padding: isNextUp ? '0.5rem 0.7rem' : '0.4rem 0.6rem',
          borderRadius: 4,
          minWidth: 200,
          fontSize: isNextUp ? 13 : 12,
        }
        const timeAbs = formatAbsolute(ev.startTime)
        const timeRel = formatRelative(ev.startTime, now)
        const attendeeCount = ev.attendees.length
        return (
          <div key={ev.id} style={rowStyle}>
            <div style={{ color: 'var(--rp-gold-lite)', fontSize: 11, marginBottom: 2 }}>
              {timeAbs}
              {timeRel && <span style={{ marginLeft: 6, opacity: 0.8 }}>· {timeRel}</span>}
            </div>
            <div
              style={{
                color: 'var(--rp-white)',
                fontWeight: isNextUp ? 600 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 280,
              }}
              title={ev.title}
            >
              {ev.title}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, fontSize: 11 }}>
              {attendeeCount > 0 && (
                <span style={{ color: 'var(--rp-gold-lite)' }}>
                  {attendeeCount} attendee{attendeeCount === 1 ? '' : 's'}
                </span>
              )}
              {ev.zoomLink && (
                <a
                  href={ev.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--rp-gold)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Zoom →
                </a>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <ConciergeButtons
                meeting={{
                  id: ev.id,
                  title: ev.title,
                  startTime: ev.startTime,
                  attendees: ev.attendees,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
