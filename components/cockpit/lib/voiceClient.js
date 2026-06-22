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
 * Best-effort: a failed TTS or blocked play never throws.
 * @param {string} text
 * @param {'en'|'he'} [language]
 */
export async function speak(text, language) {
  const clean = (text || '').trim();
  if (!clean) return;
  const lang = language || detectLanguage(clean);
  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, language: lang }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = getSharedAudio();
    if (!a) return;
    stopSharedAudio();
    a.src = url;
    a.onended = () => URL.revokeObjectURL(url);
    await a.play().catch(() => {});
  } catch {
    /* best-effort */
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

  const stop = useCallback(() => {
    stopSharedAudio();
    setPlaying(false);
  }, []);

  const toggle = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }
    const text = (typeof textOrGetter === 'function' ? textOrGetter() : textOrGetter) || '';
    if (!text.trim()) return;

    const a = getSharedAudio();
    setPlaying(true);
    if (a) {
      const done = () => {
        setPlaying(false);
        a.removeEventListener('ended', done);
        a.removeEventListener('pause', done);
      };
      a.addEventListener('ended', done);
      a.addEventListener('pause', done);
    }
    await speak(text, opts.language);
    // If playback never started (blocked / failed), don't get stuck "Playing".
    if (a && a.paused) setPlaying(false);
  }, [playing, stop, textOrGetter, opts.language]);

  return { playing, toggle, stop };
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
            } else {
              setError('Could not transcribe.');
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
    },
    [onText, langRef, mediaRecorderRef, chunksRef]
  );

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  }, [mediaRecorderRef]);

  const toggle = useCallback(() => (recording ? stop() : start()), [recording, start, stop]);

  return { recording, start, stop, toggle, error };
}
