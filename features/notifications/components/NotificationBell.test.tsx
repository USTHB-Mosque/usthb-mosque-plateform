import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { makeNotificationItem as item } from '@/features/notifications/fixtures'
import { BellStateProvider } from './bell-context'
import NotificationBell from './NotificationBell'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// The mock must not import the original: get-notifications transitively boots
// payload.config (storage plugin), which needs S3 env outside the browser.
vi.mock('@/features/notifications/server/get-notifications', () => ({
  getBellState: vi.fn(async () => ({
    unreadCount: 1,
    notifications: [item({ id: 7, title: 'تم قبول طلب الإعارة', type: 'loan' })],
  })),
}))

vi.mock('@/features/notifications/server/mark-notifications-read', () => ({
  markNotificationRead: vi.fn(async () => ({ ok: true as const })),
}))

// jsdom has no EventSource; the bell only needs a stub it can close.
class EventSourceStub {
  addEventListener(): void {}
  close(): void {}
}
vi.stubGlobal('EventSource', EventSourceStub)

describe('NotificationBell', () => {
  afterEach(async () => {
    cleanup()
    const { getBellState } = await import('@/features/notifications/server/get-notifications')
    vi.mocked(getBellState).mockClear()
  })

  it('fetches the bell state on mount and shows the unread badge', async () => {
    render(<NotificationBell />)
    // The badge (count 1) renders on the trigger once the state lands.
    expect(await screen.findByText('1')).toBeVisible()

    const { getBellState } = await import('@/features/notifications/server/get-notifications')
    expect(getBellState).toHaveBeenCalledTimes(1)
  })

  it('refetches when the inbox nudges the bell', async () => {
    render(<NotificationBell />)
    await screen.findByText('1')

    const { getBellState } = await import('@/features/notifications/server/get-notifications')
    const { notifyBellRefresh } = await import('@/features/notifications/lib/bell-refresh')
    notifyBellRefresh()

    await vi.waitFor(() => {
      expect(getBellState).toHaveBeenCalledTimes(2)
    })
  })

  it('renders the server-provided badge immediately and only fetches on refresh', async () => {
    const { getBellState } = await import('@/features/notifications/server/get-notifications')
    const { notifyBellRefresh } = await import('@/features/notifications/lib/bell-refresh')
    render(
      <BellStateProvider state={{ unreadCount: 2, notifications: [] }}>
        <NotificationBell />
      </BellStateProvider>,
    )

    expect(screen.getByRole('button', { name: 'الإشعارات' })).toHaveTextContent('2')
    expect(getBellState).not.toHaveBeenCalled()

    notifyBellRefresh()
    await vi.waitFor(() => expect(getBellState).toHaveBeenCalledTimes(1))
  })
})
