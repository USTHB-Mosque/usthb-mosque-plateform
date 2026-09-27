import { describe, expect, it } from 'vitest'

import {
  formatRelativeArabicTime,
  groupNotificationsByDay,
  type DayGroupKey,
} from '@/features/notifications/lib/notifications-format'
import type { NotificationListItem } from '@/features/notifications'

// A fixed "now" so every branch is deterministic: 2026-09-27 15:00 local time.
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

describe('formatRelativeArabicTime', () => {
  it('says الآن for anything under a minute', () => {
    expect(formatRelativeArabicTime(new Date(NOW.getTime() - 10_000).toISOString(), NOW)).toBe(
      'الآن',
    )
  })

  it('says منذ … دقيقة for a few minutes ago', () => {
    const text = formatRelativeArabicTime(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)
    expect(text).toBe('منذ 5 دقائق')
  })

  it('says منذ … ساعة for a few hours ago', () => {
    const text = formatRelativeArabicTime(
      new Date(NOW.getTime() - (3 * 3_600_000 + 60_000)).toISOString(),
      NOW,
    )
    // arDZ may append تقريباً when the lower unit rounds; assert the unit stem.
    expect(text).toMatch(/^منذ/)
    expect(text).toContain('ساع')
  })

  it('says منذ … يوم for one to six days ago', () => {
    const text = formatRelativeArabicTime(
      new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
      NOW,
    )
    expect(text).toContain('يوم')
  })

  it('falls back to the absolute Arabic date beyond a week', () => {
    const text = formatRelativeArabicTime(
      new Date(NOW.getTime() - 30 * 86_400_000).toISOString(),
      NOW,
    )
    expect(text).toMatch(/\d{4}/)
  })
})

describe('groupNotificationsByDay', () => {
  it('splits items into اليوم, أمس and أقدم groups, keeping the sort order', () => {
    const groups = groupNotificationsByDay(
      [
        item({ id: 1, createdAt: NOW.toISOString() }),
        item({ id: 2, createdAt: new Date(NOW.getTime() - 86_400_000).toISOString() }),
        item({ id: 3, createdAt: new Date(NOW.getTime() - 5 * 86_400_000).toISOString() }),
        item({ id: 4, createdAt: NOW.toISOString() }),
      ],
      NOW,
    )

    expect(groups.map((group) => group.key)).toEqual<DayGroupKey[]>(['today', 'yesterday', 'older'])
    expect(groups[0]?.label).toBe('اليوم')
    expect(groups[1]?.label).toBe('أمس')
    expect(groups[2]?.label).toBe('أقدم')
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual([1, 4])
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual([2])
    expect(groups[2]?.items.map((entry) => entry.id)).toEqual([3])
  })

  it('collapses an absent group', () => {
    const groups = groupNotificationsByDay([item({ id: 1, createdAt: NOW.toISOString() })], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('today')
  })

  it('returns no groups for no items', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([])
  })
})
