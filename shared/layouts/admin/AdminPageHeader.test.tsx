import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const toggle = vi.fn()
const setTheme = vi.fn()
// Read lazily inside the mock factory, so each test can pick a role.
let mockRole: 'admin' | 'librarian' = 'admin'

// The header only reads `collapsed`/`role` from the sidebar context, so the
// provider is stubbed rather than mounted: rendering the real AdminSidebar
// pulls in the nav tree, the logout server action and next/image, none of
// which are under test here.
vi.mock('@/shared/layouts/admin/AdminSidebar', () => ({
  useAdminSidebar: () => ({ collapsed: false, toggle, role: mockRole }),
}))

// NotificationBell owns its own data fetching and inbox link.
vi.mock('@/features/notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', setTheme }),
}))

import AdminPageHeader from './AdminPageHeader'

describe('AdminPageHeader', () => {
  it('exposes a theme control — the admin panel never had one before #172', () => {
    render(<AdminPageHeader title="لوحة التحكم" />)

    expect(screen.getByRole('button', { name: 'إيقاف الوضع الداكن' })).toBeInTheDocument()
  })

  it('wires that control to next-themes', async () => {
    render(<AdminPageHeader title="لوحة التحكم" />)

    await userEvent.click(screen.getByRole('button', { name: 'إيقاف الوضع الداكن' }))

    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('renders the page title', () => {
    render(<AdminPageHeader title="الإعارات" />)

    expect(screen.getByRole('heading', { level: 1, name: 'الإعارات' })).toBeInTheDocument()
  })

  it('shows the notification inbox only to an admin', () => {
    const { unmount } = render(<AdminPageHeader title="لوحة التحكم" />)
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    unmount()

    mockRole = 'librarian'
    render(<AdminPageHeader title="لوحة التحكم" />)
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument()
    mockRole = 'admin'
  })
})
