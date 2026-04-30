'use client'
import type { Panel } from '@/lib/timelines/types'

type Props = {
  panel: Panel
  phone: string
  isGroup: boolean
  contactName?: string | null
}

function toE164(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

export default function CallButton({ panel, phone, isGroup, contactName }: Props) {
  if (isGroup) return null
  const e164 = toE164(phone)
  const display = contactName || phone

  const onClick = () => {
    if (panel === '305') {
      const url = `https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(e164)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = `tel:${e164}`
    }
  }

  const accent = panel === '305' ? 'var(--rp-gold)' : 'var(--personal-accent)'
  const accentText = panel === '305' ? 'var(--rp-navy)' : '#fff'
  const border = panel === '305' ? 'var(--rp-border)' : 'var(--personal-border)'
  const hint = panel === '305' ? 'Call via Google Voice' : 'Dial on iPhone'

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${hint} — ${display} (${e164})`}
      aria-label={`Call ${display}`}
      style={{
        background: accent,
        color: accentText,
        border: `1px solid ${border}`,
        borderRadius: 999,
        padding: '0.3rem 0.75rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
      }}
    >
      <span aria-hidden>📞</span>
      <span>Call</span>
    </button>
  )
}
