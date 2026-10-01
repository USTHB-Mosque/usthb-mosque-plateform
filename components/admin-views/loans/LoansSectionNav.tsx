'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

/**
 * Sub-navigation for الإعارات (#144). The three queues live under one sidebar
 * entry rather than growing it: a loan, a waitlist entry and an extension are
 * all one desk's work, and Figma's "three destinations" are three views of it.
 *
 * Exact-match active state — `/admin-panel/loans` is a prefix of both siblings,
 * so the usual `startsWith` would light up all three on every page.
 */
const SECTIONS: Array<{ label: string; href: string }> = [
  { label: 'طلبات الإعارة', href: '/admin-panel/loans' },
  { label: 'قائمة إنتظار الإعارات', href: '/admin-panel/loans/waitlist' },
  { label: 'طلبات تمديد الإعارة', href: '/admin-panel/loans/extensions' },
]

const LoansSectionNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav aria-label="أقسام الإعارات" className="flex flex-wrap gap-2">
      {SECTIONS.map((section) => {
        const active = pathname === section.href
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition-colors',
              active
                ? 'border-primary bg-primary/10 font-medium text-primary-300'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-card-foreground',
            )}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default LoansSectionNav
