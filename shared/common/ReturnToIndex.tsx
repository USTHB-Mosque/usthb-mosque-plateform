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
    <div className="flex gap-3 items-center">
      {href ? (
        <Link href={href}>
          <span className="text-2xl hover:underline">{title}</span>
        </Link>
      ) : (
        <span className="text-2xl">{title}</span>
      )}

      <ChevronLeft className="w-4 h-4" />
      <span className="text-primary text-2xl font-bold">{value}</span>
    </div>
  )
}

export default ReturnToIndex
