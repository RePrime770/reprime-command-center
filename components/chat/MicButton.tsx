'use client'

import { useEffect, useRef, useState } from 'react'

type Language = 'en' | 'he'
type State = 'idle' | 'recording' | 'loading'

type Props = {
  language: Language
  onTranscript: (text: string, rtl: boolean) => void
}

const FLAG: Record<Language, string> = { en: '🇺🇸', he: '🇮🇱' }

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
      fd.append('audio', blob, `voice.webm`)
      const res = await fetch(`/api/voice/transcribe-${language}`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Transcribe failed (${res.status}) ${detail}`)
      }
      const data = (await res.json()) as { text: string; rtl: boolean }
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

  const onClick = () => {
    if (state === 'idle') void start()
    else if (state === 'recording') stop()
  }

  const recording = state === 'recording'
  const loading = state === 'loading'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={
        error
          ? error
          : recording
            ? 'Stop recording'
            : `Record (${language.toUpperCase()})`
      }
      aria-label={`Record voice in ${language === 'he' ? 'Hebrew' : 'English'}`}
      className={[
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm border transition-colors',
        recording
          ? 'bg-red-600 text-white border-red-600 animate-pulse'
          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50',
        loading ? 'opacity-60 cursor-wait' : '',
      ].join(' ')}
    >
      <span aria-hidden>{FLAG[language]}</span>
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <span aria-hidden>🎤</span>
      )}
    </button>
  )
}
