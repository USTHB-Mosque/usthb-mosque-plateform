'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DarkModeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={isDark ? 'إيقاف الوضع الداكن' : 'تفعيل الوضع الداكن'}
      aria-pressed={isDark}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative"
    >
      {mounted && (
        <>
          <Sun
            className={isDark ? 'hidden size-5' : 'size-5'}
            aria-hidden="true"
          />
          <Moon
            className={isDark ? 'size-5' : 'hidden size-5'}
            aria-hidden="true"
          />
        </>
      )}
    </Button>
  )
}

export default DarkModeToggle
