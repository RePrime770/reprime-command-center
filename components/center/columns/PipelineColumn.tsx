'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import MeetingNowBanner from '@/components/sidebar/MeetingNowBanner'
import SpeakerButton from '@/components/chat/SpeakerButton'

const REFETCH_MS = 60_000

// ── Types mirroring /api/briefing/today response ─────────────────────────────

interface BriefingMeeting {
  id: string
  title: string
  startTime: string
  endTime: string
  zoomLink: string | null
  attendees: string[]
}

interface ActiveDeal {
  id: number
  title: string
  value: number
  currency: string
  stage: string
  stage_change_time: string | null
  pipedrive_url: string
}

interface ExpiringInvitation {
  id: string
  contact_name: string | null
  contact_email: string | null
  expires_at: string
}

interface BriefingPayload {
  date: string
  meetings: {
    count: number
    first: BriefingMeeting | null
    nextUp: BriefingMeeting | null
    items: BriefingMeeting[]
  }
  unread: {
    total: number
    by_panel: { '305': number; '718': number; investors: number }
  }
  recent_investors: unknown[]
  expiring_invitations: {
    count: number
    items: ExpiringInvitation[]
  }
  pending_followups: unknown[]
  active_deals?: ActiveDeal[]
}

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatRelativePast(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 48) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}

function formatExpiringRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diffMs = d.getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 0) return 'expired'
  if (diffMin < 60) return `${diffMin}m left`
  const diffHr = Math.round(diffMin / 60)
  return `${diffHr}h left`
}

function formatCurrency(value: number, currency: string): string {
  if (!Number.isFinite(value) || value === 0) return ''
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `$${Math.round(value).toLocaleString('en-US')}`
  }
}

function buildNarrative(b: BriefingPayload | undefined): string {
  if (!b) return ''
  const meetings = b.meetings.count
  const investor = b.unread.by_panel.investors
  const unread = b.unread.total
  const expiring = b.expiring_invitations.count
  const deals = b.active_deals?.length ?? 0

  const parts: string[] = []
  if (meetings === 0) parts.push('No meetings today.')
  else if (meetings === 1) parts.push('One meeting on the calendar.')
  else parts.push(`${meetings} meetings today.`)

  if (b.meetings.nextUp) {
    parts.push(`Next up: ${b.meetings.nextUp.title} at ${formatTime(b.meetings.nextUp.startTime)}.`)
  }

  if (investor > 0) {
    parts.push(`${investor} unread from investors.`)
  }
  if (unread > investor && unread > 0) {
    parts.push(`${unread} unread total across all channels.`)
  }
  if (expiring > 0) {
    parts.push(`${expiring} invitation${expiring === 1 ? '' : 's'} expiring soon.`)
  }
  if (deals > 0) {
    parts.push(`${deals} active deal${deals === 1 ? '' : 's'} moving in Pipedrive.`)
  }
  return parts.join(' ')
}

// ── Visual primitives ────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  borderBottom: '1px solid var(--rp-border)',
}

const sectionLabel: React.CSSProperties = {
  color: 'var(--rp-gold)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  marginBottom: 8,
}

const cardStyle: React.CSSProperties = {
  background: 'var(--rp-surface)',
  border: '1px solid var(--rp-border)',
  borderRadius: 6,
  padding: '0.55rem 0.75rem',
  marginBottom: 6,
  fontSize: 13,
  color: 'var(--rp-white)',
}

function StatTile({
  label,
  value,
  colorVar,
}: {
  label: string
  value: number | string
  colorVar: string
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--rp-surface)',
        border: `1px solid ${colorVar}`,
        borderRadius: 6,
        padding: '0.5rem 0.6rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: colorVar, lineHeight: 1.1 }}>{value}</div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--rp-gold-lite)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * PipelineColumn — leftmost column of the /center kiosk.
 *
 * Sections (top-down):
 *   1. Now              — MeetingNowBanner (self-shows ±10 min window)
 *   2. Today's calendar — vertical list of today's meetings
 *   3. Briefing summary — narrative + Listen + 4 meaning-based stat tiles
 *   4. Active deals     — top 10 open Pipedrive deals by stage_change_time
 *   5. Expiring invitations
 *
 * Auto-refreshes every 60 seconds. Mounts into the Wave 1 Track A Canvas
 * post-merge — ships standalone for parallel review.
 */
export default function PipelineColumn() {
  const briefing = useQuery({
    queryKey: ['briefing', 'today', 'pipeline-column'],
    queryFn: async (): Promise<BriefingPayload> => {
      const res = await fetch('/api/briefing/today', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as BriefingPayload
    },
    refetchInterval: REFETCH_MS,
    staleTime: REFETCH_MS,
  })

  const calendar = useQuery({
    queryKey: ['calendar', 'today', 'pipeline-column'],
    queryFn: async (): Promise<CalendarPayload> => {
      const res = await fetch('/api/calendar/today', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as CalendarPayload
    },
    refetchInterval: REFETCH_MS,
    staleTime: REFETCH_MS,
  })

  const narrative = useMemo(() => buildNarrative(briefing.data), [briefing.data])
  const events = calendar.data?.events ?? []
  const deals = briefing.data?.active_deals ?? []
  const expiring = briefing.data?.expiring_invitations.items ?? []

  return (
    <div
      data-component="pipeline-column"
      style={{
        background: 'var(--rp-navy)',
        color: 'var(--rp-white)',
        height: '100%',
        overflowY: 'auto',
        fontFamily: 'inherit',
      }}
    >
      {/* 1. Now — MeetingNowBanner is self-gated to ±10 min */}
      <div data-section="now">
        <MeetingNowBanner />
      </div>

      {/* 2. Today's calendar — vertical list */}
      <section style={sectionStyle} data-section="today">
        <div style={sectionLabel}>Today</div>
        {calendar.isLoading && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>Loading…</div>
        )}
        {calendar.isError && (
          <div style={{ color: 'var(--rp-red)', fontSize: 12 }}>
            Calendar failed: {(calendar.error as Error).message}
          </div>
        )}
        {!calendar.isLoading && !calendar.isError && events.length === 0 && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>No meetings today</div>
        )}
        {events.map((ev) => (
          <div key={ev.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>
                {formatTime(ev.startTime)}
              </span>
              {ev.zoomLink && (
                <a
                  href={ev.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--rp-gold)',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Zoom↗
                </a>
              )}
            </div>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{ev.title}</div>
          </div>
        ))}
      </section>

      {/* 3. Briefing summary — narrative + Listen + stat tiles */}
      <section style={sectionStyle} data-section="briefing">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={sectionLabel}>Briefing</div>
          {narrative && <SpeakerButton text={narrative} />}
        </div>

        {briefing.isLoading && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>Loading…</div>
        )}
        {briefing.isError && (
          <div style={{ color: 'var(--rp-red)', fontSize: 12 }}>
            Briefing failed: {(briefing.error as Error).message}
          </div>
        )}
        {briefing.data && (
          <>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--rp-white)',
                margin: '0 0 10px',
              }}
            >
              {narrative || 'Quiet morning.'}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <StatTile
                label="Meetings"
                value={briefing.data.meetings.count}
                colorVar="var(--c-live-now)"
              />
              <StatTile
                label="Investors"
                value={briefing.data.unread.by_panel.investors}
                colorVar="var(--c-investor)"
              />
              <StatTile
                label="Unread"
                value={briefing.data.unread.total}
                colorVar="var(--c-warn)"
              />
              <StatTile
                label="Expiring"
                value={briefing.data.expiring_invitations.count}
                colorVar="var(--c-fail)"
              />
            </div>
          </>
        )}
      </section>

      {/* 4. Active deals — top 10 open by stage_change_time desc */}
      <section style={sectionStyle} data-section="active-deals">
        <div style={sectionLabel}>Active Deals</div>
        {briefing.isLoading && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>Loading…</div>
        )}
        {briefing.data && deals.length === 0 && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>No open deals</div>
        )}
        {deals.map((deal) => {
          const valueStr = formatCurrency(deal.value, deal.currency)
          const movedStr = formatRelativePast(deal.stage_change_time)
          return (
            <a
              key={deal.id}
              href={deal.pipedrive_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...cardStyle, display: 'block', textDecoration: 'none', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{deal.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    background: 'rgba(255, 204, 51, 0.12)',
                    color: 'var(--rp-gold)',
                    border: '1px solid var(--rp-gold)',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {deal.stage}
                </span>
                {valueStr && (
                  <span style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>{valueStr}</span>
                )}
                {movedStr && (
                  <span style={{ color: 'var(--rp-gold-lite)', fontSize: 11, opacity: 0.75 }}>
                    moved {movedStr}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </section>

      {/* 5. Expiring invitations */}
      <section style={{ ...sectionStyle, borderBottom: 'none' }} data-section="expiring">
        <div style={sectionLabel}>Expiring Invitations</div>
        {briefing.isLoading && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>Loading…</div>
        )}
        {briefing.data && expiring.length === 0 && (
          <div style={{ color: 'var(--rp-gold-lite)', fontSize: 12 }}>None expiring</div>
        )}
        {expiring.map((inv) => (
          <div key={inv.id} style={cardStyle}>
            <div style={{ fontWeight: 500 }}>{inv.contact_name || inv.contact_email || 'Unknown'}</div>
            <div style={{ color: 'var(--c-fail)', fontSize: 11, marginTop: 2 }}>
              {formatExpiringRelative(inv.expires_at)}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
