'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface LandingCtaButtonProps {
  label: string
  onClick?: () => void
  ariaLabel?: string
  className?: string
}

const LandingCtaButton: React.FC<LandingCtaButtonProps> = ({ label, onClick, ariaLabel, className }) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      size="lg"
      aria-label={ariaLabel ?? label}
      className={cn(
        'group/cta relative flex w-full flex-none items-center justify-center gap-2.5 self-stretch overflow-hidden rounded-lg border border-primary bg-primary py-2 shadow-[inset_0px_4px_8px_1px_#ffffff99] transition-all duration-300 hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none',
        className,
      )}
    >
      <span className="relative mt-[-1.00px] w-fit font-alyamama text-lg font-normal leading-[normal] tracking-[0] text-primary-foreground transition-colors duration-300">
        {label}
      </span>
    </Button>
  )
}

export default LandingCtaButton