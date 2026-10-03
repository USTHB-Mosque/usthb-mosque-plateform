import React from 'react'
import { motion } from 'motion/react'
import { WORDS } from '../quran-data'

export interface HeroVerseProps {
  wordIdx: number
  isRecitationPlaying: boolean
  recitationReady: boolean
  onToggleRecitation: () => void
}

const HeroVerse: React.FC<HeroVerseProps> = ({
  wordIdx,
  isRecitationPlaying,
  recitationReady,
  onToggleRecitation,
}) => {
  return (
    <>
      <motion.p
        dir="rtl"
        initial={{ y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ fontFamily: 'var(--font-uthmanic)' }}
        className="text-center leading-loose w-[95%] sm:w-[80%] md:w-[70%] lg:w-[90%] max-w-[1200px] text-[clamp(22px,2.5vw,40px)]"
      >
        {WORDS.map((w, i) => {
          const isDone = i < wordIdx
          const isActive = i === wordIdx
          let cls = 'qword'
          if (isActive) cls += ' qword--active'
          else if (isDone) cls += ' qword--done'
          const baseColor = w.allah ? 'var(--primary-200)' : undefined
          return (
            <span
              key={i}
              className={cls}
              style={{
                color: isDone || isActive ? 'var(--primary-200)' : baseColor,
                fontSize: 'inherit',
              }}
            >
              {w.t}{' '}
            </span>
          )
        })}
        <span
          style={{
            fontSize: 'clamp(14px, 1.6vw, 24px)',
            color: 'inherit',
          }}
        >
          [النور: ٣٦]
        </span>
      </motion.p>

      <button
        aria-label={isRecitationPlaying ? 'إيقاف التلاوة مؤقتًا' : 'تشغيل التلاوة'}
        className="quran-audio-control mt-3"
        disabled={!recitationReady}
        onClick={onToggleRecitation}
        type="button"
      >
        {isRecitationPlaying ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7.5 5.5v13M16.5 5.5v13" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m9 6 9 6-9 6V6Z" />
          </svg>
        )}
      </button>
    </>
  )
}

export default HeroVerse
