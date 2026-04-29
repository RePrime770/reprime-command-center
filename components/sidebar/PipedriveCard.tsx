'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DashboardThread, Panel } from '@/lib/timelines/types'
import type {
  PipedriveActivity,
  PipedriveContactValue,
  PipedrivePerson,
} from '@/lib/pipedrive/client'

interface ResolvePayload {
  person: PipedrivePerson | null
  activities: PipedriveActivity[]
  fieldKeys: { dashboard: string | null; tag: string | null }
}

interface Theme {
  bg: string
  surface: string
  border: string
  text: string
  muted: string
  accent: string
  inputBg: string
  inputText: string
  buttonBg: string
  buttonText: string
}

const themes: Record<Panel, Theme> = {
  '305': {
    bg: 'var(--rp-navy)',
    surface: 'var(--rp-surface)',
    border: 'var(--rp-border)',
    text: 'var(--rp-white)',
    muted: 'var(--rp-gold-lite)',
    accent: 'var(--rp-gold)',
    inputBg: '#0A1F44',
    inputText: '#FFFFFF',
    buttonBg: 'var(--rp-gold)',
    buttonText: 'var(--rp-navy)',
  },
  '718': {
    bg: 'var(--personal-bg)',
    surface: 'var(--personal-surface)',
    border: 'var(--personal-border)',
    text: 'var(--personal-text)',
    muted: 'var(--personal-muted)',
    accent: 'var(--personal-accent)',
    inputBg: '#FFFFFF',
    inputText: 'var(--personal-text)',
    buttonBg: 'var(--personal-accent)',
    buttonText: '#FFFFFF',
  },
}

function primaryFromList(list: PipedriveContactValue[] | null | undefined): string | null {
  if (!list || list.length === 0) return null
  const primary = list.find((x) => x.primary)
  return (primary ?? list[0]).value || null
}

function fmtActivityDate(a: PipedriveActivity): string {
  const raw = a.update_time || a.add_time || a.due_date || ''
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PipedriveCard({
  thread,
  panel,
}: {
  thread: DashboardThread
  panel: Panel
}) {
  const theme = themes[panel]
  const queryClient = useQueryClient()
  const queryKey = ['pipedrive', 'resolve', thread.phone, panel] as const

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<ResolvePayload> => {
      const res = await fetch(
        `/api/pipedrive/resolve?phone=${encodeURIComponent(thread.phone)}&panel=${panel}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as ResolvePayload
    },
    staleTime: 60_000,
  })

  const person = data?.person ?? null
  const activities = data?.activities ?? []
  const fieldKeys = data?.fieldKeys ?? { dashboard: null, tag: null }

  const initialNote = useMemo(() => {
    if (!person || !fieldKeys.dashboard) return ''
    const v = person[fieldKeys.dashboard]
    return typeof v === 'string' ? v : ''
  }, [person, fieldKeys.dashboard])

  const tagValue = useMemo(() => {
    if (!person || !fieldKeys.tag) return null
    const v = person[fieldKeys.tag]
    if (v == null) return null
    return typeof v === 'string' ? v : String(v)
  }, [person, fieldKeys.tag])

  const [note, setNote] = useState<string>(initialNote)
  useEffect(() => {
    setNote(initialNote)
  }, [initialNote])

  const saveNote = useMutation({
    mutationFn: async (value: string) => {
      if (!person) return
      const res = await fetch('/api/pipedrive/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: person.id,
          value,
          phone: thread.phone,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const onNoteBlur = () => {
    if (!person) return
    if (note === initialNote) return
    saveNote.mutate(note)
  }

  const orgName =
    typeof person?.org_id === 'object' && person?.org_id
      ? (person.org_id as { name?: string }).name ?? null
      : person?.org_name ?? null

  const primaryEmail = person?.primary_email ?? primaryFromList(person?.email)
  const primaryPhone = primaryFromList(person?.phone)

  const containerStyle: React.CSSProperties = {
    width: 300,
    flexShrink: 0,
    background: theme.surface,
    borderLeft: `1px solid ${theme.border}`,
    padding: '0.85rem',
    overflowY: 'auto',
    color: theme.text,
    fontSize: 13,
  }

  if (isLoading) {
    return (
      <aside style={containerStyle}>
        <div style={{ height: 14, width: '60%', background: theme.border, borderRadius: 3 }} />
        <div style={{ height: 12, width: '40%', background: theme.border, borderRadius: 3, marginTop: 10 }} />
        <div style={{ height: 12, width: '80%', background: theme.border, borderRadius: 3, marginTop: 6 }} />
        <div style={{ height: 12, width: '70%', background: theme.border, borderRadius: 3, marginTop: 6 }} />
      </aside>
    )
  }

  if (isError) {
    return (
      <aside style={containerStyle}>
        <p style={{ color: 'var(--rp-red)', margin: 0, fontSize: 12 }}>
          Pipedrive lookup failed: {(error as Error).message}
        </p>
      </aside>
    )
  }

  if (!person) {
    return (
      <aside style={containerStyle}>
        <p style={{ color: theme.muted, margin: '0 0 0.75rem', fontSize: 12 }}>
          No Pipedrive contact found.
        </p>
        <button
          type="button"
          onClick={() => window.alert('Create-from-conversation: stub for V2.')}
          style={{
            background: theme.buttonBg,
            color: theme.buttonText,
            border: 'none',
            borderRadius: 4,
            padding: '0.55rem 0.75rem',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Create from this conversation
        </button>
      </aside>
    )
  }

  return (
    <aside style={containerStyle}>
      <header style={{ marginBottom: '0.75rem' }}>
        <h2
          style={{
            color: theme.accent,
            fontSize: '1rem',
            fontWeight: 600,
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {person.name}
        </h2>
        {orgName && (
          <div style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{orgName}</div>
        )}
      </header>

      <dl style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
        {primaryEmail && (
          <div style={{ marginBottom: 4 }}>
            <dt style={{ color: theme.muted, display: 'inline', marginRight: 6 }}>email</dt>
            <dd style={{ display: 'inline', margin: 0, wordBreak: 'break-all' }}>
              {primaryEmail}
            </dd>
          </div>
        )}
        {primaryPhone && (
          <div style={{ marginBottom: 4 }}>
            <dt style={{ color: theme.muted, display: 'inline', marginRight: 6 }}>phone</dt>
            <dd style={{ display: 'inline', margin: 0 }}>{primaryPhone}</dd>
          </div>
        )}
        {tagValue && (
          <div style={{ marginBottom: 4 }}>
            <dt style={{ color: theme.muted, display: 'inline', marginRight: 6 }}>tag</dt>
            <dd style={{ display: 'inline', margin: 0 }}>{tagValue}</dd>
          </div>
        )}
      </dl>

      <section style={{ marginTop: '0.85rem' }}>
        <h3
          style={{
            color: theme.muted,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            margin: '0 0 0.4rem',
          }}
        >
          Recent activity
        </h3>
        {activities.length === 0 ? (
          <div style={{ color: theme.muted, fontSize: 12 }}>No recent activity.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {activities.map((a) => (
              <li
                key={a.id}
                style={{
                  fontSize: 12,
                  marginBottom: 6,
                  paddingBottom: 6,
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                <div style={{ color: theme.muted, fontSize: 11 }}>
                  {fmtActivityDate(a)} · {a.type}
                </div>
                <div style={{ color: theme.text, wordBreak: 'break-word' }}>
                  {a.subject || '(no subject)'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '0.85rem' }}>
        <h3
          style={{
            color: theme.muted,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            margin: '0 0 0.4rem',
          }}
        >
          Notes from Dashboard
          {saveNote.isPending && (
            <span style={{ color: theme.muted, marginLeft: 6, fontWeight: 400 }}>· saving…</span>
          )}
          {saveNote.isError && (
            <span style={{ color: 'var(--rp-red)', marginLeft: 6, fontWeight: 400 }}>· save failed</span>
          )}
        </h3>
        {fieldKeys.dashboard ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={onNoteBlur}
            placeholder="Add notes..."
            rows={4}
            style={{
              width: '100%',
              background: theme.inputBg,
              color: theme.inputText,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              padding: '0.5rem',
              fontSize: 12,
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ color: theme.muted, fontSize: 12 }}>
            (Pipedrive person field "Notes from Dashboard" not configured.)
          </div>
        )}
      </section>
    </aside>
  )
}
