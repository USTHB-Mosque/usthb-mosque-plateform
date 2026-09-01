'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function PasswordInput({
  className,
  disabled,
  ...props
}: React.ComponentProps<'input'>) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative w-full">
      <Input
        type={show ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pe-9', className)}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        className="absolute end-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:text-gray-800 disabled:pointer-events-none disabled:opacity-50"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }