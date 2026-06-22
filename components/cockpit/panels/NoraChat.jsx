import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { ink, semantic } from '../lib/colors.js';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { buildNoraContext } from '../lib/noraContext.js';

/**
 * NORA CHAT — the live, two-way conversation that lives in Nora's Desk
 * (YOU → NORA area). Text in is the v1 path; voice OUT (TTS) plays her reply;
 * voice IN (mic → Whisper) fills the input.
 *
 * Data flow:
 *   submit -> POST /api/nora/chat { message, history, context } -> { reply, language }
 *   reply  -> POST /api/voice/speak { text, language } -> audio/mpeg -> play
 *
 * Same-origin fetches carry the Supabase session cookie (cockpit is auth-gated).
 * Conversation is in-memory only (resets on reload) — see handoff note.
 */
const NORA = '#7C3AED';
const NORA_FADED = '#F3E8FF';
const HEBREW_RE = /[א-ת]/;

export default function NoraChat({ focusSignal }) {
  const live = useLiveData();
  const [turns, setTurns] = useState([]); // { role:'user'|'assistant', content, language }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en'); // 'en' | 'he' — mic transcription language

  const inputRef = useRef(null);
  const transcriptRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // PTT button (or any external trigger) bumps focusSignal -> focus the input.
  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  // Hydrate the transcript from persisted history on mount so the conversation
  // survives a reload. Best-effort: if the fetch fails (or the table isn't
  // migrated yet → { messages: [] }), we just start empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/nora/history', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        if (cancelled || messages.length === 0) return;
        setTurns(
          messages
            .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .map((m) => ({
              role: m.role,
              content: m.content,
              language: m.language === 'he' ? 'he' : 'en',
            }))
        );
      } catch {
        /* start empty on any error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the transcript scrolled to the newest turn.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, sending]);

  // Stop any in-flight audio / recorder on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
    };
  }, []);

  const speak = useCallback(async (text, language) => {
    if (muted || !text) return;
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: language === 'he' ? 'he' : 'en' }),
      });
      if (!res.ok) return; // TTS is best-effort; never block the chat
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener('ended', () => URL.revokeObjectURL(url));
      await audio.play().catch(() => {});
    } catch {
      /* best-effort */
    }
  }, [muted]);

  const send = useCallback(async (raw) => {
    const message = (raw ?? '').trim();
    if (!message || sending) return;
    setError(null);

    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    const userTurn = { role: 'user', content: message, language: HEBREW_RE.test(message) ? 'he' : 'en' };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      const context = buildNoraContext(live);
      const res = await fetch('/api/nora/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, context }),
      });
      if (!res.ok) {
        setError('Nora is unavailable right now. Try again.');
        setSending(false);
        return;
      }
      const data = await res.json();
      const reply = typeof data?.reply === 'string' ? data.reply : '';
      const language = data?.language === 'he' ? 'he' : 'en';
      if (reply) {
        setTurns((prev) => [...prev, { role: 'assistant', content: reply, language }]);
        speak(reply, language);
      } else {
        setError('Nora returned an empty reply.');
      }
    } catch {
      setError('Could not reach Nora. Check your connection.');
    } finally {
      setSending(false);
    }
  }, [turns, sending, live, speak]);

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  // Voice IN — record a short clip, send to Whisper (EN), fill the input.
  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.addEventListener('dataavailable', (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      });
      mr.addEventListener('stop', async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        try {
          const form = new FormData();
          form.append('audio', blob, 'nora-input.webm');
          const endpoint = voiceLang === 'he' ? '/api/voice/transcribe-he' : '/api/voice/transcribe-en';
          const res = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            body: form,
          });
          if (res.ok) {
            const data = await res.json();
            const text = typeof data?.text === 'string' ? data.text.trim() : '';
            if (text) {
              setInput((prev) => (prev ? `${prev} ${text}` : text));
              inputRef.current?.focus();
            }
          } else {
            setError('Could not transcribe audio.');
          }
        } catch {
          setError('Transcription failed.');
        }
      });
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setError('Microphone permission denied.');
    }
  }, [voiceLang]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  }, []);

  const toggleRecording = () => (recording ? stopRecording() : startRecording());

  return (
    <div style={{ padding: '6px 8px 8px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Transcript */}
      <div
        ref={transcriptRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          maxHeight: 150,
          overflowY: 'auto',
          marginBottom: 6,
        }}
      >
        {turns.length === 0 && !sending && (
          <div style={{ fontSize: 14, color: ink[300], fontStyle: 'italic', padding: '4px 2px' }}>
            Ask Nora anything — she can read your live threads, deals, and calendar.
          </div>
        )}
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role} content={t.content} language={t.language} />
        ))}
        {sending && (
          <div style={{ fontSize: 13, color: '#9333EA', fontWeight: 700, padding: '2px 2px' }}>
            Nora is thinking…
          </div>
        )}
        {error && (
          <div style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600, padding: '2px 2px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `2px solid ${NORA}`, borderRadius: 8, padding: '4px 6px 4px 10px', background: '#FFFFFF' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Nora, or tell her to call, Zoom, or remind you…"
          disabled={sending}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: ink[700], fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Voice replies off — tap to enable' : 'Voice replies on — tap to mute'}
          aria-label={muted ? 'Unmute Nora voice replies' : 'Mute Nora voice replies'}
          style={iconBtn(muted ? '#F1F5F9' : NORA_FADED, muted ? ink[300] : NORA)}
        >
          {muted ? <VolumeX size={15} strokeWidth={2.4} /> : <Volume2 size={15} strokeWidth={2.4} />}
        </button>
        <button
          type="button"
          onClick={() => setVoiceLang((l) => (l === 'en' ? 'he' : 'en'))}
          disabled={recording}
          title={voiceLang === 'he' ? 'Mic language: Hebrew — tap for English' : 'Mic language: English — tap for Hebrew'}
          aria-label={voiceLang === 'he' ? 'Switch mic language to English' : 'Switch mic language to Hebrew'}
          style={{
            ...iconBtn(NORA_FADED, NORA),
            padding: '5px 7px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.04em',
            opacity: recording ? 0.5 : 1,
          }}
        >
          {voiceLang === 'he' ? 'HE' : 'EN'}
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          title={recording ? 'Stop & transcribe' : 'Speak to Nora'}
          aria-label={recording ? 'Stop recording' : 'Speak to Nora'}
          style={iconBtn(recording ? '#E53935' : NORA_FADED, recording ? '#FFFFFF' : NORA)}
        >
          {recording ? <Square size={15} strokeWidth={2.4} /> : <Mic size={15} strokeWidth={2.4} />}
        </button>
        <button
          type="submit"
          disabled={sending || !input.trim()}
          title="Send to Nora"
          aria-label="Send to Nora"
          style={{ ...iconBtn(NORA, '#FFFFFF'), opacity: sending || !input.trim() ? 0.5 : 1, padding: '6px 10px' }}
        >
          <Send size={14} strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content, language }) {
  const isYou = role === 'user';
  const isHe = language === 'he';
  return (
    <div style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start' }}>
      <div
        className={isHe ? 'hebrew' : ''}
        style={{
          maxWidth: '88%',
          background: isYou ? '#F1F5F9' : NORA_FADED,
          border: `1px solid ${isYou ? semantic.border : `${NORA}33`}`,
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 15,
          lineHeight: 1.4,
          color: ink[700],
          whiteSpace: 'pre-wrap',
          textAlign: isHe ? 'right' : 'left',
          direction: isHe ? 'rtl' : 'ltr',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: isYou ? ink[300] : '#9333EA', display: 'block', marginBottom: 1 }}>
          {isYou ? 'YOU' : 'NORA'}
        </span>
        {content}
      </div>
    </div>
  );
}

function iconBtn(bg, fg) {
  return {
    background: bg,
    color: fg,
    border: bg === '#7C3AED' || bg === '#E53935' ? 'none' : `1px solid ${NORA}55`,
    borderRadius: 6,
    padding: '5px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
  };
}
