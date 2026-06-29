import { useCallback, useRef, useState } from 'react';

/**
 * Shared voice client for the cockpit. Turns the previously-cosmetic
 * ListenButton / DictateButtons / voice-note controls into real round-trips
 * against the live API:
 *   - speak  : POST /api/voice/speak       { text, language } -> audio/mpeg
 *   - dictate: POST /api/voice/transcribe-(en|he) (FormData audio) -> { text }
 *
 * Same-origin fetches carry the Supabase session cookie (cockpit is auth-gated).
 *
 * AUTOPLAY: browsers block programmatic audio.play() unless audio has been
 * "unlocked" by a user gesture. Nora's spoken reply arrives AFTER an async
 * round-trip, so a naive play() is blocked ("can't hear Nora"). We fix this by
 * keeping ONE shared <audio> element and unlocking it on the first pointer/key
 * gesture anywhere on the page; after that, all playback (direct or async) works.
 */

const HEBREW_RE = /[֐-׿]/;

/** Heuristic language pick from text content when not explicitly provided. */
export function detectLanguage(text) {
  return HEBREW_RE.test(text || '') ? 'he' : 'en';
}

// ── Shared, gesture-unlocked audio ─────────────────────────────────────────
let sharedAudio = null;
let audioUnlocked = false;
// A valid, silent WAV — played muted once to satisfy the autoplay policy.
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

function getSharedAudio() {
  if (typeof Audio === 'undefined') return null;
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

function unlockAudio() {
  if (audioUnlocked) return;
  const a = getSharedAudio();
  if (!a) return;
  audioUnlocked = true;
  try {
    a.muted = true;
    a.src = SILENCE;
    const p = a.play();
    if (p && p.then) {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      }).catch(() => {
        a.muted = false;
      });
    } else {
      a.muted = false;
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  const onGesture = () => unlockAudio();
  window.addEventListener('pointerdown', onGesture);
  window.addEventListener('keydown', onGesture);
  window.addEventListener('touchstart', onGesture);
}

function stopSharedAudio() {
  if (sharedAudio) {
    try {
      sharedAudio.pause();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Speak text via ElevenLabs TTS through the shared (unlocked) audio element.
 * Best-effort but now reports failure (used to drive button error/disabled state).
 * Returns { ok: true } on play, or { ok: false, reason } when TTS fails.
 * Common reasons: 'empty' | 'not-configured' | 'upstream' | 'network' | 'no-audio'.
 * @param {string} text
 * @param {'en'|'he'} [language]
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function speak(text, language) {
  const clean = (text || '').trim();
  if (!clean) return { ok: false, reason: 'empty' };
  const lang = language || detectLanguage(clean);
  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, language: lang }),
    });
    if (!res.ok) {
      // 500 + 'TTS not configured' bubbles up so the button can disable itself.
      let reason = 'upstream';
      try {
        const j = await res.json();
        if (typeof j?.error === 'string' && j.error.toLowerCase().includes('not configured')) {
          reason = 'not-configured';
        }
      } catch { /* ignore parse errors */ }
      return { ok: false, reason };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = getSharedAudio();
    if (!a) return { ok: false, reason: 'no-audio' };
    stopSharedAudio();
    a.src = url;
    a.onended = () => URL.revokeObjectURL(url);
    await a.play().catch(() => {});
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Stop any in-flight cockpit speech. */
export function stopSpeaking() {
  stopSharedAudio();
}

/**
 * useSpeech — drive a Listen button. Pass a string or a getter that returns the
 * text to read. Returns { playing, toggle, stop }.
 *
 * @param {string | (() => string)} textOrGetter
 * @param {{ language?: 'en' | 'he' }} [opts]
 */
export function useSpeech(textOrGetter, opts = {}) {
  const [playing, setPlaying] = useState(false);
  // 'idle' | 'busy' | 'error' | 'disabled'. We expose this so callers can
  // give the user real feedback instead of silently failing.
  const [status, setStatus] = useState('idle');

  const stop = useCallback(() => {
    stopSharedAudio();
    setPlaying(false);
    setStatus('idle');
  }, []);

  const toggle = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }
    const text = (typeof textOrGetter === 'function' ? textOrGetter() : textOrGetter) || '';
    if (!text.trim()) return;

    const a = getSharedAudio();
    setStatus('busy');
    setPlaying(true);
    if (a) {
      const done = () => {
        setPlaying(false);
        setStatus((s) => (s === 'busy' ? 'idle' : s));
        a.removeEventListener('ended', done);
        a.removeEventListener('pause', done);
      };
      a.addEventListener('ended', done);
      a.addEventListener('pause', done);
    }
    const result = await speak(text, opts.language);
    if (!result.ok) {
      setPlaying(false);
      setStatus(result.reason === 'not-configured' ? 'disabled' : 'error');
      return;
    }
    if (a && a.paused) setPlaying(false);
  }, [playing, stop, textOrGetter, opts.language]);

  return { playing, toggle, stop, status };
}

// ── Dictation (Whisper) ────────────────────────────────────────────────────
/**
 * useDictation — drive a mic button. Records a clip, sends it to Whisper in the
 * chosen language, and hands the transcript to onText. Returns
 * { recording, start, stop, toggle, error }.
 *
 * @param {{ language?: 'en' | 'he', onText?: (text: string) => void }} [opts]
 */
export function useDictation(opts = {}) {
  const { language = 'en', onText } = opts;
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  // 'idle' | 'recording' | 'transcribing' | 'done' | 'error'
  const [status, setStatus] = useState('idle');
  const mediaRecorderRef = useRef();
  const chunksRef = useRef([]);
  const langRef = useRef(language);
  langRef.current = language;

  const start = useCallback(
    async (langOverride) => {
      setError(null);
      if (langOverride === 'he' || langOverride === 'en') langRef.current = langOverride;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Microphone not available.');
        setStatus('error');
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
          if (blob.size === 0) { setStatus('idle'); return; }
          setStatus('transcribing');
          try {
            const form = new FormData();
            form.append('audio', blob, 'dictation.webm');
            const endpoint =
              langRef.current === 'he' ? '/api/voice/transcribe-he' : '/api/voice/transcribe-en';
            const res = await fetch(endpoint, {
              method: 'POST',
              credentials: 'same-origin',
              body: form,
            });
            if (res.ok) {
              const data = await res.json();
              const text = typeof data?.text === 'string' ? data.text.trim() : '';
              if (text) onText?.(text);
              setStatus('done');
              setTimeout(() => setStatus((s) => (s === 'done' ? 'idle' : s)), 1200);
            } else {
              setError('Could not transcribe.');
              setStatus('error');
            }
          } catch {
            setError('Transcription failed.');
            setStatus('error');
          }
        });
        mediaRecorderRef.current = mr;
        mr.start();
        setRecording(true);
        setStatus('recording');
      } catch {
        setError('Microphone permission denied.');
        setStatus('error');
      }
    },
    [onText, langRef, mediaRecorderRef, chunksRef]
  );

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  }, [mediaRecorderRef]);

  const toggle = useCallback(() => (recording ? stop() : start()), [recording, start, stop]);

  return { recording, start, stop, toggle, error, status };
}
