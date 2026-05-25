'use client'

/**
 * Captain 2026-05-24: /compose — the standalone "send Terminal invitation
 * to ANYONE" page. The chat-header InviteComposer only works for people who
 * already have a WhatsApp thread with Gideon; this page covers fresh outreach
 * to anyone whose name + phone he can type (which is the actual common case
 * for the Terminal launch outreach).
 *
 * Flow:
 *   1. Gideon types first name, full name, phone
 *   2. Auto-fetches 3 suggested time slots from his Google Calendar
 *   3. Shows editable personal message preview
 *   4. [Mint Invitation] button → server-side mint (cookie auth, no token in
 *      browser) → returns magic link
 *   5. Page renders: [Copy Message] button + big [Open in WhatsApp Web] link
 *   6. Gideon clicks open → WhatsApp Web opens chat for that phone with the
 *      full message + URL pre-filled in the input → he hits Send himself
 *
 * No bearer token leaves the server. No Chrome extension required. Works for
 * any phone number whether or not it's in Gideon's existing WhatsApp threads.
 */

import { useEffect, useMemo, useState } from 'react'

type Slot = { iso: string; display: string }
type SlotGroup = { date: string; label: string; times: Slot[] }

function pickThreeSlots(groups: SlotGroup[]): Slot[] {
  for (const group of groups) {
    const picks: Slot[] = []
    const bucketed: Record<'morning' | 'early' | 'late', Slot[]> = {
      morning: [],
      early: [],
      late: [],
    }
    for (const t of group.times) {
      const h = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Chicago',
          hour: 'numeric',
          hour12: false,
        }).format(new Date(t.iso)),
        10
      )
      if (h < 12) bucketed.morning.push(t)
      else if (h < 15) bucketed.early.push(t)
      else if (h < 18) bucketed.late.push(t)
    }
    if (bucketed.morning[0]) picks.push(bucketed.morning[0])
    if (bucketed.early[0]) picks.push(bucketed.early[0])
    if (bucketed.late[0]) picks.push(bucketed.late[0])
    if (picks.length < 3) {
      for (const t of group.times) {
        if (picks.length >= 3) break
        if (!picks.find((p) => p.iso === t.iso)) picks.push(t)
      }
    }
    if (picks.length >= 1) return picks.slice(0, 3)
  }
  return []
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.trim().startsWith('+')) return `+${digits}`
  return `+${digits}`
}

function waMeLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/\D/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}

export default function ComposePage() {
  const [firstName, setFirstName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneRaw, setPhoneRaw] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [emailSource, setEmailSource] = useState<string | null>(null)
  const [emailDispatched, setEmailDispatched] = useState<boolean>(false)
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null)
  const [copiedFlash, setCopiedFlash] = useState(false)

  const phone = useMemo(() => normalizePhone(phoneRaw), [phoneRaw])

  // Auto-populate the personal message when firstName changes
  useEffect(() => {
    const fn = firstName.trim()
    if (!fn) return
    setPersonalMessage(
      `${fn} — this is Gideon. I've been building something privately and you're one of the very first people I want to show it to. Pick a time below — 30 minutes, just us.`
    )
  }, [firstName])

  // Auto-fetch slots once (single call on mount). Cached client-side via state.
  useEffect(() => {
    let cancelled = false
    setSlotsLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/bookings/available-slots', { cache: 'no-store' })
        if (!res.ok) throw new Error(`available-slots ${res.status}`)
        const { slots: groups } = (await res.json()) as { slots: SlotGroup[] }
        const picks = pickThreeSlots(groups ?? [])
        if (!cancelled) {
          setSlots(picks)
          setSlotsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setSlotsError((err as Error).message || 'Failed to load slots')
          setSlotsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fullMessage = useMemo(() => {
    if (!inviteUrl) return personalMessage
    return `${personalMessage.trim()}\n\n${inviteUrl}`
  }, [personalMessage, inviteUrl])

  // Phone is optional. When Gideon is composing for a chat that's already
  // open in WhatsApp Web, he doesn't need to look up the phone — the
  // recipient routing happens via him hitting Enter in the open chat. The
  // mint endpoint accepts a null phone; we just won't have the metadata.
  const canMint =
    firstName.trim().length > 0 &&
    personalMessage.trim().length > 0 &&
    !minting

  const mint = async () => {
    if (!canMint) return
    setMinting(true)
    setMintError(null)
    setInviteUrl(null)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contact_first_name: firstName.trim(),
          contact_name: fullName.trim() || firstName.trim(),
          contact_phone: phone || null,
          meeting_type: 'terminal',
          proposed_slots: slots,
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`mint failed: ${res.status} ${txt.slice(0, 200)}`)
      }
      const json = (await res.json()) as {
        invite_url: string
        contact_email: string | null
        email_source: string | null
        email_dispatched: boolean
      }
      setInviteUrl(json.invite_url)
      setResolvedEmail(json.contact_email)
      setEmailSource(json.email_source)
      setEmailDispatched(json.email_dispatched)
    } catch (err) {
      setMintError((err as Error).message || 'Mint failed')
    } finally {
      setMinting(false)
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage)
      setCopiedFlash(true)
      setTimeout(() => setCopiedFlash(false), 1500)
    } catch {
      // ignore
    }
  }

  const reset = () => {
    setInviteUrl(null)
    setResolvedEmail(null)
    setEmailSource(null)
    setEmailDispatched(false)
    setMintError(null)
    setFirstName('')
    setFullName('')
    setPhoneRaw('')
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0E3470',
      padding: '32px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255, 204, 51, 0.30)',
        borderRadius: 8,
        padding: '28px 32px',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 24,
          color: '#FFCC33',
          letterSpacing: '0.04em',
          fontWeight: 700,
        }}>
          Compose Terminal Invitation
        </h1>
        <p style={{
          margin: '6px 0 24px',
          fontSize: 14,
          color: 'rgba(255, 204, 51, 0.65)',
        }}>
          Mint a magic link, open it pre-filled in WhatsApp Web, send it from your own thumb.
        </p>

        {/* INPUT FORM (always visible) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name (required)">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Shirel"
              style={inputStyle}
              disabled={!!inviteUrl}
            />
          </Field>
          <Field label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Shirel Ben-Haroush"
              style={inputStyle}
              disabled={!!inviteUrl}
            />
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Phone (optional — leave blank if you're sending from WhatsApp Web yourself)">
            <input
              type="tel"
              value={phoneRaw}
              onChange={(e) => setPhoneRaw(e.target.value)}
              placeholder="+1 (305) 555-1234 — optional"
              style={inputStyle}
              disabled={!!inviteUrl}
            />
            {phoneRaw && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                Will dial as: <strong style={{ color: '#FFCC33' }}>{phone}</strong>
              </div>
            )}
          </Field>
        </div>

        {/* SLOTS PREVIEW */}
        <div style={{ marginTop: 16 }}>
          <Label>Suggested times (sent in WhatsApp + email)</Label>
          {slotsLoading ? (
            <div style={mutedStyle}>Loading from your calendar…</div>
          ) : slotsError ? (
            <div style={{ ...mutedStyle, color: '#FF7474' }}>{slotsError}</div>
          ) : slots.length === 0 ? (
            <div style={mutedStyle}>No open slots in the next 14 days.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {slots.map((s) => (
                <li key={s.iso} style={{ color: '#FFCC33', fontSize: 14, padding: '3px 0' }}>
                  · {s.display}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* MESSAGE EDITOR */}
        <div style={{ marginTop: 16 }}>
          <Label>Personal message (sent above the gold card)</Label>
          <textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={5}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 110 }}
            disabled={!!inviteUrl}
          />
        </div>

        {mintError && (
          <div style={{ marginTop: 12, color: '#FF7474', fontSize: 13 }}>
            ✗ {mintError}
          </div>
        )}

        {/* MINT BUTTON (pre-mint) or RESULT (post-mint) */}
        {!inviteUrl ? (
          <button
            type="button"
            onClick={mint}
            disabled={!canMint}
            style={{
              ...primaryButtonStyle,
              marginTop: 20,
              opacity: canMint ? 1 : 0.4,
              cursor: canMint ? 'pointer' : 'not-allowed',
            }}
          >
            {minting ? 'Minting…' : 'Mint Invitation'}
          </button>
        ) : (
          <div style={{
            marginTop: 24,
            padding: '20px 22px',
            background: 'rgba(255, 204, 51, 0.08)',
            border: '1px solid rgba(255, 204, 51, 0.40)',
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#FFCC33',
              fontWeight: 700,
              marginBottom: 10,
            }}>
              ✓ Minted
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
              Magic link:{' '}
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFCC33', wordBreak: 'break-all' }}
              >
                {inviteUrl}
              </a>
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              {emailDispatched
                ? `✉  Email sent to ${resolvedEmail} (source: ${emailSource})`
                : resolvedEmail
                  ? `Email on file (${resolvedEmail}) but dispatch skipped — no slots?`
                  : 'No email on file in master directory. Recipient enters their email on the booking page.'}
            </div>

            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.30)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              borderRadius: 6,
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              color: '#FFCC33',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}>
              {fullMessage}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" onClick={copyMessage} style={primaryButtonStyle}>
                {copiedFlash ? '✓ Copied' : 'Copy Message'}
              </button>
              <a
                href={waMeLink(phone, fullMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}
              >
                Open WhatsApp Web →
              </a>
              <button type="button" onClick={reset} style={secondaryButtonStyle}>
                Mint another
              </button>
            </div>

            <div style={{
              marginTop: 14,
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
            }}>
              <strong>What happens next:</strong> click <em>Open WhatsApp Web</em> →
              WhatsApp opens the chat for {phone} with the full message + magic link
              pre-typed in the input box → you hit Enter yourself → the recipient sees
              one bubble that auto-unfurls into the big gold Terminal card.
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0E3470',
  color: '#fff',
  border: '1px solid rgba(255, 204, 51, 0.30)',
  borderRadius: 5,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const primaryButtonStyle: React.CSSProperties = {
  background: '#FFCC33',
  color: '#0E3470',
  border: 'none',
  padding: '11px 22px',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '0.02em',
}

const secondaryButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'rgba(255, 204, 51, 0.85)',
  border: '1px solid rgba(255, 204, 51, 0.40)',
  padding: '11px 22px',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '0.02em',
}

const mutedStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  fontStyle: 'italic',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      color: 'rgba(255, 204, 51, 0.72)',
      fontWeight: 600,
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <Label>{label}</Label>
      {children}
    </label>
  )
}
