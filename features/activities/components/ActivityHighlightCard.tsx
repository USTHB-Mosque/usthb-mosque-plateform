'use client'

import React, { useState } from 'react'
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
  featured?: boolean
}

const ActivityHighlightCard: React.FC<ActivityCardProps> = ({
  title,
  imageSrc,
  imageAlt = '',
  description,
  hadith,
  badge,
  actions,
  className = '',
  showArrow = false,
  featured = false,
}) => {
  const [cardHovered, setCardHovered] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)

  return (
    <div
      className={`card-lift flex flex-col justify-end overflow-hidden relative rounded-[12px] w-full select-none cursor-pointer transition-all duration-300 ${
        featured ? 'min-h-[460px] p-[24px]' : 'min-h-[220px] p-[20px]'
      } ${className}`}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <motion.img
        alt={imageAlt}
        className="absolute inset-0 object-cover pointer-events-none rounded-[12px] size-full"
        src={imageSrc}
        animate={{ scale: cardHovered ? 1.08 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Dark gradient overlay - crystal clear top, rich readable bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#243245] via-[#243245]/70 via-50% to-transparent pointer-events-none rounded-[12px]" />

      {/* Top right circular outward arrow button for non-featured cards */}
      {showArrow && (
        <button
          type="button"
          aria-label={title}
          className="absolute top-[16px] right-[16px] z-10 size-[34px] flex items-center justify-center rounded-full bg-secondary-800 border-none cursor-pointer overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          <motion.span
            className="absolute flex items-center justify-center"
            animate={buttonHovered ? { x: 14, y: -14, opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ArrowUpRight color="var(--primary-200)" size={18} />
          </motion.span>
          <motion.span
            className="absolute flex items-center justify-center"
            animate={buttonHovered ? { x: 0, y: 0, opacity: 1 } : { x: -14, y: 14, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ArrowUpRight color="var(--primary-200)" size={18} />
          </motion.span>
        </button>
      )}

      {/* Content Area */}
      <div className="flex flex-col gap-[8px] items-start w-full relative z-10" dir="rtl">
        {/* Badge on featured card, right above title */}
        {badge && (
          <div className="bg-[#0de9c3] px-[10px] py-[3px] rounded-[6px] flex items-center justify-center mb-[2px]">
            <span
              className="font-yamama font-bold text-[#243245] text-[12px] leading-tight whitespace-nowrap"
              dir="rtl"
            >
              {badge}
            </span>
          </div>
        )}

        {/* Title */}
        <h3
          className={`font-khalid text-white text-right leading-tight w-full ${
            featured ? 'text-[28px] xl:text-[32px]' : 'text-[22px]'
          }`}
          dir="rtl"
        >
          {title}
        </h3>

        {/* Description & Hadith */}
        {description && (
          <p
            className="font-yamama font-normal text-white/85 text-[14px] leading-relaxed text-right w-full"
            dir="rtl"
          >
            {description}
            {hadith && (
              <>
                <br />
                {hadith}
              </>
            )}
          </p>
        )}

        {/* Featured Actions */}
        {featured && actions && actions.length > 0 && (
          <div className="flex flex-row gap-[14px] items-center w-full pt-[6px]" dir="rtl">
            {actions.map((action, i) =>
              action.variant === 'primary' ? (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className="flex-1 h-[42px] rounded-[8px] bg-[#1f6a6b] hover:bg-[#258284] border border-[#0de9c3]/50 flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="font-yamama font-bold text-[16px] text-[#f2f8fc] leading-none whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className="flex-1 h-[42px] rounded-[8px] bg-[#455161] hover:bg-[#526073] border border-white/20 flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="font-yamama font-bold text-[16px] text-[#f2f8fc] leading-none whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityHighlightCard
