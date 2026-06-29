import React, { useState } from 'react';
import { Volume2, Pause, Mic, Square, Globe, AlertCircle, Check, Loader2 } from 'lucide-react';
import { brand, ink } from './colors.js';
import { useSpeech, useDictation } from './voiceClient.js';
import { useLocale } from './i18n.jsx';

/**
 * Listen button — Speechify trigger, now a REAL TTS round-trip.
 * Pass `text` (or a `getText` getter) and it speaks it via ElevenLabs
 * (POST /api/voice/speak). `language` is auto-detected from the text when
 * omitted. `onPlay` is still called for back-compat (analytics/side effects).
 * Always shows BOTH "Listen" (EN) and "האזן" (HE) labels per dispatch.
 */
export function ListenButton({ text, getText, language, onPlay, compact = false }) {
  // Locale fallback: if caller didn't pin a language, route by cockpit locale.
  const { locale } = useLocale();
  const lang = language || locale || undefined;
  const { playing, toggle: speakToggle, status } = useSpeech(getText || text || '', { language: lang });
  const disabled = status === 'disabled';
  const errored = status === 'error';
  const busy = status === 'busy' && !playing;
  const Icon = disabled ? AlertCircle : errored ? AlertCircle : busy ? Loader2 : playing ? Pause : Volume2;
  const toggle = (e) => {
    e?.stopPropagation();
    if (disabled) return;
    if (!playing) onPlay?.();
    speakToggle();
  };
  const title = disabled
    ? 'TTS not configured — set ELEVENLABS_API_KEY'
    : errored
    ? 'Speech failed — try again'
    : 'Listen / האזן';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={title}
        aria-label="Listen"
        style={{
          background: errored ? '#FEE2E2' : disabled ? '#F1F5F9' : playing ? brand.gold : '#FFFFFF',
          color: errored ? '#B91C1C' : disabled ? ink[400] : playing ? brand.navy : ink[700],
          border: `1px solid ${errored ? '#FCA5A5' : disabled ? 'rgba(15,23,42,0.10)' : playing ? brand.gold : 'rgba(15,23,42,0.18)'}`,
          opacity: disabled ? 0.65 : 1,
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'inherit',
          letterSpacing: '0.04em'
        }}
      >
        <Icon size={12} strokeWidth={2.4} />
        EN<span style={{ opacity: 0.55, margin: '0 2px' }}>·</span>HE
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={title}
      style={{
        background: errored ? '#FEE2E2' : disabled ? '#F1F5F9' : playing ? brand.gold : '#FFFFFF',
        color: errored ? '#B91C1C' : disabled ? ink[400] : playing ? brand.navy : ink[700],
        border: `1px solid ${errored ? '#FCA5A5' : disabled ? 'rgba(15,23,42,0.10)' : playing ? brand.gold : 'rgba(15,23,42,0.18)'}`,
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 18,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
        letterSpacing: '0.04em'
      }}
    >
      <Icon size={14} strokeWidth={2.2} className={busy ? 'spin' : undefined} />
      {disabled ? 'TTS off' : errored ? 'Retry' : busy ? '…' : playing ? 'Playing' : 'Listen'}
      <span style={{ opacity: 0.55 }}>·</span>
      <span className="hebrew">האזן</span>
    </button>
  );
}

/**
 * Recording control — bilingual EN+HE per dispatch fix #5.
 * Used on PTT, meeting cards, voice memo cards.
 *
 * Two modes:
 *  - CONTROLLED (parent passes `recording` + `onRecord`): button is pure UI,
 *    parent owns the MediaRecorder lifecycle.
 *  - UNCONTROLLED (only `onTranscript` passed): the button itself records +
 *    transcribes via useDictation, routed by cockpit locale, and hands the
 *    transcript back through `onTranscript`. Surfaces idle/recording/
 *    transcribing/done/error visually.
 */
export function RecordButton({ onRecord, recording: controlled, label, onTranscript }) {
  const { locale } = useLocale();
  const [internal, setInternal] = useState(false);
  const dictate = useDictation({ language: locale === 'he' ? 'he' : 'en', onText: onTranscript });
  const isControlled = controlled !== undefined;
  const recording = isControlled ? controlled : (onTranscript ? dictate.recording : internal);
  const status = !isControlled && onTranscript ? dictate.status : 'idle';
  const transcribing = status === 'transcribing';
  const done = status === 'done';
  const errored = status === 'error';
  const toggle = (e) => {
    e?.stopPropagation();
    if (isControlled) {
      onRecord?.(!recording);
      return;
    }
    if (onTranscript) {
      if (recording) dictate.stop();
      else dictate.start(locale === 'he' ? 'he' : 'en');
      return;
    }
    setInternal((r) => !r);
    onRecord?.(!recording);
  };
  const Icon = errored ? AlertCircle : done ? Check : transcribing ? Loader2 : recording ? Square : Mic;
  const bg = errored ? '#FEE2E2' : done ? '#DCFCE7' : transcribing ? '#FEF3C7' : recording ? '#E53935' : '#FFFFFF';
  const fg = errored ? '#B91C1C' : done ? '#166534' : transcribing ? '#92400E' : recording ? '#FFFFFF' : ink[700];
  const bd = errored ? '#FCA5A5' : done ? '#86EFAC' : transcribing ? '#FDE68A' : recording ? '#E53935' : 'rgba(15,23,42,0.18)';
  return (
    <button
      type="button"
      onClick={toggle}
      title={errored ? (dictate.error || 'Recording failed') : 'Record / הקלט'}
      aria-label="Record"
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
        letterSpacing: '0.04em'
      }}
    >
      <Icon size={14} strokeWidth={2.4} className={transcribing ? 'spin' : undefined} />
      {label || (errored ? 'Retry' : done ? 'OK' : transcribing ? '…' : recording ? 'Stop' : 'Record')}
      <span style={{ opacity: 0.55 }}>·</span>
      <span className="hebrew">{recording ? 'עצור' : 'הקלט'}</span>
    </button>
  );
}

/**
 * DictateButtons — Gideon 2026-06-16. TWO explicit dictation buttons: עברית + English.
 * Tap the language you're about to speak; Whisper transcribes in that language for accuracy.
 * Active button turns red (recording) and shows a stop square. Replaces the old single
 * bilingual Record button everywhere a reply is composed (all comms columns + email + calendar memo).
 *
 * REAL round-trip: records via MediaRecorder, posts to /api/voice/transcribe-(he|en),
 * and hands the transcript to `onText`. Tapping the same language again stops & transcribes;
 * tapping the other language switches before recording.
 */
export function DictateButtons({ compact = false, onText }) {
  // 'active' tracks WHICH button the user pressed. The hook's own `language`
  // initializer is overridden per-click via start('he'|'en'), so the cockpit
  // locale only affects which button is highlighted as the default suggestion.
  const { locale } = useLocale();
  const [active, setActive] = useState(null); // 'he' | 'en' | null
  const { recording, start, stop, status, error } = useDictation({ language: locale === 'he' ? 'he' : 'en', onText });
  const langs = [
    { key: 'he', label: 'עברית',  he: true,  full: 'Hebrew' },
    { key: 'en', label: 'English', he: false, full: 'English' }
  ];
  const click = (k) => (e) => {
    e?.stopPropagation();
    if (active === k && recording) {
      stop();
      // keep `active` so the status (transcribing/done/error) renders on this button.
    } else {
      if (recording) stop();
      setActive(k);
      start(k);
    }
  };
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {langs.map((l) => {
        const isActive = active === l.key;
        const on = isActive && recording;
        const transcribing = isActive && status === 'transcribing';
        const done = isActive && status === 'done';
        const errored = isActive && status === 'error';
        const Icon = errored ? AlertCircle : done ? Check : transcribing ? Loader2 : on ? Square : Mic;
        const bg = errored ? '#FEE2E2' : done ? '#DCFCE7' : transcribing ? '#FEF3C7' : on ? '#E53935' : '#FFFFFF';
        const fg = errored ? '#B91C1C' : done ? '#166534' : transcribing ? '#92400E' : on ? '#FFFFFF' : ink[700];
        const bd = errored ? '#FCA5A5' : done ? '#86EFAC' : transcribing ? '#FDE68A' : on ? '#E53935' : 'rgba(15,23,42,0.18)';
        const tip = errored
          ? error || 'Dictation failed'
          : done
          ? 'Inserted'
          : transcribing
          ? 'Transcribing…'
          : on
          ? `Stop dictating (${l.full})`
          : `Dictate in ${l.full} / הקלט`;
        return (
          <button
            key={l.key}
            type="button"
            onClick={click(l.key)}
            title={tip}
            aria-label={`Dictate in ${l.full}`}
            style={{
              background: bg,
              color: fg,
              border: `1px solid ${bd}`,
              borderRadius: 8,
              padding: compact ? '4px 10px' : '6px 12px',
              fontSize: compact ? 15 : 17,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'inherit',
              letterSpacing: '0.02em'
            }}
          >
            <Icon size={compact ? 12 : 14} strokeWidth={2.4} className={transcribing ? 'spin' : undefined} />
            <span className={l.he ? 'hebrew' : ''}>
              {errored ? 'Retry' : done ? 'OK' : transcribing ? '…' : on ? 'Stop' : l.label}
            </span>
          </button>
        );
      })}
    </span>
  );
}

/**
 * Compact bilingual language pill for thread/event language indicator.
 */
export function LangPill({ lang }) {
  const label = { he: 'HE', en: 'EN', 'he-en': 'HE·EN' }[lang] || lang.toUpperCase();
  return (
    <span
      style={{
        background: 'rgba(15,23,42,0.06)',
        color: ink[500],
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3
      }}
    >
      <Globe size={9} strokeWidth={2.2} />
      {label}
    </span>
  );
}
