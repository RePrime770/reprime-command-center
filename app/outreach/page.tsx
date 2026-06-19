'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'

type Cand = { name: string; phone: string; email: string; status: 'new' | 'already'; match: { when: string | null; inviteStatus: string; booked: boolean } | null }
type TrackContact = { name: string; phone: string; email: string; stage: string; awaitingUs: boolean; lastReply: string; lastFrom: string | null; outcome: string; remindAt: string | null; followupNote: string; snoozed: boolean; due: boolean; row: number }
type InboxItem = { channel: 'whatsapp' | 'email'; who: string; handle: string; preview: string; at: string | null; link: string }
type Tab = 'send' | 'track' | 'inbox'

const PASS_KEY = 'center_pass'
const STAGE_COLOR: Record<string, string> = { replied: '#FFCC33', sent: '#9fb0cf', booked: '#7CE0A8', declined: '#8A8680', unknown: '#c98b8b' }
const STAGE_LABEL: Record<string, string> = { replied: 'Replied · needs you', sent: 'Sent · no reply yet', booked: 'Booked', declined: 'Declined / not relevant', unknown: 'Unknown' }

export default function OutreachPage() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('send')
  const hdr = useCallback(() => ({ 'Content-Type': 'application/json', 'x-center-pass': pass }), [pass])

  useEffect(() => { const p = localStorage.getItem(PASS_KEY); if (p) { setPass(p); setAuthed(true) } }, [])

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: '#0E3470', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lexend, Arial, sans-serif' }}>
        <div style={{ background: '#13294f', padding: '2.5rem', borderRadius: 12, width: 360, textAlign: 'center', border: '1px solid #FFCC33' }}>
          <div style={{ color: '#FFCC33', fontSize: 22, fontWeight: 700, letterSpacing: 3, marginBottom: 6 }}>TERMINAL</div>
          <div style={{ color: '#cdd6e6', fontSize: 14, marginBottom: 22 }}>Command Center</div>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password"
            onKeyDown={(e) => { if (e.key === 'Enter' && pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', padding: '14px 16px', fontSize: 18, borderRadius: 8, border: '1px solid #3a5688', background: '#0E3470', color: '#fff', boxSizing: 'border-box' }} autoFocus />
          <button onClick={() => { if (pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', marginTop: 14, padding: '14px', fontSize: 18, fontWeight: 700, borderRadius: 8, border: 'none', background: '#FFCC33', color: '#0E3470', cursor: 'pointer' }}>Enter</button>
        </div>
      </main>
    )
  }

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: '10px 22px', fontSize: 16, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
      border: tab === t ? '1px solid #FFCC33' : '1px solid #2a4068',
      background: tab === t ? '#FFCC33' : 'transparent', color: tab === t ? '#0E3470' : '#cdd6e6',
    }}>{label}</button>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0E3470', color: '#F4F2EC', fontFamily: 'Lexend, Arial, sans-serif', padding: '24px 22px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ color: '#FFCC33', fontSize: 26, fontWeight: 700, letterSpacing: 3, marginBottom: 14 }}>TERMINAL · Command Center</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {tabBtn('send', 'Send')}
          {tabBtn('track', 'Track')}
          {tabBtn('inbox', 'Inbox')}
        </div>
        {tab === 'send' && <SendView hdr={hdr} onAuthFail={() => { setAuthed(false); localStorage.removeItem(PASS_KEY) }} />}
        {tab === 'track' && <TrackView pass={pass} />}
        {tab === 'inbox' && <InboxView pass={pass} />}
      </div>
    </main>
  )
}

function SendView({ hdr, onAuthFail }: { hdr: () => Record<string, string>; onAuthFail: () => void }) {
  const [text, setText] = useState('')
  const [cands, setCands] = useState<Cand[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function check() {
    if (!text.trim()) { setMsg('Paste at least one name in the box first.'); return }
    setBusy(true); setMsg(''); setCands(null)
    try {
      const r = await fetch('/api/center/check', { method: 'POST', headers: hdr(), body: JSON.stringify({ text }) })
      if (r.status === 401) { onAuthFail(); return }
      const j = await r.json(); setCands(j.candidates || [])
    } catch (e) { setMsg('Check failed: ' + (e as Error).message) } finally { setBusy(false) }
  }
  async function send() {
    if (!cands) return
    const fresh = cands.filter((c) => c.status === 'new' && (c.phone || c.email))
    if (!fresh.length) { setMsg('Nothing new to send.'); return }
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/center/send', { method: 'POST', headers: hdr(), body: JSON.stringify({ candidates: fresh }) })
      const j = await r.json()
      setMsg(`Queued ${j.queued} to send (about one per minute, ban-safe).${j.skipped ? ' ' + j.skipped + ' skipped (no phone/email).' : ''}`)
      setCands(null); setText('')
    } catch (e) { setMsg('Send failed: ' + (e as Error).message) } finally { setBusy(false) }
  }
  const freshCount = cands ? cands.filter((c) => c.status === 'new' && (c.phone || c.email)).length : 0

  return (
    <div>
      <p style={{ color: '#aebcd6', fontSize: 15, marginTop: 0, marginBottom: 14 }}>Paste your list — one per line, name + phone + email in any order. Already-contacted names show in <b style={{ color: '#FF6B6B' }}>red</b>; only the new ones send.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={'Yossi Levi, +972 54-123-4567, yossi@example.com\nrachel@example.com'}
        style={{ width: '100%', padding: 16, fontSize: 16, lineHeight: 1.6, borderRadius: 10, border: '1px solid #3a5688', background: '#13294f', color: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={check} disabled={busy} style={{ padding: '14px 28px', fontSize: 17, fontWeight: 700, borderRadius: 8, border: '1px solid #FFCC33', background: 'transparent', color: '#FFCC33', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Working…' : 'Check the list'}</button>
        {cands && freshCount > 0 && <button onClick={send} disabled={busy} style={{ padding: '14px 28px', fontSize: 17, fontWeight: 700, borderRadius: 8, border: 'none', background: '#FFCC33', color: '#0E3470', cursor: 'pointer' }}>Send the {freshCount} new {freshCount === 1 ? 'one' : 'ones'}</button>}
      </div>
      {msg && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#13294f', border: '1px solid #3a5688', fontSize: 15 }}>{msg}</div>}
      {cands && cands.length > 0 && (
        <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
          {cands.map((c, i) => {
            const dup = c.status === 'already'
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: dup ? 'rgba(255,107,107,0.13)' : '#13294f', border: dup ? '1.5px solid #FF6B6B' : '1px solid #2a4068' }}>
                <div><div style={{ fontSize: 17, fontWeight: 600, color: dup ? '#FF8585' : '#F4F2EC' }}>{c.name || '(no name)'}</div><div style={{ fontSize: 13, color: '#9fb0cf' }}>{[c.phone, c.email].filter(Boolean).join('  ·  ') || 'no phone / no email'}</div></div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>{dup ? <span style={{ color: '#FF6B6B', fontWeight: 700 }}>ALREADY SENT{c.match?.booked ? ' · BOOKED' : c.match?.inviteStatus ? ' · ' + c.match.inviteStatus : ''}</span> : (c.phone || c.email) ? <span style={{ color: '#7CE0A8', fontWeight: 700 }}>NEW</span> : <span style={{ color: '#E0C56B' }}>no contact info</span>}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrackView({ pass }: { pass: string }) {
  const [data, setData] = useState<{ counts: Record<string, number>; needsFollowup: number; awaitingUs: number; dueToday: number; snoozed: number; contacts: TrackContact[] } | null>(null)
  const [filter, setFilter] = useState<string>('todo')
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => { setLoading(true); fetch('/api/center/track', { headers: { 'x-center-pass': pass } }).then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false)) }, [pass])
  useEffect(() => { load() }, [load])
  async function remind(row: number, days: number) {
    const note = window.prompt('What to send when this comes back up? (optional)') ?? undefined
    await fetch('/api/center/remind', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ row, days, note }) })
    load()
  }
  if (loading) return <div style={{ color: '#aebcd6' }}>Loading the board…</div>
  if (!data || !data.contacts) return <div style={{ color: '#FF6B6B' }}>Could not load. Try again.</div>
  const stages = ['replied', 'sent', 'booked', 'declined', 'unknown']
  let list = data.contacts
  if (filter === 'todo') list = data.contacts.filter((c) => !c.snoozed && c.stage !== 'booked' && c.stage !== 'declined')
  else if (filter === 'awaiting') list = data.contacts.filter((c) => c.awaitingUs && !c.snoozed)
  else if (filter === 'due') list = data.contacts.filter((c) => c.due)
  else if (filter === 'snoozed') list = data.contacts.filter((c) => c.snoozed)
  else if (filter === 'all') list = data.contacts
  else list = data.contacts.filter((c) => c.stage === filter)
  // awaiting-you and due float to the top of any view
  list = [...list].sort((a, b) => (Number(b.awaitingUs) - Number(a.awaitingUs)) || (Number(b.due) - Number(a.due)))
  return (
    <div>
      <p style={{ color: '#aebcd6', fontSize: 15, marginTop: 0 }}>Work <b style={{ color: '#FFCC33' }}>To-do</b> down to a meeting or a no. "Remind" parks someone until a date and drops a note on your calendar; they come back in <b>Due</b>.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setFilter('todo')} style={chip(filter === 'todo', '#FFCC33')}>To-do {data.needsFollowup}</button>
        {data.awaitingUs > 0 && <button onClick={() => setFilter('awaiting')} style={chip(filter === 'awaiting', '#FFCC33')}>Awaiting you {data.awaitingUs}</button>}
        {data.dueToday > 0 && <button onClick={() => setFilter('due')} style={chip(filter === 'due', '#FF6B6B')}>Due {data.dueToday}</button>}
        <button onClick={() => setFilter('booked')} style={chip(filter === 'booked', STAGE_COLOR.booked)}>Booked {data.counts.booked || 0}</button>
        {data.snoozed > 0 && <button onClick={() => setFilter('snoozed')} style={chip(filter === 'snoozed', '#9fb0cf')}>Snoozed {data.snoozed}</button>}
        <button onClick={() => setFilter('all')} style={chip(filter === 'all', '#9fb0cf')}>All {data.contacts.length}</button>
        {stages.filter((s) => s !== 'booked').map((s) => (data.counts[s] || 0) > 0 && <button key={s} onClick={() => setFilter(s)} style={chip(filter === s, STAGE_COLOR[s])}>{STAGE_LABEL[s]} {data.counts[s]}</button>)}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {list.map((c, i) => (
          <div key={i} style={{ padding: '11px 15px', borderRadius: 8, background: '#13294f', border: c.awaitingUs ? '1.5px solid #FFCC33' : '1px solid #2a4068' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}{c.awaitingUs && <span style={{ color: '#FFCC33', fontSize: 12.5, fontWeight: 700 }}> · ↩ awaiting you</span>}</div><div style={{ fontSize: 12.5, color: '#9fb0cf' }}>{[c.phone, c.email].filter(Boolean).join('  ·  ')}</div></div>
              <span style={{ color: STAGE_COLOR[c.stage], fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>{STAGE_LABEL[c.stage] || c.stage}</span>
            </div>
            {c.lastReply && <div dir="auto" style={{ fontSize: 12.5, color: '#aebcd6', marginTop: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.lastReply}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {c.snoozed && c.remindAt ? <span style={{ fontSize: 12.5, color: '#9fb0cf' }}>⏰ remind {new Date(c.remindAt).toLocaleDateString()}{c.followupNote ? ' — ' + c.followupNote : ''}</span> : <>
                <span style={{ fontSize: 12, color: '#8194b5' }}>Remind:</span>
                {[['4d', 4], ['5d', 5], ['1 mo', 30]].map(([lbl, d]) => <button key={lbl as string} onClick={() => remind(c.row, d as number)} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 14, border: '1px solid #3a5688', background: 'transparent', color: '#cdd6e6', cursor: 'pointer' }}>{lbl}</button>)}
              </>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InboxView({ pass }: { pass: string }) {
  const [data, setData] = useState<{ count: number; items: InboxItem[]; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => { setLoading(true); fetch('/api/center/inbox', { headers: { 'x-center-pass': pass } }).then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false)) }, [pass])
  useEffect(() => { load() }, [load])
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: '#aebcd6', fontSize: 15, margin: 0 }}>Every reply — WhatsApp and email — in one place, newest first.</p>
        <button onClick={load} disabled={loading} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: '1px solid #FFCC33', background: 'transparent', color: '#FFCC33', cursor: 'pointer' }}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {!loading && data && data.items.length === 0 && <div style={{ color: '#9fb0cf' }}>No new replies right now.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {data?.items.map((it, i) => (
          <a key={i} href={it.link || undefined} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', padding: '12px 16px', borderRadius: 8, background: '#13294f', border: '1px solid #2a4068' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#F4F2EC' }}>{it.who}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: it.channel === 'whatsapp' ? '#7CE0A8' : '#7CB0E0' }}>{it.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
            </div>
            <div style={{ fontSize: 14, color: '#cdd6e6', marginTop: 4, lineHeight: 1.5 }}>{it.preview || '(open to read)'}</div>
            <div style={{ fontSize: 12, color: '#8194b5', marginTop: 4 }}>{it.handle}{it.at ? '  ·  ' + new Date(it.at).toLocaleString() : ''}</div>
          </a>
        ))}
      </div>
      {data?.errors && data.errors.length > 0 && <div style={{ marginTop: 12, fontSize: 12, color: '#8A8680' }}>Some sources slow to load: {data.errors.join('; ')}</div>}
    </div>
  )
}

function chip(active: boolean, color: string): CSSProperties {
  return { padding: '8px 14px', fontSize: 14, fontWeight: 700, borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? color : '#2a4068'}`, background: active ? color : 'transparent', color: active ? '#0E3470' : '#cdd6e6' }
}
