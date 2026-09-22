import React from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/button'

interface ReturnToIndexProps {
  href?: string
  title: string
  value: string
}

const ReturnToIndex: React.FC<ReturnToIndexProps> = ({ title, value, href }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {href ? (
        <Link href={href}>
          <span className="text-lg hover:underline sm:text-2xl">{title}</span>
        </Link>
      ) : (
        <span className="text-lg sm:text-2xl">{title}</span>
      )}

      <ChevronLeft className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-lg font-bold text-primary sm:text-2xl">
        {value}
      </span>
    </div>
  )
}

export default ReturnToIndex
