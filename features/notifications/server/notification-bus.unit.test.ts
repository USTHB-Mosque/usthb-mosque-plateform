import { describe, expect, it, vi } from 'vitest'
import { publishNotificationCreated, subscribeToNotifications } from './notification-bus'

describe('notification push bus', () => {
  it('delivers only to the recipient and removes closed streams', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeToNotifications(1, first)
    const unsubscribeSecond = subscribeToNotifications(2, second)

    publishNotificationCreated(1, 12)
    expect(first).toHaveBeenCalledExactlyOnceWith(12)
    expect(second).not.toHaveBeenCalled()

    unsubscribeFirst()
    publishNotificationCreated(1, 13)
    expect(first).toHaveBeenCalledOnce()
    unsubscribeSecond()
  })

  it('isolates a failing stream from other subscribers', () => {
    const healthy = vi.fn()
    const unsubscribeBad = subscribeToNotifications(3, () => {
      throw new Error('disconnected')
    })
    const unsubscribeGood = subscribeToNotifications(3, healthy)
    expect(() => publishNotificationCreated(3, 14)).not.toThrow()
    expect(healthy).toHaveBeenCalledExactlyOnceWith(14)
    unsubscribeBad()
    unsubscribeGood()
  })
})
