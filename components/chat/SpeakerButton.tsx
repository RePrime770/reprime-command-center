'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  text: string
}

const HEBREW_RE = /[֐-׿]/

function detectHebrew(text: string): boolean {
  return HEBREW_RE.test(text)
}

type State = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export default function SpeakerButton({ text }: Props) {
  const [state, setState] = useState<State>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [])

  // If text changes, drop the cached audio.
  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setState('idle')
  }, [text])

  const fetchAudio = async (): Promise<HTMLAudioElement> => {
    const language = detectHebrew(text) ? 'he' : 'en'
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Speak failed (${res.status}) ${detail}`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    urlRef.current = url
    const audio = new Audio(url)
    audio.onended = () => setState('idle')
    audio.onpause = () => {
      if (!audio.ended) setState('paused')
    }
    audio.onplay = () => setState('playing')
    audioRef.current = audio
    return audio
  }

  const onClick = async () => {
    if (!text.trim()) return
    if (state === 'playing') {
      audioRef.current?.pause()
      return
    }
    if (state === 'paused' && audioRef.current) {
      void audioRef.current.play()
      return
    }
    setState('loading')
    try {
      const audio = audioRef.current ?? (await fetchAudio())
      await audio.play()
    } catch (e) {
      console.error(e)
      setState('error')
    }
  }

  const icon =
    state === 'loading'
      ? (
          <span
            aria-hidden
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )
      : state === 'playing'
        ? '⏸️'
        : '🔊'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'loading' || !text.trim()}
      title={
        state === 'error'
          ? 'Playback failed'
          : state === 'playing'
            ? 'Pause'
            : 'Read aloud (Matilda)'
      }
      aria-label="Read aloud"
      className={[
        'inline-flex items-center justify-center rounded-md px-2 py-1 text-sm border transition-colors',
        'bg-white text-gray-800 border-gray-300 hover:bg-gray-50',
        state === 'loading' ? 'opacity-60 cursor-wait' : '',
        state === 'error' ? 'border-red-300 text-red-600' : '',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}
