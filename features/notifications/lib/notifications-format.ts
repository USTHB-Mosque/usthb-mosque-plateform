import { format, formatDistance } from 'date-fns'
import { arDZ } from 'date-fns/locale'

import type { NotificationListItem } from '@/features/notifications'

/**
 * Notification display helpers: Arabic relative timestamps and day grouping
 * for the inbox list. Pure — the caller passes `now` so pages render
 * deterministic text.
 */

/** A week is the readability cut-off: older items show an absolute date. */
const RELATIVE_WINDOW_DAYS = 7

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "منذ 5 دقائق" style stamp: الآن under a minute, relative distance up to a
 * week, then the absolute Arabic date for anything older (the groups already
 * read أقدم there).
 */
export function formatRelativeArabicTime(value: string, now: Date = new Date()): string {
  const date = new Date(value)
  const distance = now.getTime() - date.getTime()

  if (distance < MINUTE) return 'الآن'

  const strict = (unit: 'minute' | 'hour' | 'day') =>
    formatDistance(date, now, { locale: arDZ, unit, addSuffix: true })

  if (distance < 7 * DAY) {
    if (distance < 60 * MINUTE) return strict('minute')
    if (distance < DAY) return strict('hour')
    return strict('day')
  }

  return format(date, 'd MMMM yyyy', { locale: arDZ })
}

export type DayGroupKey = 'today' | 'yesterday' | 'older'
export type NotificationDayGroup = {
  key: DayGroupKey
  label: string
  items: NotificationListItem[]
}

/** Calendar-day comparison in the viewer's local time. */
function dayIndex(value: Date): number {
  return Math.floor(value.getTime() / DAY)
}

/**
 * Groups the newest-first inbox into اليوم / أمس / أقدم sections. The list
 * order inside each group is preserved, and absent groups are collapsed.
 */
export function groupNotificationsByDay(
  items: NotificationListItem[],
  now: Date = new Date(),
): NotificationDayGroup[] {
  const todayIndex = dayIndex(now)

  const groups: NotificationDayGroup[] = [
    { key: 'today', label: 'اليوم', items: [] },
    { key: 'yesterday', label: 'أمس', items: [] },
    { key: 'older', label: 'أقدم', items: [] },
  ]

  for (const item of items) {
    const groupIndex = todayIndex - dayIndex(new Date(item.createdAt))
    const bucket = groupIndex <= 0 ? 0 : groupIndex === 1 ? 1 : 2
    groups[bucket]?.items.push(item)
  }

  return groups.filter((group) => group.items.length > 0)
}
