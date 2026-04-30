'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Channel = 'whatsapp_718' | 'whatsapp_305' | 'email' | 'all'
type MeetingType = 'terminal' | 'meeting'

const PREFERRED_LABEL: Record<number, string> = {
  27: 'WhatsApp',
  28: 'Email',
  29: 'Phone',
  30: 'Zoom',
}

interface PipedriveSearchHit {
  id: number
  name: string
  emails: string[]
  phones: string[]
}

interface ContactPrefs {
  preferred_method: number | null
  default_channel: Channel
}

interface Invitation {
  id: string
  contact_first_name: string | null
  contact_name: string | null
  status: string
  confirmed_slot_iso: string | null
  zoom_join_url: string | null
  created_at: string | null
  expires_at: string | null
  meeting_type?: string | null
}

const NAVY = '#0E3470'
const NAVY_DEEP = '#0A2855'
const GOLD = '#BC9C45'
const GOLD_LIGHT = '#D4B86A'
const TEXT = '#fff'
const MUTED = '#8A8680'
const BORDER = '#1A3560'

function formatSlotDisplay(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
  return `${fmt.format(d)} Central`
}

const MEETING_CONFIG = {
  terminal: {
    symbol: 'ת',
    label: 'Terminal Introduction',
    tagline: 'RePrime Group · Terminal Introduction',
    previewEmail: (firstName: string) =>
      `${firstName},\n\nI'm hosting a Terminal Introduction — a deal sourcing system unlike anything that exists. Built to surface and close opportunities at a different level.\n\n30 minutes to show you what it is.\n\nPick a time: <invite-link>\n\n—\nGideon Gratsiani\nFounder, RePrime Group`,
    previewWhatsApp: (firstName: string) =>
      `${firstName} — I'm hosting a Terminal Introduction.\n\nThe Terminal is a deal sourcing machine unlike anything that exists — built to source, qualify, and close at a different level. One of a kind.\n\n30 minutes to walk you through it. Pick a time:\n<invite-link>\n— Gideon`,
    emailSubject: (firstName: string) => `Terminal Introduction — ${firstName}`,
  },
  meeting: {
    symbol: '·',
    label: 'General Meeting',
    tagline: 'RePrime Group · Meeting Request',
    previewEmail: (firstName: string) =>
      `${firstName},\n\nI'd value some time with you — thirty minutes, your schedule.\n\nPick what works and I'll be there:\n<invite-link>\n\n—\nGideon Gratsiani\nFounder, RePrime Group`,
    previewWhatsApp: (firstName: string) =>
      `${firstName} — I'd value some time with you.\n\n30 minutes, your schedule. Pick what works:\n<invite-link>\n— Gideon`,
    emailSubject: (firstName: string) => `Let's Connect — ${firstName}`,
  },
} as const

export default function BookingsPanel({ onClose }: { onClose?: () => void }) {
  const [view, setView] = useState<'compose' | 'status'>('compose')
  const [meetingType, setMeetingType] = useState<MeetingType>('terminal')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PipedriveSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [contact, setContact] = useState<PipedriveSearchHit | null>(null)

  const [channel, setChannel] = useState<Channel>('all')
  const [channelDefaultedFrom, setChannelDefaultedFrom] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [recent, setRecent] = useState<Invitation[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  const searchAbort = useRef<AbortController | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (contact) {
      setResults([])
      return
    }
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      if (searchAbort.current) searchAbort.current.abort()
      const ac = new AbortController()
      searchAbort.current = ac
      setSearching(true)
      try {
        const res = await fetch(`/api/pipedrive/search?q=${encodeURIComponent(query.trim())}&limit=8`, {
          signal: ac.signal,
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`search_${res.status}`)
        const json = (await res.json()) as { results?: PipedriveSearchHit[] }
        setResults(json.results ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[BookingsPanel] search failed', err)
        }
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query, contact])

  useEffect(() => {
    if (!contact) {
      setChannelDefaultedFrom(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/pipedrive/person?id=${contact.id}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as ContactPrefs
        if (cancelled) return
        setChannel(json.default_channel ?? 'all')
        setChannelDefaultedFrom(json.preferred_method ?? null)
      } catch (err) {
        console.error('[BookingsPanel] prefs fetch failed', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [contact])

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      const res = await fetch('/api/bookings/list', { cache: 'no-store' })
      if (!res.ok) throw new Error(`list_${res.status}`)
      const json = (await res.json()) as { invitations?: Invitation[] }
      setRecent(json.invitations ?? [])
    } catch (err) {
      console.error('[BookingsPanel] loadRecent failed', err)
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'status') void loadRecent()
  }, [view, loadRecent])

  const cfg = MEETING_CONFIG[meetingType]
  const firstName = contact ? (contact.name.split(' ')[0] || contact.name) : null

  const previewEmail = useMemo(() => {
    if (!firstName) return null
    return {
      subject: cfg.emailSubject(firstName),
      text: cfg.previewEmail(firstName),
    }
  }, [firstName, cfg])

  const previewWhatsapp = useMemo(() => {
    if (!firstName) return null
    return cfg.previewWhatsApp(firstName)
  }, [firstName, cfg])

  async function send() {
    if (!contact) {
      setToast('Pick a contact first.')
      return
    }
    setSending(true)
    setToast(null)
    try {
      const res = await fetch('/api/bookings/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.id, channel, meeting_type: meetingType }),
      })
      const json = (await res.json()) as {
        invitation_id?: string
        sent_channels?: string[]
        errors?: Array<{ channel: string; message: string }>
        error?: string
        message?: string
      }
      if (!res.ok) {
        setToast(`Failed: ${json.error ?? 'unknown'}${json.message ? ` — ${json.message}` : ''}`)
        return
      }
      const sent = json.sent_channels ?? []
      const errs = json.errors ?? []
      if (sent.length > 0 && errs.length === 0) {
        setToast(`Sent via ${sent.join(', ')}. Closing in a moment.`)
        setTimeout(() => onClose?.(), 1600)
      } else if (sent.length > 0) {
        setToast(`Sent via ${sent.join(', ')}. ${errs.length} channel(s) failed.`)
      } else {
        setToast(`No channels sent. ${errs.map((e) => `${e.channel}: ${e.message}`).join(' · ')}`)
      }
    } catch (err) {
      setToast(`Failed: ${(err as Error).message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        background: NAVY_DEEP,
        color: TEXT,
        fontFamily: 'Poppins, Arial, sans-serif',
        border: `1px solid ${BORDER}`,
        borderRadius: '6px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minWidth: '520px',
        maxWidth: '680px',
        width: '100%',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: GOLD, fontSize: '1.5rem', fontFamily: 'Georgia,serif', fontWeight: 700 }}>
            {meetingType === 'terminal' ? 'ת' : '·'}
          </span>
          <span style={{ color: GOLD_LIGHT, letterSpacing: '0.08em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
            {cfg.tagline}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => setView('compose')} style={tabBtn(view === 'compose')}>
            Compose
          </button>
          <button type="button" onClick={() => setView('status')} style={tabBtn(view === 'status')}>
            Status
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={{ ...tabBtn(false), border: 'none', background: 'transparent' }}>
              ✕
            </button>
          )}
        </div>
      </header>

      {view === 'compose' && (
        <>
          {/* ── Meeting type toggle ── */}
          <section>
            <label style={labelStyle}>Invitation Type</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setMeetingType('terminal')}
                style={typeBtn(meetingType === 'terminal')}
              >
                <span style={{ fontFamily: 'Georgia,serif', marginRight: '0.35rem' }}>ת</span>
                Terminal Introduction
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('meeting')}
                style={typeBtn(meetingType === 'meeting')}
              >
                · General Meeting
              </button>
            </div>
          </section>

          {/* ── Contact search ── */}
          <section>
            <label style={labelStyle}>Contact</label>
            {contact ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${GOLD}`,
                  borderRadius: '4px',
                  marginTop: '0.4rem',
                }}
              >
                <div>
                  <div style={{ color: TEXT, fontSize: '0.95rem' }}>{contact.name}</div>
                  <div style={{ color: MUTED, fontSize: '0.8rem' }}>
                    {[contact.emails?.[0], contact.phones?.[0]].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <button type="button" onClick={() => { setContact(null); setQuery('') }} style={ghostBtn}>
                  Change
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Search Pipedrive contacts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={inputStyle}
                />
                {results.length > 0 && (
                  <ul style={dropdownStyle}>
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => { setContact(r); setQuery(''); setResults([]) }}
                          style={dropdownItem}
                        >
                          <div style={{ color: TEXT, fontSize: '0.9rem' }}>{r.name}</div>
                          <div style={{ color: MUTED, fontSize: '0.75rem' }}>
                            {[r.emails?.[0], r.phones?.[0]].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searching && <div style={{ color: MUTED, fontSize: '0.75rem', marginTop: '0.25rem' }}>Searching…</div>}
              </div>
            )}
          </section>

          {/* ── Channel ── */}
          <section>
            <label style={labelStyle}>Channel</label>
            {channelDefaultedFrom !== null && (
              <div style={{ color: GOLD_LIGHT, fontSize: '0.72rem', marginTop: '0.3rem', fontStyle: 'italic' }}>
                Default from Pipedrive · Preferred: {PREFERRED_LABEL[channelDefaultedFrom] ?? `option ${channelDefaultedFrom}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {(
                [
                  ['all', 'All three'],
                  ['whatsapp_305', 'WhatsApp 305'],
                  ['whatsapp_718', 'WhatsApp 718'],
                  ['email', 'Email only'],
                ] as Array<[Channel, string]>
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setChannel(val); setChannelDefaultedFrom(null) }}
                  style={channelBtn(channel === val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Preview ── */}
          {contact && (
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {(channel === 'email' || channel === 'all') && previewEmail && (
                <div style={previewBox}>
                  <div style={previewTitle}>Email preview</div>
                  <div style={{ color: GOLD_LIGHT, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Subject: {previewEmail.subject}
                  </div>
                  <pre style={previewBody}>{previewEmail.text}</pre>
                </div>
              )}
              {channel !== 'email' && previewWhatsapp && (
                <div style={previewBox}>
                  <div style={previewTitle}>WhatsApp preview</div>
                  <pre style={previewBody}>{previewWhatsapp}</pre>
                </div>
              )}
            </section>
          )}

          <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: toast?.startsWith('Failed') || toast?.startsWith('No channels') ? '#FF6F61' : GOLD_LIGHT, fontSize: '0.8rem' }}>
              {toast ?? ' '}
            </span>
            <button
              type="button"
              onClick={send}
              disabled={sending || !contact}
              style={primaryBtn(sending || !contact)}
            >
              {sending ? 'Sending…' : 'Send Invitation'}
            </button>
          </footer>
        </>
      )}

      {view === 'status' && (
        <div>
          {loadingRecent && <div style={{ color: MUTED, fontSize: '0.85rem' }}>Loading…</div>}
          {!loadingRecent && recent.length === 0 && (
            <div style={{ color: MUTED, fontSize: '0.85rem' }}>No invitations yet.</div>
          )}
          {!loadingRecent && recent.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: MUTED, textAlign: 'left' }}>
                  <th style={th}>Contact</th>
                  <th style={th}>Type</th>
                  <th style={th}>Status</th>
                  <th style={th}>Slot</th>
                  <th style={th}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={td}>{r.contact_name || r.contact_first_name || '—'}</td>
                    <td style={{ ...td, color: r.meeting_type === 'terminal' ? GOLD : GOLD_LIGHT, fontSize: '0.75rem' }}>
                      {r.meeting_type === 'terminal' ? 'ת Terminal' : r.meeting_type === 'meeting' ? '· Meeting' : '—'}
                    </td>
                    <td style={{ ...td, color: r.status === 'confirmed' ? GOLD : r.status === 'expired' ? '#FF6F61' : GOLD_LIGHT }}>
                      {r.status}
                    </td>
                    <td style={td}>{r.confirmed_slot_iso ? formatSlotDisplay(r.confirmed_slot_iso) : '—'}</td>
                    <td style={td}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  color: MUTED,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  background: NAVY,
  color: TEXT,
  border: `1px solid ${BORDER}`,
  borderRadius: '4px',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: '0.25rem',
  background: NAVY,
  border: `1px solid ${BORDER}`,
  borderRadius: '4px',
  listStyle: 'none',
  padding: 0,
  margin: '0.25rem 0 0 0',
  maxHeight: '240px',
  overflowY: 'auto',
  zIndex: 10,
}

const dropdownItem: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${BORDER}`,
  cursor: 'pointer',
  color: TEXT,
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem',
    background: active ? GOLD : 'transparent',
    color: active ? NAVY : GOLD_LIGHT,
    border: `1px solid ${GOLD}`,
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
  }
}

function typeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    background: active ? GOLD : 'transparent',
    color: active ? NAVY : TEXT,
    border: `1px solid ${active ? GOLD : BORDER}`,
    borderRadius: '4px',
    fontSize: '0.88rem',
    fontWeight: active ? 600 : 400,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.02em',
  }
}

function channelBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.45rem 0.85rem',
    background: active ? GOLD : 'transparent',
    color: active ? NAVY : TEXT,
    border: `1px solid ${active ? GOLD : BORDER}`,
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
  }
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.65rem 1.5rem',
    background: disabled ? '#5C5448' : GOLD,
    color: NAVY,
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

const ghostBtn: React.CSSProperties = {
  padding: '0.35rem 0.7rem',
  background: 'transparent',
  color: GOLD_LIGHT,
  border: `1px solid ${BORDER}`,
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const previewBox: React.CSSProperties = {
  background: NAVY,
  border: `1px solid ${BORDER}`,
  borderRadius: '4px',
  padding: '0.75rem',
  minWidth: 0,
}

const previewTitle: React.CSSProperties = {
  color: GOLD,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.5rem',
}

const previewBody: React.CSSProperties = {
  color: TEXT,
  fontSize: '0.78rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  fontFamily: 'inherit',
}

const th: React.CSSProperties = {
  padding: '0.5rem 0.5rem',
  fontWeight: 500,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td: React.CSSProperties = {
  padding: '0.5rem 0.5rem',
  verticalAlign: 'top',
}
