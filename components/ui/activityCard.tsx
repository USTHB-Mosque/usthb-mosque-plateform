'use client'

import * as React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'

interface ActivityCardAction {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

interface ActivityCardProps {
  title: string
  imageSrc: string
  imageAlt?: string
  description?: string
  hadith?: React.ReactNode
  badge?: string
  actions?: ActivityCardAction[]
  className?: string
  showArrow?: boolean
}

const gradientOverlay = 'linear-gradient(to top, #243245 0%, #243245c0 50%, #24324553 100%)'

const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  imageSrc,
  imageAlt = '',
  description,
  hadith,
  badge,
  actions,
  className = '',
  showArrow = false,
}) => {
  const [cardHovered, setCardHovered] = React.useState(false)
  const [buttonHovered, setButtonHovered] = React.useState(false)

  return (
    <div
      className={`relative overflow-hidden rounded-xl min-h-[220px] ${className}`}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Arrow button */}
      {showArrow && (
        <button
          className="absolute top-5 right-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#243245] border-none cursor-pointer overflow-hidden"
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          <motion.span
            className="absolute flex items-center justify-center"
            animate={buttonHovered ? { x: 14, y: -14, opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ArrowUpRight color="var(--primary-1000)" size={18} />
          </motion.span>
          <motion.span
            className="absolute flex items-center justify-center"
            animate={buttonHovered ? { x: 0, y: 0, opacity: 1 } : { x: -14, y: 14, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ArrowUpRight color="var(--primary-1000)" size={18} />
          </motion.span>
        </button>
      )}

      {/* Image — zooms on card hover */}
      <motion.img
        src={imageSrc}
        alt={imageAlt}
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ scale: cardHovered ? 1.08 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Gradient overlay + content */}
      <div
        className="absolute inset-0 z-[3] flex flex-col justify-end gap-5 p-5 rounded-xl"
        style={{ background: gradientOverlay }}
      >
        {badge && (
          <div className="self-start rounded-lg bg-[var(--primary-600)] px-2 pt-[7px] pb-1 text-sm text-white">
            {badge}
          </div>
        )}

        <div className="text-white/85">
          <h2 className="text-xl font-bold text-white font-[var(--font-khalid)] md:text-2xl">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm">{description}</p>}
          {hadith && <p className="mt-1 text-sm">{hadith}</p>}
        </div>

        {actions && actions.length > 0 && (
  <div className="flex w-full gap-3">
    {actions.map((action, i) =>
      action.variant === 'primary' ? (
        <motion.button
          key={i}
          onClick={action.onClick}
          className="flex-1 rounded-lg border border-[#1fc7abb2] bg-[#1fc7ab7e] py-2 text-base text-white cursor-pointer shadow-[inset_0_4px_8px_#ffffff2b] md:text-lg"
          whileHover={{ backgroundColor: '#1fc7abbb' }}
          whileTap={{ backgroundColor: '#1fc7ab55' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {action.label}
        </motion.button>
      ) : (
        <motion.button
          key={i}
          onClick={action.onClick}
          className="flex-1 rounded-lg border border-white/50 bg-white/15 py-2 text-base text-white cursor-pointer shadow-[inset_0_4px_8px_#00000039] md:text-lg"
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
          whileTap={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {action.label}
        </motion.button>
      )
    )}
  </div>
)}
      </div>
    </div>
  )
}

export default ActivityCard