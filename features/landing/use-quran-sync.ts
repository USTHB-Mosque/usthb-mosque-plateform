import { useEffect, useRef, useState } from 'react'
import {
  WORDS,
  VERSE_37_TIMELINE_START,
  RECITATION_TIMELINE_END,
  QURAN_AUDIO_URLS,
} from './quran-data'

export function useQuranSync() {
  const [isRecitationPlaying, setIsRecitationPlaying] = useState(false)
  const [recitationReady, setRecitationReady] = useState(false)
  const [wordIdx, setWordIdx] = useState(-1)

  const rafRef = useRef(0)
  const audio36 = useRef<HTMLAudioElement | null>(null)
  const audio37 = useRef<HTMLAudioElement | null>(null)
  const activeVerse = useRef<36 | 37>(36)
  const recitationStarted = useRef(false)

  function prepareAudio() {
    if (audio36.current) return

    const a36 = new Audio(QURAN_AUDIO_URLS.verse36)
    const a37 = new Audio(QURAN_AUDIO_URLS.verse37)
    a36.crossOrigin = 'anonymous'
    a37.crossOrigin = 'anonymous'
    a36.preload = 'auto'
    a37.preload = 'auto'
    audio36.current = a36
    audio37.current = a37
    activeVerse.current = 36

    a36.muted = true
    a36
      .play()
      .then(() => {
        if (!recitationStarted.current) {
          a36.pause()
          a36.currentTime = 0
        }
      })
      .catch(() => {})
  }

  function syncWordsToAudio() {
    cancelAnimationFrame(rafRef.current)

    const tick = () => {
      const a36 = audio36.current
      const a37 = audio37.current
      if (!a36 || !a37) return

      const audio = activeVerse.current === 36 ? a36 : a37
      const timelineStart = activeVerse.current === 36 ? 0 : VERSE_37_TIMELINE_START
      const timelineLength =
        activeVerse.current === 36
          ? VERSE_37_TIMELINE_START
          : RECITATION_TIMELINE_END - VERSE_37_TIMELINE_START
      const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0
      const elapsed = hasDuration
        ? timelineStart + (audio.currentTime / audio.duration) * timelineLength
        : timelineStart + audio.currentTime

      let found = -1
      for (let i = 0; i < WORDS.length; i++) {
        if (elapsed >= WORDS[i].s && elapsed < WORDS[i].e) {
          found = i
          break
        }
      }
      setWordIdx(found)
      if (!audio.paused && !a37.ended) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  function beginRecitation() {
    const a36 = audio36.current
    const a37 = audio37.current
    if (!a36 || !a37 || recitationStarted.current) return

    recitationStarted.current = true
    setRecitationReady(true)
    activeVerse.current = 36
    a36.currentTime = 0
    a36.muted = false
    a37.muted = false

    a36.onended = () => {
      activeVerse.current = 37
      a37
        .play()
        .then(() => {
          setIsRecitationPlaying(true)
          syncWordsToAudio()
        })
        .catch(() => setIsRecitationPlaying(false))
    }
    a37.onended = () => {
      setWordIdx(WORDS.length)
      setIsRecitationPlaying(false)
    }

    a36
      .play()
      .then(() => {
        setIsRecitationPlaying(true)
        syncWordsToAudio()
      })
      .catch(() => {
        recitationStarted.current = false
        setIsRecitationPlaying(false)
      })
  }

  function toggleRecitation() {
    const audio = activeVerse.current === 36 ? audio36.current : audio37.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      setIsRecitationPlaying(false)
      return
    }

    audio
      .play()
      .then(() => {
        setIsRecitationPlaying(true)
        syncWordsToAudio()
      })
      .catch(() => setIsRecitationPlaying(false))
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      audio36.current?.pause()
      audio37.current?.pause()
    }
  }, [])

  return {
    isRecitationPlaying,
    recitationReady,
    wordIdx,
    prepareAudio,
    beginRecitation,
    toggleRecitation,
  }
}
