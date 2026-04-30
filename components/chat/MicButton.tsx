'use client'

import { useEffect, useRef, useState } from 'react'

type Language = 'en' | 'he'
type State = 'idle' | 'recording' | 'loading'

type Props = {
  language: Language
  onTranscript: (text: string, rtl?: boolean) => void
}

const FLAG: Record<Language, string> = { en: '🇺🇸', he: '🇮🇱' }
const LABEL: Record<Language, string> = { en: 'EN', he: 'HE' }

export default function MicButton({ language, onTranscript }: Props) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const sendBlob = async (blob: Blob) => {
    setState('loading')
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'voice.webm')
      const res = await fetch(`/api/voice/transcribe-${language}`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Transcribe failed (${res.status}) ${detail}`)
      }
      const data = (await res.json()) as { text: string; rtl?: boolean }
      onTranscript(data.text ?? '', !!data.rtl)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcribe failed')
    } finally {
      setState('idle')
    }
  }

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        stopTracks()
        if (blob.size > 0) void sendBlob(blob)
        else setState('idle')
      }
      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch (e) {
      stopTracks()
      setState('idle')
      setError(e instanceof Error ? e.message : 'Mic unavailable')
    }
  }

  const stop = () => {
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    recorderRef.current = null
  }

  // Click once → start recording (button stays ON).
  // Click again → stop recording and transcribe.
  const onClick = () => {
    if (state === 'idle') void start()
    else if (state === 'recording') stop()
  }

  const recording = state === 'recording'
  const loading = state === 'loading'

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '0.3rem 0.55rem',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: loading ? 'wait' : 'pointer',
    border: '1.5px solid',
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
    userSelect: 'none',
    outline: 'none',
    opacity: loading ? 0.7 : 1,
  }

  const idleStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
  }

  const recordingStyle: React.CSSProperties = {
    ...baseStyle,
    background: '#dc2626',
    borderColor: '#ef4444',
    color: '#fff',
    boxShadow: '0 0 0 3px rgba(220,38,38,0.35)',
    animation: 'mic-pulse 1s ease-in-out infinite',
  }

  const style = recording ? recordingStyle : idleStyle

  return (
    <>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(220,38,38,0.35); }
          50%       { box-shadow: 0 0 0 6px rgba(220,38,38,0.15); }
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        title={
          error
            ? error
            : recording
              ? `Stop recording (${LABEL[language]})`
              : `Record in ${language === 'he' ? 'Hebrew' : 'English'} — click once to start, again to stop`
        }
        aria-label={`Record voice in ${language === 'he' ? 'Hebrew' : 'English'}`}
        style={style}
      >
        <span aria-hidden>{FLAG[language]}</span>
        {loading ? (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }}
          />
        ) : (
          <span aria-hidden>{recording ? '⏹' : '🎤'}</span>
        )}
        <span>{LABEL[language]}</span>
      </button>
    </>
  )
}
