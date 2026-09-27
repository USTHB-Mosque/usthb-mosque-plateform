import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { notifyBellRefresh, onBellRefresh } from '@/features/notifications/lib/bell-refresh'
import { makeNotificationItem as item } from '@/features/notifications/fixtures'
import NotificationsList from './NotificationsList'

const push = vi.fn()
// The inbox reads its filter state from the URL; tests point this at what the
// browser address bar would carry.
let currentSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => currentSearchParams,
}))

vi.mock('@/features/notifications/server/mark-notifications-read', () => ({
  markNotificationRead: vi.fn(async () => ({ ok: true as const })),
  markAllNotificationsRead: vi.fn(async () => ({ ok: true as const, count: 1 })),
}))

// The grouping rides on the viewer's calendar day, so the fixture items are
// built relative to the real clock: today / yesterday / five days ago.
const DAY = 86_400_000

function listProps(
  notifications: ReturnType<typeof item>[],
  seen: 'all' | 'unread' = 'all',
): React.ComponentProps<typeof NotificationsList> {
  return {
    data: {
      notifications,
      unreadCount: notifications.filter((entry) => !entry.seen).length,
      totalDocs: notifications.length,
      totalPages: 1,
      page: 1,
    },
    seen,
  }
}

describe('NotificationsList', () => {
  afterEach(() => {
    cleanup()
    push.mockClear()
    currentSearchParams = new URLSearchParams()
  })

  it('groups items into اليوم / أمس / أقدم sections in newest-first order', () => {
    render(
      <NotificationsList
        {...listProps([
          item({ id: 1, createdAt: new Date().toISOString() }),
          item({ id: 4, createdAt: new Date().toISOString() }),
          item({ id: 2, createdAt: new Date(Date.now() - DAY).toISOString() }),
          item({ id: 3, createdAt: new Date(Date.now() - 5 * DAY).toISOString() }),
        ])}
      />,
    )

    expect(screen.getByText('اليوم')).toBeVisible()
    expect(screen.getByText('أمس')).toBeVisible()
    expect(screen.getByText('أقدم')).toBeVisible()
    // Each labelled section carries exactly its rows.
    const today = screen.getByLabelText('اليوم')
    expect(within(today).getAllByRole('button')).toHaveLength(2)
    expect(
      within(today)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(expect.arrayContaining([expect.stringContaining('إشعار')]))
    expect(within(screen.getByLabelText('أمس')).getAllByRole('button')).toHaveLength(1)
    expect(within(screen.getByLabelText('أقدم')).getAllByRole('button')).toHaveLength(1)
  })

  it('renders the type filter as pills carrying the URL params', () => {
    currentSearchParams = new URLSearchParams('seen=unread')
    render(<NotificationsList {...listProps([item()], 'unread')} />)

    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'كل الأنواع' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'إعارة' })).toBeVisible()
    // The pill preserves seen and resets the page, per the URL-param contract.
    // Base UI renders the trigger as <a role="button">, so the href is on it.
    const pill = screen.getByRole('button', { name: 'إعارة' })
    expect(pill.getAttribute('href')).toBe('/user/notifications?seen=unread&type=loan')
  })

  it('renders relative Arabic timestamps with the absolute date as the title', () => {
    // The list stamps against the mount clock, so "now" here means fresh.
    render(
      <NotificationsList {...listProps([item({ createdAt: new Date().toISOString() })], 'all')} />,
    )

    const stamp = screen.getByText('الآن')
    expect(stamp).toBeVisible()
    expect(stamp.getAttribute('title')).toMatch(/\d{4}/)
  })

  it('shows a labelled icon per notification type', () => {
    render(
      <NotificationsList
        {...listProps([item({ id: 1, type: 'loan' }), item({ id: 2, type: 'activity' })], 'all')}
      />,
    )

    expect(screen.getByLabelText('إشعار إعارة')).toBeVisible()
    expect(screen.getByLabelText('إشعار نشاط')).toBeVisible()
  })

  it('dispatches the bell refresh when a row is marked read', async () => {
    const listener = vi.fn()
    const unsubscribe = onBellRefresh(listener)
    try {
      render(<NotificationsList {...listProps([item({ id: 1 })], 'all')} />)
      await userEvent.click(screen.getAllByRole('button', { name: /إشعار/ })[0]!)
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })

  it('exposes notifyBellRefresh/onBellRefresh as a pair', () => {
    const listener = vi.fn()
    const unsubscribe = onBellRefresh(listener)
    notifyBellRefresh()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    notifyBellRefresh()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
