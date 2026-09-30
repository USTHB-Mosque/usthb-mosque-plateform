import React from 'react'
import { useReveal } from '@/shared/hooks/use-reveal'

export interface RevealCardProps {
  index: number
  className?: string
  children: React.ReactNode
}

const RevealCard: React.FC<RevealCardProps> = ({ index, className, children }) => {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`reveal-card ${className ?? ''}`}
      style={{ transitionDelay: `${index * 110}ms` }}
    >
      {children}
    </div>
  )
}

export default RevealCard
