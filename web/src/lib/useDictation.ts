import { track } from './analytics'
import { useCallback, useEffect, useRef, useState } from 'react'

// The DOM lib doesn't ship SpeechRecognition types; these are the minimal
// shapes this hook actually reads, kept local rather than pulling in a
// dependency for a handful of fields.
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionErrorEventLike {
  error: string
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type UseDictationResult = {
  /** False when the browser has no Speech Recognition — disable the Dictate button and explain why. */
  supported: boolean
  listening: boolean
  /** The live, unstable partial transcript — render lighter/italic, never committed to the note. */
  interim: string
  error: string | null
  start: () => void
  stop: () => void
}

/**
 * Web Speech API dictation: continuous, interim results, en-US (see Display
 * research brief §7 — interim words stay visually provisional, committed text
 * never re-flickers). Chrome supplies no punctuation, so each final chunk is
 * capitalised and given a full stop before being handed to `onFinal`.
 */
export function useDictation(onFinal: (chunk: string) => void): UseDictationResult {
  const ctorRef = useRef<SpeechRecognitionCtor | null>(null)
  if (ctorRef.current === null) ctorRef.current = getCtor()
  const supported = ctorRef.current !== null

  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const listeningRef = useRef(false)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(
    () => () => {
      listeningRef.current = false
      recognitionRef.current?.stop()
    },
    [],
  )

  const start = useCallback(() => {
    track('dictation_start')
    const Ctor = ctorRef.current
    if (!Ctor) return
    setError(null)
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) finalChunk += transcript
        else interimChunk += transcript
      }
      if (finalChunk.trim()) {
        const clean = finalChunk.trim()
        const capitalised = clean.charAt(0).toUpperCase() + clean.slice(1)
        const punctuated = /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
        onFinalRef.current(`${punctuated} `)
      }
      setInterim(interimChunk)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was denied.')
        listeningRef.current = false
        setListening(false)
        return
      }
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError('Dictation stopped unexpectedly.')
    }
    recognition.onend = () => {
      setInterim('')
      // Chrome ends the session on any silence; restart it while the doctor
      // is still listening rather than making them press Dictate again.
      if (listeningRef.current) {
        try {
          recognition.start()
        } catch {
          /* already starting */
        }
      }
    }

    recognitionRef.current = recognition
    listeningRef.current = true
    setListening(true)
    try {
      recognition.start()
    } catch {
      /* a start() already in flight */
    }
  }, [])

  const stop = useCallback(() => {
    listeningRef.current = false
    setListening(false)
    setInterim('')
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, interim, error, start, stop }
}
