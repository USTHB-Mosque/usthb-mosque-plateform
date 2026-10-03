import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

let mockPathname = '/admin-panel/dashboard'
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}))

// A stub for a stub: the sidebar's logo is not what this file is about, and
// the real `next/image` needs no optimiser in jsdom.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => <img alt={String(props.alt ?? '')} />,
}))

vi.mock('@/features/auth/server/logout', () => ({ logout: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import AdminSidebar from './AdminSidebar'
import { adminMainNav } from './nav'

const LOANS_HREF = '/admin-panel/loans'

function renderSidebar(badges?: Record<string, number>) {
  return render(
    <AdminSidebar userName="مدير" role="admin" badges={badges}>
      <div>المحتوى</div>
    </AdminSidebar>,
  )
}

describe('AdminSidebar loan badge', () => {
  it('shows the pending count on الإعارات (#65)', () => {
    renderSidebar({ [LOANS_HREF]: 4 })

    expect(screen.getAllByText('4 إعارات بانتظار القرار').length).toBeGreaterThan(0)
  })

  it('hides the badge entirely on a quiet desk', () => {
    renderSidebar({ [LOANS_HREF]: 0 })

    expect(screen.queryByText(/بانتظار القرار/)).not.toBeInTheDocument()
  })

  it('carries the badge on both the desktop rail and the mobile chip row', () => {
    // #65 asked for the badge on the sidebar; a count visible on desktop and
    // absent on mobile is the same inconsistency #164 raises for the portal.
    renderSidebar({ [LOANS_HREF]: 3 })

    expect(screen.getAllByText('3 إعارات بانتظار القرار')).toHaveLength(2)
  })

  it('keeps the visible count but hides it from the announcement', () => {
    renderSidebar({ [LOANS_HREF]: 7 })

    for (const phrase of screen.getAllByText('7 إعارات بانتظار القرار')) {
      expect(phrase).toHaveClass('sr-only')
    }

    // The digit is drawn twice on purpose: once for the eye, once inside the
    // spoken phrase. Only the spoken one may reach a screen reader, or the
    // count is announced twice.
    const digits = screen
      .getAllByText('7')
      .filter((el) => el.getAttribute('aria-hidden') === 'true')
    expect(digits).toHaveLength(2)
  })

  it('still renders the whole main nav when badges are omitted', () => {
    renderSidebar()

    for (const item of adminMainNav) {
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0)
    }
  })
})
