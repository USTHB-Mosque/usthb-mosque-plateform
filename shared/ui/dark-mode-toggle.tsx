'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const DarkModeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // `theme` resolves against localStorage / the system preference on the client
  // but stays undefined on the server, so anything derived from it must wait for
  // mount — otherwise the hydration render disagrees with the server markup on
  // aria-label / aria-pressed. `resolvedTheme` (not `theme`) because the
  // provider's default is `system`.
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={isDark ? 'إيقاف الوضع الداكن' : 'تفعيل الوضع الداكن'}
      aria-pressed={isDark}
      aria-disabled={!mounted}
      tabIndex={mounted ? 0 : -1}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn('relative', !mounted && 'pointer-events-none opacity-50')}
    >
      {mounted && (
        <>
          <Sun className={isDark ? 'hidden size-5' : 'size-5'} aria-hidden="true" />
          <Moon className={isDark ? 'size-5' : 'hidden size-5'} aria-hidden="true" />
        </>
      )}
    </Button>
  )
}

export default DarkModeToggle
