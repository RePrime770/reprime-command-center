'use client'

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'

// ── Terminal design tokens (matches the recipient invite card) ──────────────
const NAVY = '#0E3470'
const NAVY_DEEP = '#0a2654'
const PANEL = '#13294f'
const PANEL_2 = '#102a55'
const GOLD = '#FFCC33'
const GOLD_RGB = '255, 204, 51'
const CREAM = '#F4EEE0'
const INK = '#EAF0FB'
const MUTE = '#9fb0cf'
const LINE = `rgba(${GOLD_RGB}, 0.18)`
const RED = '#E0574C'
const FONT_WORD = `'Cinzel', Georgia, serif`
const FONT_HEAD = `'Playfair Display', Georgia, serif`
const FONT_ITAL = `'EB Garamond', Georgia, serif`
const FONT_BODY = `'Poppins', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`

function TerminalFonts() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=EB+Garamond:ital@1&family=Poppins:wght@400;500;600;700&display=swap');`}</style>
}

// Short "do-do-do" chime when a new reply lands.
function playChime() {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    const ctx = new Ctx()
    ;[0, 0.16, 0.32].forEach((t, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = 880 + i * 120; o.type = 'sine'
      o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.14)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15)
    })
  } catch { /* blocked until first interaction — badge still shows */ }
}

type Cand = { name: string; phone: string; email: string; status: 'new' | 'already'; match: { when: string | null; inviteStatus: string; booked: boolean } | null }
type TrackContact = { name: string; phone: string; email: string; stage: string; opened: boolean; watched: boolean; awaitingUs: boolean; lastReply: string; lastFrom: string | null; outcome: string; remindAt: string | null; followupNote: string; snoozed: boolean; due: boolean; row: number }
type InboxItem = { channel: 'whatsapp' | 'email'; who: string; handle: string; preview: string; at: string | null; link: string; phone?: string; email?: string; account?: '305' | '718'; subject?: string }
type Tab = 'add' | 'track' | 'queue'

const PASS_KEY = 'center_pass'
const SEEN_KEY = 'center_inbox_seen'
const STAGE_COLOR: Record<string, string> = { replied: GOLD, sent: '#9fb0cf', booked: '#7CE0A8', declined: '#8A8680', unknown: '#c98b8b' }
const STAGE_LABEL: Record<string, string> = { replied: 'Replied · needs you', sent: 'Sent · no reply yet', booked: 'Booked', declined: 'Declined', unknown: 'Unknown' }

// ── Shared Terminal chrome ──────────────────────────────────────────────────
function Spindle() {
  return <div style={{ height: 2, width: '64%', margin: '0 auto', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
}
function Wordmark({ sub }: { sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0 18px' }}>
      <Spindle />
      <div style={{ fontFamily: FONT_WORD, fontSize: 30, letterSpacing: 8, color: GOLD, fontWeight: 600, margin: '12px 0 4px' }}>TERMINAL</div>
      <div style={{ fontFamily: FONT_ITAL, fontStyle: 'italic', fontSize: 15, color: CREAM, opacity: 0.85, marginBottom: 12 }}>{sub}</div>
      <Spindle />
    </div>
  )
}

export default function OutreachPage() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('track')
  const [inbox, setInbox] = useState<{ count: number; items: InboxItem[]; errors: string[] } | null>(null)
  const [inboxLoading, setInboxLoading] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const firstLoad = useRef(true)
  const [report, setReport] = useState<string | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => { const p = localStorage.getItem(PASS_KEY); if (p) { setPass(p); setAuthed(true) } }, [])

  const loadInbox = useCallback(async () => {
    if (!pass) return
    setInboxLoading(true)
    try {
      const r = await fetch('/api/center/inbox', { headers: { 'x-center-pass': pass } })
      const j = await r.json()
      setInbox(j)
      const seen = (typeof window !== 'undefined' && localStorage.getItem(SEEN_KEY)) || ''
      const fresh = (j.items || []).filter((it: InboxItem) => (it.at || '') > seen).length
      setUnseen(fresh)
      if (!firstLoad.current && fresh > 0) playChime()
      firstLoad.current = false
    } catch { /* keep last good */ } finally { setInboxLoading(false) }
  }, [pass])

  useEffect(() => {
    if (!authed) return
    loadInbox()
    const t = setInterval(loadInbox, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [authed, loadInbox])

  const markSeen = useCallback(() => {
    const newest = (inbox?.items && inbox.items[0]?.at) || new Date().toISOString()
    localStorage.setItem(SEEN_KEY, newest); setUnseen(0)
  }, [inbox])

  async function runReport(send: boolean) {
    setReportBusy(true); setReportSent(false)
    try {
      const r = await fetch('/api/center/report', { method: send ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: send ? '{"send":true}' : undefined })
      const j = await r.json()
      setReport(j.text || j.error || 'Could not build the report.')
      if (j.sent) setReportSent(true)
    } catch { setReport('Could not build the report.') } finally { setReportBusy(false) }
  }

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: `radial-gradient(1200px 600px at 50% -10%, ${NAVY}, ${NAVY_DEEP})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY }}>
        <TerminalFonts />
        <div style={{ background: PANEL, padding: '2.6rem 2.4rem', borderRadius: 4, width: 380, textAlign: 'center', border: `1px solid ${LINE}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <Wordmark sub="Command Center" />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', padding: '14px 16px', fontSize: 18, borderRadius: 4, border: `1px solid rgba(${GOLD_RGB},0.35)`, background: NAVY_DEEP, color: INK, boxSizing: 'border-box', fontFamily: FONT_BODY }} />
          <button onClick={() => { if (pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', marginTop: 14, padding: 14, fontSize: 17, fontWeight: 700, borderRadius: 4, border: 'none', background: GOLD, color: NAVY, cursor: 'pointer', fontFamily: FONT_BODY, letterSpacing: 0.5 }}>Enter</button>
        </div>
      </main>
    )
  }

  const tabBtn = (t: Tab, label: string, badge = 0) => (
    <button onClick={() => { setTab(t); if (t === 'queue') markSeen() }} style={{
      position: 'relative', padding: '12px 26px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
      border: 'none', background: 'transparent', color: tab === t ? GOLD : MUTE,
      borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', fontFamily: FONT_BODY, letterSpacing: 0.5,
    }}>
      {label}
      {badge > 0 && <span style={{ position: 'absolute', top: 4, right: 6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: RED, color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: '18px' }}>{badge}</span>}
    </button>
  )

  return (
    <main style={{ minHeight: '100vh', background: `radial-gradient(1400px 700px at 50% -15%, ${NAVY}, ${NAVY_DEEP})`, color: INK, fontFamily: FONT_BODY, padding: '20px 26px 60px' }}>
      <TerminalFonts />
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '6px 0 2px', position: 'relative' }}>
          <div style={{ fontFamily: FONT_WORD, fontSize: 26, letterSpacing: 6, color: GOLD, fontWeight: 600 }}>TERMINAL</div>
          <div style={{ fontFamily: FONT_ITAL, fontStyle: 'italic', fontSize: 16, color: CREAM, opacity: 0.8 }}>Command Center</div>
          <button onClick={() => runReport(false)} disabled={reportBusy} style={{ position: 'absolute', right: 0, top: 2, padding: '9px 18px', fontSize: 14, fontWeight: 700, borderRadius: 4, border: `1px solid ${GOLD}`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: FONT_BODY }}>{reportBusy ? '…' : '📊 Report'}</button>
        </div>

        {report !== null && (
          <div style={{ maxWidth: 760, margin: '12px auto 22px', background: PANEL, border: `1px solid ${GOLD}`, borderRadius: 6, padding: '18px 22px' }}>
            <pre dir="auto" style={{ whiteSpace: 'pre-wrap', fontFamily: FONT_BODY, fontSize: 15, color: INK, lineHeight: 1.65, margin: 0 }}>{report}</pre>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <button onClick={() => runReport(true)} disabled={reportBusy} style={pillBtn(true)}>{reportSent ? '✓ Sent to group' : reportBusy ? 'Sending…' : 'Send to WhatsApp group →'}</button>
              <button onClick={() => { setReport(null); setReportSent(false) }} style={{ background: 'transparent', border: 'none', color: MUTE, fontSize: 14, cursor: 'pointer', fontFamily: FONT_BODY }}>Close</button>
            </div>
          </div>
        )}
        <div style={{ borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 26 }}>
          {tabBtn('add', 'Add People')}
          {tabBtn('track', 'Track')}
          {tabBtn('queue', 'Queue', unseen)}
        </div>

        {unseen > 0 && tab !== 'queue' && (
          <div onClick={() => { setTab('queue'); markSeen() }} style={{ cursor: 'pointer', maxWidth: 760, margin: '0 auto 20px', padding: '12px 18px', borderRadius: 4, background: `rgba(224,87,76,0.12)`, border: `1px solid ${RED}`, color: '#ffd9d2', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
            🔔 {unseen} new {unseen === 1 ? 'message' : 'messages'} to answer — open the Queue.
          </div>
        )}

        {tab === 'add' && <AddView pass={pass} onAuthFail={() => { setAuthed(false); localStorage.removeItem(PASS_KEY) }} />}
        {tab === 'track' && <TrackView pass={pass} />}
        {tab === 'queue' && <QueueView pass={pass} data={inbox} loading={inboxLoading} reload={loadInbox} />}
      </div>
    </main>
  )
}

// ── ADD PEOPLE — drop an Excel/CSV (or paste), dedup, send the new ones ──────
function AddView({ pass, onAuthFail }: { pass: string; onAuthFail: () => void }) {
  const [text, setText] = useState('')
  const [cands, setCands] = useState<Cand[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [drag, setDrag] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fileToLines(file: File): Promise<string> {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][]
    const lines: string[] = []
    for (const cells of rows) {
      let name = '', phone = '', email = ''
      for (const cell of cells) {
        const v = String(cell ?? '').trim(); if (!v) continue
        if (/@/.test(v) && /\.[a-z]{2,}/i.test(v)) { if (!email) email = v }
        else if (/^[+(]?[\d][\d\s()+\-.]{6,}$/.test(v)) { if (!phone) phone = v }
        else if (!name) name = v
      }
      const line = [name, phone, email].filter(Boolean).join(', ')
      // keep only reachable rows (drops header + name-only rows automatically)
      if (/@/.test(line) || line.replace(/\D/g, '').length >= 7) lines.push(line)
    }
    return lines.join('\n')
  }

  async function ingest(content: string) {
    if (!content.trim()) { setMsg('Nothing to read — that file had no phones or emails.'); return }
    setText(content)
    await check(content)
  }

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return
    setBusy(true); setMsg('Reading the file…'); setCands(null)
    try { const lines = await fileToLines(files[0]); await ingest(lines) }
    catch (e) { setMsg('Could not read that file: ' + (e as Error).message.slice(0, 80)) }
    finally { setBusy(false) }
  }

  async function check(content?: string) {
    const body = (content ?? text).trim()
    if (!body) { setMsg('Drop a file or paste names first.'); return }
    setBusy(true); setMsg(''); setCands(null)
    try {
      const r = await fetch('/api/center/check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ text: body }) })
      if (r.status === 401) { onAuthFail(); return }
      const j = await r.json()
      setCands(j.candidates || [])
      if (!j.candidates?.length) setMsg('No names with a phone or email found.')
    } catch { setMsg('Could not check. Try again.') } finally { setBusy(false) }
  }

  async function send() {
    const fresh = (cands || []).filter((c) => c.status === 'new')
    if (!fresh.length) return
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/center/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ candidates: fresh.map((c) => ({ name: c.name, phone: c.phone, email: c.email })) }) })
      const j = await r.json()
      setMsg(`✓ Queued ${j.queued} ${j.queued === 1 ? 'person' : 'people'} — they go out one per minute, WhatsApp + email, spread across days.`)
      setCands(null); setText('')
    } catch { setMsg('Send failed. Try again.') } finally { setBusy(false) }
  }

  const fresh = (cands || []).filter((c) => c.status === 'new').length
  const dupe = (cands || []).filter((c) => c.status === 'already').length

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <p style={{ color: CREAM, fontSize: 16, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
        Drop your Excel or CSV. Anyone already invited shows in <span style={{ color: RED, fontWeight: 700 }}>red</span>; only the new ones get sent.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        style={{ cursor: 'pointer', border: `2px dashed ${drag ? GOLD : `rgba(${GOLD_RGB},0.4)`}`, background: drag ? `rgba(${GOLD_RGB},0.06)` : PANEL, borderRadius: 6, padding: '44px 24px', textAlign: 'center', transition: 'all .15s' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: GOLD, fontWeight: 600 }}>Drop your list here</div>
        <div style={{ color: MUTE, fontSize: 14, marginTop: 8 }}>Excel (.xlsx) or CSV — name, phone, email in any columns. Or click to choose a file.</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={() => setShowPaste((s) => !s)} style={{ background: 'transparent', border: 'none', color: MUTE, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT_BODY }}>
          {showPaste ? 'hide paste box' : 'or paste names instead'}
        </button>
      </div>
      {showPaste && (
        <div style={{ marginTop: 10 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={'One per line:  Name, +97250…, name@firm.com'}
            style={{ width: '100%', padding: 14, fontSize: 15, borderRadius: 4, border: `1px solid rgba(${GOLD_RGB},0.3)`, background: NAVY_DEEP, color: INK, boxSizing: 'border-box', fontFamily: FONT_BODY }} />
          <button onClick={() => check()} disabled={busy} style={pillBtn(false)}>Check the list</button>
        </div>
      )}

      {msg && <div style={{ marginTop: 16, textAlign: 'center', color: msg.startsWith('✓') ? '#7CE0A8' : CREAM, fontSize: 15 }}>{msg}</div>}

      {cands && cands.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, color: CREAM }}>
              <span style={{ color: '#7CE0A8', fontWeight: 700 }}>{fresh} new</span>
              {dupe > 0 && <span style={{ color: RED, fontWeight: 700 }}>  ·  {dupe} already sent</span>}
            </div>
            {fresh > 0 && <button onClick={send} disabled={busy} style={pillBtn(true)}>{busy ? 'Sending…' : `Send the ${fresh} new ${fresh === 1 ? 'one' : 'ones'} →`}</button>}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {cands.map((c, i) => (
              <div key={i} style={{ padding: '11px 16px', borderRadius: 4, background: c.status === 'already' ? `rgba(224,87,76,0.12)` : PANEL, border: `1px solid ${c.status === 'already' ? RED : LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: c.status === 'already' ? '#ffd9d2' : INK }}>{c.name || '(no name)'}</div>
                  <div style={{ fontSize: 12.5, color: MUTE }}>{[c.phone, c.email].filter(Boolean).join('  ·  ') || 'no phone / email'}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: c.status === 'already' ? RED : '#7CE0A8', whiteSpace: 'nowrap' }}>
                  {c.status === 'already' ? (c.match?.booked ? '✓ already booked' : 'already sent') : 'new'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function pillBtn(primary: boolean): CSSProperties {
  return { marginTop: primary ? 0 : 10, padding: '11px 22px', fontSize: 15, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: primary ? 'none' : `1px solid ${GOLD}`, background: primary ? GOLD : 'transparent', color: primary ? NAVY : GOLD, fontFamily: FONT_BODY }
}

// ── TRACK — the board, everyone to the end ──────────────────────────────────
function TrackView({ pass }: { pass: string }) {
  const [data, setData] = useState<{ counts: Record<string, number>; needsFollowup: number; awaitingUs: number; dueToday: number; snoozed: number; contacts: TrackContact[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('todo')
  const load = useCallback(() => { setLoading(true); fetch('/api/center/track', { headers: { 'x-center-pass': pass } }).then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false)) }, [pass])
  useEffect(() => { load() }, [load])

  async function remind(row: number, days: number) {
    const note = window.prompt('Note for this follow-up (optional):') || ''
    await fetch('/api/center/remind', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ row, days, note }) })
    load()
  }

  if (loading && !data) return <div style={{ textAlign: 'center', color: MUTE }}>Loading the board…</div>
  if (!data) return <div style={{ textAlign: 'center', color: RED }}>Could not load. <button onClick={load} style={{ color: GOLD, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Try again</button></div>

  const stages = ['replied', 'sent', 'booked', 'declined', 'unknown']
  let list = data.contacts
  if (filter === 'todo') list = data.contacts.filter((c) => !c.snoozed && c.stage !== 'booked' && c.stage !== 'declined')
  else if (filter === 'awaiting') list = data.contacts.filter((c) => c.awaitingUs && !c.snoozed)
  else if (filter === 'due') list = data.contacts.filter((c) => c.due)
  else if (filter === 'snoozed') list = data.contacts.filter((c) => c.snoozed)
  else if (filter !== 'all') list = data.contacts.filter((c) => c.stage === filter)
  list = [...list].sort((a, b) => (Number(b.awaitingUs) - Number(a.awaitingUs)) || (Number(b.due) - Number(a.due)))

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
        <button onClick={() => setFilter('todo')} style={chip(filter === 'todo', GOLD)}>To do {data.needsFollowup}</button>
        {data.awaitingUs > 0 && <button onClick={() => setFilter('awaiting')} style={chip(filter === 'awaiting', GOLD)}>↩ Awaiting you {data.awaitingUs}</button>}
        {data.dueToday > 0 && <button onClick={() => setFilter('due')} style={chip(filter === 'due', '#7CB0E0')}>Due today {data.dueToday}</button>}
        <button onClick={() => setFilter('booked')} style={chip(filter === 'booked', '#7CE0A8')}>Booked {data.counts.booked || 0}</button>
        {data.snoozed > 0 && <button onClick={() => setFilter('snoozed')} style={chip(filter === 'snoozed', MUTE)}>Snoozed {data.snoozed}</button>}
        <button onClick={() => setFilter('all')} style={chip(filter === 'all', CREAM)}>All {data.contacts.length}</button>
      </div>

      <div style={{ display: 'grid', gap: 8, maxWidth: 900, margin: '0 auto' }}>
        {list.map((c, i) => (
          <div key={i} style={{ padding: '13px 18px', borderRadius: 4, background: PANEL, border: c.awaitingUs ? `1.5px solid ${GOLD}` : `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 600, color: INK }}>{c.name}{c.awaitingUs && <span style={{ color: GOLD, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700 }}>  ↩ awaiting you</span>}</div>
                <div style={{ fontSize: 12.5, color: MUTE }}>{[c.phone, c.email].filter(Boolean).join('  ·  ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                {c.opened && <span title="Opened the invite" style={{ fontSize: 12, fontWeight: 700, color: '#7CB0E0' }}>👀 opened</span>}
                {c.watched && <span title="Watched the video" style={{ fontSize: 12, fontWeight: 700, color: '#C8A2FF' }}>▶ watched</span>}
                <span style={{ color: STAGE_COLOR[c.stage], fontWeight: 700, fontSize: 13 }}>{STAGE_LABEL[c.stage] || c.stage}</span>
              </div>
            </div>
            {c.lastReply && <div dir="auto" style={{ fontSize: 13, color: CREAM, marginTop: 7, lineHeight: 1.5, whiteSpace: 'pre-wrap', opacity: 0.92 }}>{c.lastReply}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center', flexWrap: 'wrap' }}>
              {c.snoozed && c.remindAt ? <span style={{ fontSize: 12.5, color: MUTE }}>⏰ remind {new Date(c.remindAt).toLocaleDateString()}{c.followupNote ? ' — ' + c.followupNote : ''}</span> : <>
                <span style={{ fontSize: 12, color: '#8194b5' }}>Remind:</span>
                {[['4d', 4], ['5d', 5], ['1 mo', 30]].map(([lbl, d]) => <button key={lbl as string} onClick={() => remind(c.row, d as number)} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 14, border: `1px solid rgba(${GOLD_RGB},0.35)`, background: 'transparent', color: CREAM, cursor: 'pointer', fontFamily: FONT_BODY }}>{lbl}</button>)}
              </>}
            </div>
          </div>
        ))}
        {list.length === 0 && <div style={{ textAlign: 'center', color: MUTE, padding: 30 }}>Nothing here right now.</div>}
      </div>
    </div>
  )
}

function chip(active: boolean, color: string): CSSProperties {
  return { padding: '8px 16px', fontSize: 14, fontWeight: 700, borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? color : `rgba(${GOLD_RGB},0.25)`}`, background: active ? color : 'transparent', color: active ? NAVY : CREAM, fontFamily: FONT_BODY }
}

// ── QUEUE — two lanes (WhatsApp · Email), awaiting band, funnel, cross-channel ─
const dg9 = (s: string) => (s || '').replace(/\D/g, '').slice(-9)
const pkey = (phone?: string, email?: string) => (phone ? 'p:' + dg9(phone) : email ? 'e:' + email.toLowerCase().trim() : '')

function QueueView({ pass, data, loading, reload }: { pass: string; data: { count: number; items: InboxItem[]; errors: string[] } | null; loading: boolean; reload: () => void }) {
  const [track, setTrack] = useState<{ counts: Record<string, number>; awaitingUs: number; contacts: TrackContact[] } | null>(null)
  const [sel, setSel] = useState<InboxItem | null>(null)
  useEffect(() => { fetch('/api/center/track', { headers: { 'x-center-pass': pass } }).then((r) => r.json()).then(setTrack).catch(() => {}) }, [pass, data])

  const contacts = track?.contacts || []
  const cByKey = new Map<string, TrackContact>()
  contacts.forEach((c) => { if (c.phone) cByKey.set('p:' + dg9(c.phone), c); if (c.email) cByKey.set('e:' + c.email.toLowerCase().trim(), c) })

  const live = data?.items || []
  const liveKeys = new Set(live.map((it) => pkey(it.phone, it.email)))
  // people who wrote and we still owe a reply (from the roster) but aren't in the live feed → add them
  const awaitingItems: InboxItem[] = contacts.filter((c) => c.awaitingUs && !liveKeys.has(pkey(c.phone, c.email))).map((c) => ({
    channel: c.phone ? 'whatsapp' : 'email', who: c.name, handle: [c.phone, c.email].filter(Boolean).join('  ·  '),
    preview: c.lastReply || '', at: null, link: c.phone ? `https://wa.me/${c.phone.replace(/\D/g, '')}` : '',
    phone: c.phone || undefined, email: c.email || undefined, account: '305',
  }))
  const all = [...live, ...awaitingItems]
  const wa = all.filter((i) => i.channel === 'whatsapp')
  const email = all.filter((i) => i.channel === 'email')

  const both = (it: InboxItem) => { const c = cByKey.get(pkey(it.phone, it.email)); return !!(c && c.phone && c.email) }
  const isAwaiting = (it: InboxItem) => { const c = cByKey.get(pkey(it.phone, it.email)); return !!(c && c.awaitingUs) }

  const total = contacts.length
  const opened = contacts.filter((c) => c.opened).length
  const watched = contacts.filter((c) => c.watched).length
  const funnel = [
    { label: 'In play', n: total, color: MUTE },
    { label: 'Opened', n: opened, color: '#7CB0E0' },
    { label: 'Watched', n: watched, color: '#C8A2FF' },
    { label: 'Replied', n: track?.counts.replied || 0, color: GOLD },
    { label: 'Booked', n: track?.counts.booked || 0, color: '#7CE0A8' },
  ]

  const card = (it: InboxItem, i: number) => {
    const active = sel && pkey(sel.phone, sel.email) === pkey(it.phone, it.email)
    return (
      <div key={i} onClick={() => setSel(it)} style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 4, background: active ? PANEL : PANEL_2, borderLeft: `3px solid ${it.channel === 'whatsapp' ? '#7CE0A8' : '#7CB0E0'}`, border: active ? `1px solid ${GOLD}` : `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.who}</span>
          <span style={{ display: 'flex', gap: 5, whiteSpace: 'nowrap' }}>
            {both(it) && <span title="On WhatsApp + email" style={{ fontSize: 10.5, fontWeight: 700, color: GOLD }}>★ both</span>}
            {isAwaiting(it) && <span style={{ fontSize: 10.5, fontWeight: 700, color: GOLD }}>↩</span>}
          </span>
        </div>
        <div dir="auto" style={{ fontSize: 12, color: MUTE, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.preview || '(open to read)'}</div>
      </div>
    )
  }

  const lane = (title: string, color: string, list: InboxItem[]) => (
    <div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color, marginBottom: 8 }}>{title} · {list.length}</div>
      <div style={{ display: 'grid', gap: 6, maxHeight: '62vh', overflowY: 'auto' }}>
        {list.map(card)}
        {list.length === 0 && <div style={{ color: MUTE, fontSize: 13, padding: 16, textAlign: 'center' }}>Empty.</div>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Funnel */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        {funnel.map((f) => (
          <div key={f.label} style={{ minWidth: 96, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 4, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: f.color, fontFamily: FONT_HEAD }}>{f.n}</div>
            <div style={{ fontSize: 11, color: MUTE, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</div>
          </div>
        ))}
      </div>

      {/* Awaiting band */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: (track?.awaitingUs || 0) > 0 ? `rgba(${GOLD_RGB},0.1)` : PANEL, border: `1px solid ${(track?.awaitingUs || 0) > 0 ? GOLD : LINE}`, borderRadius: 4, padding: '10px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: (track?.awaitingUs || 0) > 0 ? GOLD : MUTE, fontWeight: 600 }}>↩ {track?.awaitingUs || 0} awaiting your answer</div>
        <button onClick={reload} disabled={loading} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 14, border: `1px solid ${GOLD}`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: FONT_BODY }}>{loading ? 'Checking…' : '↻ Check now'}</button>
      </div>

      {/* Lanes + composer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 16, alignItems: 'start' }}>
        {lane('WhatsApp', '#7CE0A8', wa)}
        {lane('Email', '#7CB0E0', email)}
        {sel ? <Composer key={pkey(sel.phone, sel.email)} pass={pass} item={sel} onDone={() => { reload(); setSel(null) }} />
          : <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, padding: 40, textAlign: 'center', color: MUTE }}>Pick someone to answer. Their message comes up in Spanish + English; you reply and it goes out in Hebrew.</div>}
      </div>
      {data?.errors && data.errors.length > 0 && <div style={{ marginTop: 10, fontSize: 11, color: '#8A8680' }}>Some sources slow: {data.errors.join('; ')}</div>}
    </div>
  )
}

function Composer({ pass, item, onDone }: { pass: string; item: InboxItem; onDone: () => void }) {
  const [analysis, setAnalysis] = useState<{ context_es?: string; their_message_es?: string; their_message_en?: string; lang?: string; suggestions?: Array<{ label_es: string; reply_es: string; reply_he: string }> } | null>(null)
  const [loadingA, setLoadingA] = useState(true)
  const [draft, setDraft] = useState('')
  const [finalText, setFinalText] = useState('')
  const [working, setWorking] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoadingA(true); setAnalysis(null); setDraft(''); setFinalText(''); setSent(false); setErr('')
    fetch('/api/center/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ action: 'analyze', thread: item.preview, latest: item.preview }) })
      .then((r) => r.json()).then((j) => { if (j.error) setErr('Translate: ' + j.error); else setAnalysis(j) }).catch(() => setErr('Translate failed')).finally(() => setLoadingA(false))
  }, [pass, item])

  const target = analysis?.lang === 'en' ? 'en' : 'he'

  async function makeFinal() {
    if (!draft.trim()) return
    setWorking(true); setErr('')
    try {
      const r = await fetch('/api/center/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ action: 'finalize', draft, target }) })
      const j = await r.json(); if (j.error) setErr(j.error); else setFinalText(j.final || '')
    } catch { setErr('Could not build the reply.') } finally { setWorking(false) }
  }

  async function doSend() {
    const toSend = finalText.trim() || draft.trim()
    if (!toSend) return
    setWorking(true); setErr('')
    try {
      const r = await fetch('/api/center/reply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-center-pass': pass }, body: JSON.stringify({ channel: item.channel, phone: item.phone, email: item.email, account: item.account, subject: item.subject ? 'Re: ' + item.subject : undefined, text: toSend }) })
      const j = await r.json(); if (j.ok) { setSent(true); setTimeout(onDone, 900) } else setErr(j.error || 'send failed')
    } catch { setErr('Send failed.') } finally { setWorking(false) }
  }

  const inputStyle: CSSProperties = { width: '100%', padding: 12, fontSize: 15, borderRadius: 4, border: `1px solid rgba(${GOLD_RGB},0.3)`, background: NAVY_DEEP, color: INK, boxSizing: 'border-box', fontFamily: FONT_BODY, lineHeight: 1.5 }

  return (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: GOLD, fontWeight: 600 }}>{item.who}</div>
        <a href={item.link || undefined} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: MUTE }}>{item.channel === 'whatsapp' ? 'open WhatsApp ↗' : 'open in Gmail ↗'}</a>
      </div>
      <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 14 }}>{item.handle}</div>

      {/* What they said */}
      <div dir="auto" style={{ background: NAVY_DEEP, border: `1px solid ${LINE}`, borderRadius: 4, padding: 12, fontSize: 14.5, color: CREAM, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{item.preview || '(no preview — open the thread)'}</div>

      {loadingA && <div style={{ color: MUTE, fontSize: 13, marginTop: 12 }}>Reading it for you (Spanish + English)…</div>}
      {analysis && (
        <div style={{ marginTop: 12 }}>
          {analysis.context_es && <div style={{ fontSize: 13, color: MUTE, marginBottom: 6 }}><b style={{ color: CREAM }}>Contexto:</b> {analysis.context_es}</div>}
          {analysis.their_message_es && <div style={{ fontSize: 13.5, color: INK, marginBottom: 4 }}>🇪🇸 {analysis.their_message_es}</div>}
          {analysis.their_message_en && <div style={{ fontSize: 13.5, color: INK, marginBottom: 10 }}>🇺🇸 {analysis.their_message_en}</div>}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {analysis.suggestions.map((s, i) => (
                <div key={i} onClick={() => { setDraft(s.reply_es); setFinalText(s.reply_he) }} style={{ cursor: 'pointer', padding: '9px 12px', borderRadius: 4, background: NAVY_DEEP, border: `1px solid ${LINE}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Opción {i + 1} · {s.label_es}</div>
                  <div style={{ fontSize: 13.5, color: INK }}>{s.reply_es}</div>
                  <div dir="auto" style={{ fontSize: 13.5, color: CREAM, opacity: 0.85, marginTop: 3 }}>{s.reply_he}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        <label style={{ fontSize: 12, color: MUTE }}>Your reply (write in Spanish or English — or tap an option above)</label>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} style={{ ...inputStyle, marginTop: 4 }} />
        <button onClick={makeFinal} disabled={working || !draft.trim()} style={{ ...pillBtn(false), marginTop: 8 }}>{working ? 'Working…' : `Make it ${target === 'he' ? 'Hebrew' : 'English'} →`}</button>
      </div>

      {finalText && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Ready to send — edit if you want</label>
          <textarea dir="auto" value={finalText} onChange={(e) => setFinalText(e.target.value)} rows={3} style={{ ...inputStyle, marginTop: 4, borderColor: GOLD }} />
        </div>
      )}

      {err && <div style={{ marginTop: 10, color: RED, fontSize: 13 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
        <button onClick={doSend} disabled={working || sent || !(finalText.trim() || draft.trim())} style={pillBtn(true)}>{sent ? '✓ Sent' : working ? 'Sending…' : `Send ${item.channel === 'whatsapp' ? 'WhatsApp' : 'email'} →`}</button>
        <button onClick={onDone} style={{ background: 'transparent', border: 'none', color: MUTE, fontSize: 14, cursor: 'pointer', fontFamily: FONT_BODY }}>Skip →</button>
      </div>
    </div>
  )
}
