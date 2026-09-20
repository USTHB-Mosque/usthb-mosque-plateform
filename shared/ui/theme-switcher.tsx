'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/shared/lib/utils'

const options = [
  { value: 'light', label: 'فاتح', icon: Sun },
  { value: 'dark', label: 'داكن', icon: Moon },
] as const

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div role="group" aria-label="الوضع" className="flex rounded-[10px] border border-border p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-disabled={!mounted}
            tabIndex={mounted ? 0 : -1}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-[32px] flex-1 items-center justify-center gap-2 rounded-[8px] px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-primary-main-20 font-bold text-primary-300'
                : 'text-grey-500 hover:bg-black/5 hover:text-[#243245]',
              !mounted && 'pointer-events-none opacity-50',
            )}
          >
            <Icon className="size-[18px]" />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeSwitcher