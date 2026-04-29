'use client'
import { useState } from 'react'
import type { DashboardMessage, Panel } from '@/lib/timelines/types'

type ModelKey = 'haiku' | 'opus' | 'opus-thinking'

type Contact = {
  name?: string | null
  phone?: string | null
} | null

type Props = {
  panel: Panel
  threadId: string
  threadHistory: DashboardMessage[]
  contact: Contact
  onDraft: (text: string) => void
  disabled?: boolean
}

const MODEL_OPTIONS: Array<{ value: ModelKey; label: string }> = [
  { value: 'haiku', label: '⚡ Haiku 4.5' },
  { value: 'opus', label: '🧠 Opus 4.7' },
  { value: 'opus-thinking', label: '💡 Opus 4.7 + Thinking' },
]

export default function DraftButton({
  panel,
  threadId,
  threadHistory,
  contact,
  onDraft,
  disabled,
}: Props) {
  const [model, setModel] = useState<ModelKey>('opus')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDraft = async () => {
    if (loading || disabled) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel,
          thread_id: threadId,
          model,
          extended_thinking: model === 'opus-thinking',
          messages: threadHistory,
          contact,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
      }
      const draft: string = (data?.draft || '').trim()
      if (!draft) throw new Error('empty draft')
      onDraft(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = disabled || loading

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as ModelKey)}
        disabled={isDisabled}
        title="Model"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'inherit',
          fontSize: '0.75rem',
          padding: '0.2rem 0.35rem',
          borderRadius: 4,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleDraft}
        disabled={isDisabled}
        title="Draft a reply"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: 'inherit',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          padding: '0.25rem 0.55rem',
          fontSize: '0.8rem',
          borderRadius: 4,
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {loading ? '⏳ Drafting…' : '✨ Draft'}
      </button>
      {error && (
        <span style={{ color: 'var(--rp-red)', fontSize: '0.7rem' }}>{error}</span>
      )}
    </span>
  )
}
