'use client'

import { useEffect, useState, useCallback } from 'react'

type Cand = {
  name: string; phone: string; email: string
  status: 'new' | 'already'
  match: { when: string | null; inviteStatus: string; booked: boolean } | null
}

const PASS_KEY = 'center_pass'

export default function OutreachPage() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [text, setText] = useState('')
  const [cands, setCands] = useState<Cand[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [counts, setCounts] = useState<Record<string, number> | null>(null)

  useEffect(() => { const p = localStorage.getItem(PASS_KEY); if (p) { setPass(p); setAuthed(true) } }, [])

  const hdr = useCallback(() => ({ 'Content-Type': 'application/json', 'x-center-pass': pass }), [pass])

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/center/status', { headers: { 'x-center-pass': pass } })
      if (r.ok) { const j = await r.json(); setCounts(j.counts) }
    } catch { /* ignore */ }
  }, [pass])

  useEffect(() => { if (!authed) return; refreshStatus(); const t = setInterval(refreshStatus, 15000); return () => clearInterval(t) }, [authed, refreshStatus])

  async function check() {
    setBusy(true); setMsg(''); setCands(null)
    try {
      const r = await fetch('/api/center/check', { method: 'POST', headers: hdr(), body: JSON.stringify({ text }) })
      if (r.status === 401) { setAuthed(false); localStorage.removeItem(PASS_KEY); setMsg('Wrong password.'); return }
      const j = await r.json()
      setCands(j.candidates || [])
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
      setMsg(`Queued ${j.queued} to send (about one per minute, ban-safe). ${j.skipped ? j.skipped + ' had no phone or email and were skipped.' : ''}`)
      setCands(null); setText(''); refreshStatus()
    } catch (e) { setMsg('Send failed: ' + (e as Error).message) } finally { setBusy(false) }
  }

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: '#0E3470', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lexend, Arial, sans-serif' }}>
        <div style={{ background: '#13294f', padding: '2.5rem', borderRadius: 12, width: 360, textAlign: 'center', border: '1px solid #FFCC33' }}>
          <div style={{ color: '#FFCC33', fontSize: 22, fontWeight: 700, letterSpacing: 3, marginBottom: 6 }}>TERMINAL</div>
          <div style={{ color: '#cdd6e6', fontSize: 14, marginBottom: 22 }}>Command Center · Outreach</div>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password"
            onKeyDown={(e) => { if (e.key === 'Enter' && pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', padding: '14px 16px', fontSize: 18, borderRadius: 8, border: '1px solid #3a5688', background: '#0E3470', color: '#fff', boxSizing: 'border-box' }} autoFocus />
          <button onClick={() => { if (pass) { localStorage.setItem(PASS_KEY, pass); setAuthed(true) } }}
            style={{ width: '100%', marginTop: 14, padding: '14px', fontSize: 18, fontWeight: 700, borderRadius: 8, border: 'none', background: '#FFCC33', color: '#0E3470', cursor: 'pointer' }}>Enter</button>
        </div>
      </main>
    )
  }

  const freshCount = cands ? cands.filter((c) => c.status === 'new' && (c.phone || c.email)).length : 0

  return (
    <main style={{ minHeight: '100vh', background: '#0E3470', color: '#F4F2EC', fontFamily: 'Lexend, Arial, sans-serif', padding: '28px 22px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: '#FFCC33', fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>TERMINAL · Outreach</div>
          {counts && <div style={{ fontSize: 15, color: '#cdd6e6' }}>Queue: <b style={{ color: '#FFCC33' }}>{counts.queued || 0}</b> waiting · {counts.sent || 0} sent{counts.send_failed ? ` · ${counts.send_failed} failed` : ''}</div>}
        </div>
        <p style={{ color: '#aebcd6', fontSize: 15, marginTop: 0, marginBottom: 18 }}>Paste your list — one per line. Name, phone (+972…), and/or email, in any order. I check every name against everyone we have ever contacted and flag repeats in <b style={{ color: '#FF6B6B' }}>red</b>.</p>

        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
          placeholder={'Yossi Levi, +972 54-123-4567, yossi@example.com\nDavid Cohen | +972 50-765-4321\nrachel@example.com'}
          style={{ width: '100%', padding: 16, fontSize: 16, lineHeight: 1.6, borderRadius: 10, border: '1px solid #3a5688', background: '#13294f', color: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }} />

        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={check} disabled={busy || !text.trim()}
            style={{ padding: '14px 28px', fontSize: 17, fontWeight: 700, borderRadius: 8, border: '1px solid #FFCC33', background: 'transparent', color: '#FFCC33', cursor: busy ? 'default' : 'pointer', opacity: busy || !text.trim() ? 0.6 : 1 }}>
            {busy ? 'Checking…' : 'Check the list'}
          </button>
          {cands && freshCount > 0 && (
            <button onClick={send} disabled={busy}
              style={{ padding: '14px 28px', fontSize: 17, fontWeight: 700, borderRadius: 8, border: 'none', background: '#FFCC33', color: '#0E3470', cursor: 'pointer' }}>
              Send the {freshCount} new {freshCount === 1 ? 'one' : 'ones'}
            </button>
          )}
        </div>

        {msg && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#13294f', border: '1px solid #3a5688', fontSize: 15 }}>{msg}</div>}

        {cands && cands.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 15, color: '#cdd6e6', marginBottom: 10 }}>
              {cands.filter((c) => c.status === 'new').length} new · <span style={{ color: '#FF6B6B', fontWeight: 700 }}>{cands.filter((c) => c.status === 'already').length} already sent (red)</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {cands.map((c, i) => {
                const dup = c.status === 'already'
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 8,
                    background: dup ? 'rgba(255,107,107,0.13)' : '#13294f',
                    border: dup ? '1.5px solid #FF6B6B' : '1px solid #2a4068',
                  }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: dup ? '#FF8585' : '#F4F2EC' }}>{c.name || '(no name)'}</div>
                      <div style={{ fontSize: 13, color: '#9fb0cf' }}>{[c.phone, c.email].filter(Boolean).join('  ·  ') || 'no phone / no email'}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13 }}>
                      {dup ? (
                        <span style={{ color: '#FF6B6B', fontWeight: 700 }}>
                          ALREADY SENT{c.match?.booked ? ' · BOOKED' : c.match?.inviteStatus ? ' · ' + c.match.inviteStatus : ''}
                        </span>
                      ) : (c.phone || c.email) ? (
                        <span style={{ color: '#7CE0A8', fontWeight: 700 }}>NEW</span>
                      ) : (
                        <span style={{ color: '#E0C56B' }}>no contact info</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
