import React, { useState } from 'react';
import { Volume2, Pause, Mic, Square, Globe } from 'lucide-react';
import { brand, ink } from './colors.js';
import { useSpeech, useDictation } from './voiceClient.js';

/**
 * Listen button — Speechify trigger, now a REAL TTS round-trip.
 * Pass `text` (or a `getText` getter) and it speaks it via ElevenLabs
 * (POST /api/voice/speak). `language` is auto-detected from the text when
 * omitted. `onPlay` is still called for back-compat (analytics/side effects).
 * Always shows BOTH "Listen" (EN) and "האזן" (HE) labels per dispatch.
 */
export function ListenButton({ text, getText, language, onPlay, compact = false }) {
  const { playing, toggle: speakToggle } = useSpeech(getText || text || '', { language });
  const Icon = playing ? Pause : Volume2;
  const toggle = (e) => {
    e?.stopPropagation();
    if (!playing) onPlay?.();
    speakToggle();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        title="Listen / האזן"
        aria-label="Listen"
        style={{
          background: playing ? brand.gold : '#FFFFFF',
          color: playing ? brand.navy : ink[700],
          border: `1px solid ${playing ? brand.gold : 'rgba(15,23,42,0.18)'}`,
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
      title="Speechify"
      style={{
        background: playing ? brand.gold : '#FFFFFF',
        color: playing ? brand.navy : ink[700],
        border: `1px solid ${playing ? brand.gold : 'rgba(15,23,42,0.18)'}`,
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
      <Icon size={14} strokeWidth={2.2} />
      {playing ? 'Playing' : 'Listen'}
      <span style={{ opacity: 0.55 }}>·</span>
      <span className="hebrew">האזן</span>
    </button>
  );
}

/**
 * Recording control — bilingual EN+HE per dispatch fix #5.
 * Used on PTT, meeting cards, voice memo cards.
 */
export function RecordButton({ onRecord, recording: controlled, label }) {
  const [internal, setInternal] = useState(false);
  const recording = controlled ?? internal;
  const toggle = (e) => {
    e?.stopPropagation();
    if (controlled === undefined) setInternal((r) => !r);
    onRecord?.(!recording);
  };
  const Icon = recording ? Square : Mic;
  return (
    <button
      type="button"
      onClick={toggle}
      title="Record / הקלט"
      aria-label="Record"
      style={{
        background: recording ? '#E53935' : '#FFFFFF',
        color: recording ? '#FFFFFF' : ink[700],
        border: `1px solid ${recording ? '#E53935' : 'rgba(15,23,42,0.18)'}`,
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
      <Icon size={14} strokeWidth={2.4} />
      {label || (recording ? 'Stop' : 'Record')}
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
  const [active, setActive] = useState(null); // 'he' | 'en' | null
  const { recording, start, stop } = useDictation({ language: 'en', onText });
  const langs = [
    { key: 'he', label: 'עברית',  he: true,  full: 'Hebrew' },
    { key: 'en', label: 'English', he: false, full: 'English' }
  ];
  const click = (k) => (e) => {
    e?.stopPropagation();
    if (active === k && recording) {
      stop();
      setActive(null);
    } else {
      if (recording) stop();
      setActive(k);
      start(k);
    }
  };
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {langs.map((l) => {
        const on = active === l.key && recording;
        const Icon = on ? Square : Mic;
        return (
          <button
            key={l.key}
            type="button"
            onClick={click(l.key)}
            title={on ? `Stop dictating (${l.full})` : `Dictate in ${l.full} / הקלט`}
            aria-label={`Dictate in ${l.full}`}
            style={{
              background: on ? '#E53935' : '#FFFFFF',
              color: on ? '#FFFFFF' : ink[700],
              border: `1px solid ${on ? '#E53935' : 'rgba(15,23,42,0.18)'}`,
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
            <Icon size={compact ? 12 : 14} strokeWidth={2.4} />
            <span className={l.he ? 'hebrew' : ''}>{on ? 'Stop' : l.label}</span>
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
