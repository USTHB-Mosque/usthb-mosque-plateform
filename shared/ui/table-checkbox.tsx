'use client'

import React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function TableCheckbox({
  checked,
  partial = false,
  label,
  onChange,
}: {
  checked: boolean
  partial?: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
        checked || partial
          ? 'border-primary-200 bg-primary-200 text-[#243245]'
          : 'border-muted bg-card hover:border-primary-200',
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : partial ? <Minus className="h-3 w-3" /> : null}
    </button>
  )
}

export default TableCheckbox
