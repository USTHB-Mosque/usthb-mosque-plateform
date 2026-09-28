import { format, formatDistanceStrict } from 'date-fns'
import { arDZ } from 'date-fns/locale'

import type { NotificationListItem } from '@/features/notifications/server/get-notifications'

/**
 * Notification display helpers: Arabic relative timestamps and day grouping
 * for the inbox list. Pure — the caller passes `now` so pages render
 * deterministic text.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "منذ 5 دقائق" style stamp: الآن under a minute, then a relative distance
 * for every age. The absolute date is available on hover.
 */
export function formatRelativeArabicTime(value: string, now: Date = new Date()): string {
  const date = new Date(value)
  const distance = now.getTime() - date.getTime()

  if (distance < MINUTE) return 'الآن'

  const strict = (unit: 'minute' | 'hour' | 'day') =>
    formatDistanceStrict(date, now, { locale: arDZ, unit, addSuffix: true })

  if (distance < HOUR) return strict('minute')
  if (distance < DAY) return strict('hour')
  if (distance < 7 * DAY) return strict('day')
  return formatDistanceStrict(date, now, { locale: arDZ, addSuffix: true })
}

/** The absolute Arabic date-time stamp, shared by the hover title. */
export function formatAbsoluteArabicTime(value: string): string {
  return format(new Date(value), 'd MMMM yyyy، HH:mm', { locale: arDZ })
}

export type DayGroupKey = 'today' | 'yesterday' | 'older'
export type NotificationDayGroup = {
  key: DayGroupKey
  label: string
  items: NotificationListItem[]
}

// Both Node SSR and browser hydration must use the same calendar. The mosque
// operates in Algeria; relying on the runtime's local zone breaks grouping
// near midnight when the server runs in UTC.
const calendar = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Algiers',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function previousCalendarDay(now: Date): Date {
  const parts = calendar.formatToParts(now)
  const value = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((part) => part.type === type)?.value)
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day') - 1))
}

/**
 * Groups the newest-first inbox into اليوم / أمس / أقدم sections. The list
 * order inside each group is preserved, and absent groups are collapsed.
 */
export function groupNotificationsByDay(
  items: NotificationListItem[],
  now: Date = new Date(),
): NotificationDayGroup[] {
  const today = calendar.format(now)
  const yesterday = calendar.format(previousCalendarDay(now))

  const groups: NotificationDayGroup[] = [
    { key: 'today', label: 'اليوم', items: [] },
    { key: 'yesterday', label: 'أمس', items: [] },
    { key: 'older', label: 'أقدم', items: [] },
  ]

  for (const item of items) {
    const date = calendar.format(new Date(item.createdAt))
    const bucket = date === today ? 0 : date === yesterday ? 1 : 2
    groups[bucket]?.items.push(item)
  }

  return groups.filter((group) => group.items.length > 0)
}
