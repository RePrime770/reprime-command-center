import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, X, Mic, Square, Pin, Pencil, Search, Check } from 'lucide-react';
import { ink, semantic } from '../lib/colors.js';
import { useDictation } from '../lib/voiceClient.js';
import PanelShell from './PanelShell.jsx';

/**
 * NOTES — live quick-notes, persisted to Supabase via /api/notes
 * (GET/POST/PUT/DELETE). Self-contained (does its own fetch, like NoraChat) so
 * it drops into the left flank without touching shared state. Dictation
 * (Whisper) fills the note body. Supports pin (PUT is_pinned), inline edit
 * (PUT title/body), and client-side search over the loaded list.
 */
const ACCENT = '#0891B2';

export default function NotesPanel({ width }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

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
    if (editingId === id) setEditingId(null);
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

  // Pin / unpin — optimistic, then PUT is_pinned. Reloads to re-sort pinned-first.
  const togglePin = async (n) => {
    const next = !n.is_pinned;
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_pinned: next } : x)));
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id, is_pinned: next }),
      });
      if (res.ok) await load(); else load();
    } catch {
      load();
    }
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setEditTitle(n.title || '');
    setEditBody(n.body || '');
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    const t = editTitle.trim();
    if (!t) return;
    setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, title: t, body: editBody } : x))); // optimistic
    setEditingId(null);
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: t, body: editBody }),
      });
      if (!res.ok) load();
    } catch {
      load();
    }
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? notes.filter((n) => `${n.title || ''} ${n.body || ''}`.toLowerCase().includes(q))
    : notes;

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
            width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 8,
            padding: '11px 13px', fontSize: 16, fontFamily: 'inherit', color: ink[700], marginBottom: 8,
            transition: 'all 0.12s ease',
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details (optional) — or dictate"
          rows={2}
          style={{
            width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 8,
            padding: '11px 13px', fontSize: 16, fontFamily: 'inherit', color: ink[700], resize: 'vertical',
            transition: 'all 0.12s ease',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={add}
            disabled={!title.trim() || saving}
            style={{
              flex: 1, background: ACCENT, color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '11px 16px', fontSize: 19, fontWeight: 800, fontFamily: 'inherit',
              cursor: title.trim() && !saving ? 'pointer' : 'default',
              opacity: title.trim() && !saving ? 1 : 0.5,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.12s ease',
              boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
            }}
          >
            <Plus size={17} strokeWidth={2.6} /> {saving ? 'Saving…' : 'Add note'}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            title={recording ? 'Stop & transcribe' : 'Dictate the note'}
            style={{
              background: recording ? '#E53935' : '#FFFFFF', color: recording ? '#FFFFFF' : ink[700],
              border: `1px solid ${recording ? '#E53935' : semantic.border}`, borderRadius: 10,
              padding: '11px 15px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center',
              transition: 'all 0.12s ease',
              boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
            }}
          >
            {recording ? <Square size={17} strokeWidth={2.4} /> : <Mic size={17} strokeWidth={2.4} />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${semantic.divider}`, background: '#FFFFFF', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={17} strokeWidth={2.4} color={ink[300]} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontFamily: 'inherit', color: ink[700], background: 'transparent', padding: '4px 0' }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} title="Clear search" style={{ background: 'transparent', border: 'none', color: ink[300], cursor: 'pointer', padding: '8px 10px', borderRadius: 8, transition: 'all 0.12s ease', display: 'inline-flex', alignItems: 'center' }}>
            <X size={16} strokeWidth={2.4} />
          </button>
        )}
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
        {status === 'ready' && notes.length > 0 && visible.length === 0 && (
          <div style={{ color: ink[300], fontSize: 14, padding: '16px 4px', textAlign: 'center', fontStyle: 'italic' }}>
            No notes match “{query}”.
          </div>
        )}
        {visible.map((n) => (
          <div key={n.id} style={{ background: '#FFFFFF', border: `1px solid ${n.is_pinned ? ACCENT : semantic.border}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: 6, padding: '7px 10px', position: 'relative' }}>
            {editingId === n.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', color: ink[700], transition: 'all 0.12s ease' }}
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  style={{ width: '100%', border: `1px solid ${semantic.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', color: ink[700], resize: 'vertical', transition: 'all 0.12s ease' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => saveEdit(n.id)} disabled={!editTitle.trim()} style={{ background: ACCENT, color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 16, fontWeight: 800, cursor: editTitle.trim() ? 'pointer' : 'default', opacity: editTitle.trim() ? 1 : 0.5, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.12s ease', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
                    <Check size={16} strokeWidth={2.6} /> Save
                  </button>
                  <button type="button" onClick={cancelEdit} style={{ background: 'transparent', color: ink[500], border: `1px solid ${semantic.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s ease' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                  <button type="button" onClick={() => togglePin(n)} title={n.is_pinned ? 'Unpin' : 'Pin to top'} style={{ background: 'transparent', border: 'none', color: n.is_pinned ? ACCENT : ink[300], cursor: 'pointer', padding: '8px 10px', borderRadius: 7, transition: 'all 0.12s ease', display: 'inline-flex', alignItems: 'center' }}>
                    <Pin size={16} strokeWidth={2.4} fill={n.is_pinned ? ACCENT : 'none'} />
                  </button>
                  <button type="button" onClick={() => startEdit(n)} title="Edit note" style={{ background: 'transparent', border: 'none', color: ink[300], cursor: 'pointer', padding: '8px 10px', borderRadius: 7, transition: 'all 0.12s ease', display: 'inline-flex', alignItems: 'center' }}>
                    <Pencil size={16} strokeWidth={2.4} />
                  </button>
                  <button type="button" onClick={() => remove(n.id)} title="Delete note" style={{ background: 'transparent', border: 'none', color: ink[300], cursor: 'pointer', padding: '8px 10px', borderRadius: 7, transition: 'all 0.12s ease', display: 'inline-flex', alignItems: 'center' }}>
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: ink[700], paddingRight: 110, lineHeight: 1.3 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 15, color: ink[500], marginTop: 3, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{n.body}</div>}
              </>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
