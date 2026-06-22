import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, X, Mic, Square } from 'lucide-react';
import { ink, semantic } from '../lib/colors.js';
import { useDictation } from '../lib/voiceClient.js';
import PanelShell from './PanelShell.jsx';

/**
 * NOTES — live quick-notes, persisted to Supabase via /api/notes (GET/POST/DELETE).
 * Self-contained (does its own fetch, like NoraChat) so it drops into the left
 * flank without touching shared state. Dictation (Whisper) fills the note body.
 */
const ACCENT = '#0891B2';

export default function NotesPanel({ width }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notes', { credentials: 'same-origin' });
      if (!res.ok) { setStatus('error'); return; }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.notes) ? data.notes : [];
      setNotes(rows);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { recording, toggle: toggleMic } = useDictation({
    language: 'en',
    onText: (t) => setBody((b) => (b ? `${b} ${t}` : t)),
  });

  const add = async () => {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, body: body.trim() }),
      });
      if (res.ok) {
        setTitle('');
        setBody('');
        await load();
      }
    } catch {
      /* keep input on failure */
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id)); // optimistic
    try {
      await fetch('/api/notes', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      load(); // reload on failure to resync
    }
  };

  return (
    <PanelShell width={width} accent={ACCENT} title="NOTES" subtitle="quick capture">
      {/* Composer */}
      <div style={{ padding: 8, borderBottom: `1px solid ${semantic.divider}`, background: '#FFFFFF', flexShrink: 0 }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Note title…"
          style={{
            width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 6,
            padding: '7px 9px', fontSize: 15, fontFamily: 'inherit', color: ink[700], marginBottom: 6,
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details (optional) — or dictate"
          rows={2}
          style={{
            width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 6,
            padding: '7px 9px', fontSize: 14, fontFamily: 'inherit', color: ink[700], resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={add}
            disabled={!title.trim() || saving}
            style={{
              flex: 1, background: ACCENT, color: '#FFFFFF', border: 'none', borderRadius: 6,
              padding: '7px 10px', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
              cursor: title.trim() && !saving ? 'pointer' : 'default',
              opacity: title.trim() && !saving ? 1 : 0.5,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <Plus size={14} strokeWidth={2.6} /> {saving ? 'Saving…' : 'Add note'}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            title={recording ? 'Stop & transcribe' : 'Dictate the note'}
            style={{
              background: recording ? '#E53935' : '#FFFFFF', color: recording ? '#FFFFFF' : ink[700],
              border: `1px solid ${recording ? '#E53935' : semantic.border}`, borderRadius: 6,
              padding: '7px 11px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            {recording ? <Square size={14} strokeWidth={2.4} /> : <Mic size={14} strokeWidth={2.4} />}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {status === 'loading' && <div style={{ color: ink[300], fontSize: 14, padding: '12px 4px', textAlign: 'center' }}>Loading notes…</div>}
        {status === 'error' && <div style={{ color: ink[500], fontSize: 14, padding: '12px 4px', textAlign: 'center' }}>Notes unavailable.</div>}
        {status === 'ready' && notes.length === 0 && (
          <div style={{ color: ink[300], fontSize: 14, padding: '16px 4px', textAlign: 'center', fontStyle: 'italic' }}>
            No notes yet. Capture one above.
          </div>
        )}
        {notes.map((n) => (
          <div key={n.id} style={{ background: '#FFFFFF', border: `1px solid ${semantic.border}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: 6, padding: '7px 10px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => remove(n.id)}
              title="Delete note"
              style={{ position: 'absolute', top: 5, right: 5, background: 'transparent', border: 'none', color: ink[300], cursor: 'pointer', padding: 2 }}
            >
              <X size={13} strokeWidth={2.4} />
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink[700], paddingRight: 18, lineHeight: 1.3 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 14, color: ink[500], marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{n.body}</div>}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
