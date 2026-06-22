import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared voice client for the cockpit. Turns the previously-cosmetic
 * ListenButton / DictateButtons / voice-note controls into real round-trips
 * against the live API:
 *   - speak  : POST /api/voice/speak       { text, language } -> audio/mpeg
 *   - dictate: POST /api/voice/transcribe-(en|he) (FormData audio) -> { text }
 *
 * Same-origin fetches carry the Supabase session cookie (cockpit is auth-gated).
 * Everything is best-effort: a failed TTS or STT never throws into the UI.
 */

const HEBREW_RE = /[֐-׿]/;

/** Heuristic language pick from text content when not explicitly provided. */
export function detectLanguage(text) {
  return HEBREW_RE.test(text || '') ? 'he' : 'en';
}

// Module-level handle so a new Listen press always stops the previous clip —
// only one thing should ever be speaking on the kiosk at a time.
let activeAudio = null;

function stopActiveAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch {
      /* ignore */
    }
    activeAudio = null;
  }
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
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      if (audioRef.current === activeAudio) activeAudio = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(false);
  }, [cleanup]);

  const toggle = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }
    const text = (typeof textOrGetter === 'function' ? textOrGetter() : textOrGetter || '').trim();
    if (!text) return;

    stopActiveAudio(); // stop any other button's clip
    const language = opts.language || detectLanguage(text);
    setPlaying(true);
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) {
        setPlaying(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      activeAudio = audio;
      audio.addEventListener('ended', () => stop());
      audio.addEventListener('error', () => stop());
      await audio.play().catch(() => stop());
    } catch {
      stop();
    }
  }, [playing, stop, textOrGetter, opts.language]);

  return { playing, toggle, stop };
}

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
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const langRef = useRef(language);
  langRef.current = language;

  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const start = useCallback(async (langOverride) => {
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
  }, [onText]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  }, []);

  const toggle = useCallback(() => (recording ? stop() : start()), [recording, start, stop]);

  return { recording, start, stop, toggle, error };
}
