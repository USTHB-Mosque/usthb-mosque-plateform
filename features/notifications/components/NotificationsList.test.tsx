import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { notifyBellRefresh, onBellRefresh } from '@/features/notifications/lib/bell-refresh'
import type { NotificationListItem } from '@/features/notifications'
import NotificationsList from './NotificationsList'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/features/notifications/server/mark-notifications-read', () => ({
  markNotificationRead: vi.fn(async () => ({ ok: true as const })),
  markAllNotificationsRead: vi.fn(async () => ({ ok: true as const, count: 1 })),
}))

// A fixed "now" so the day grouping is deterministic.
const NOW = new Date('2026-09-27T15:00:00')

function item(overrides: Partial<NotificationListItem> = {}): NotificationListItem {
  return {
    id: 1,
    type: 'system',
    title: 'إشعار',
    message: 'رسالة',
    link: null,
    seen: false,
    createdAt: NOW.toISOString(),
    ...overrides,
  }
}

function listProps(
  notifications: NotificationListItem[],
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
  })

  it('groups items into اليوم / أمس / أقدم sections', () => {
    render(
      <NotificationsList
        {...listProps([
          item({ id: 1, createdAt: NOW.toISOString() }),
          item({ id: 2, createdAt: new Date(NOW.getTime() - 86_400_000).toISOString() }),
          item({ id: 3, createdAt: new Date(NOW.getTime() - 5 * 86_400_000).toISOString() }),
        ])}
      />,
    )

    expect(screen.getByText('اليوم')).toBeVisible()
    expect(screen.getByText('أمس')).toBeVisible()
    expect(screen.getByText('أقدم')).toBeVisible()
    // The rows keep their newest-first order inside their groups.
    const buttons = screen.getAllByRole('button', { name: /إشعار/ })
    expect(buttons.map((button) => button.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('إشعار'),
        expect.stringContaining('إشعار'),
        expect.stringContaining('إشعار'),
      ]),
    )
  })

  it('renders the type filter as pills, not a select', () => {
    render(<NotificationsList {...listProps([item()], 'all')} />)

    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'كل الأنواع' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'إعارة' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'النظام' })).toBeVisible()
  })

  it('renders relative Arabic timestamps with the absolute date as the title', () => {
    render(
      <NotificationsList {...listProps([item({ createdAt: NOW.toISOString() })], 'all')} />,
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
