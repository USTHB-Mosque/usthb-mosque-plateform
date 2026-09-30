export interface DayGroup<T> {
  dateKey: string
  label: string
  isToday: boolean
  items: T[]
}

/**
 * Groups newest-first rows into local-day buckets with Arabic headers.
 *
 * Shared by the admin log screen (#103) and the member activity log (#165):
 * both render a paginated feed grouped by day, so the bucketing — and the
 * `(اليوم)` suffix — must read identically on both.
 */
export function groupLogsByDay<T extends { timestamp: string }>(docs: T[]): DayGroup<T>[] {
  const todayKey = toDateKey(new Date())
  const formatter = new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const groups: DayGroup<T>[] = []
  for (const doc of docs) {
    const date = new Date(doc.timestamp)
    const dateKey = toDateKey(date)
    const last = groups[groups.length - 1]
    if (last && last.dateKey === dateKey) {
      last.items.push(doc)
      continue
    }
    const label = formatter.format(date)
    groups.push({
      dateKey,
      label: dateKey === todayKey ? `${label} (اليوم)` : label,
      isToday: dateKey === todayKey,
      items: [doc],
    })
  }
  return groups
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
