import { LogAction } from '@/collections/Log'

export { LogAction }

export type LogActionValue = (typeof LogAction)[keyof typeof LogAction]

export const logActionLabels: Record<LogActionValue, string> = {
  [LogAction.BookCreated]: 'إضافة كتاب',
  [LogAction.BookUpdated]: 'تعديل كتاب',
  [LogAction.BookDeleted]: 'حذف كتاب',
  [LogAction.BookImported]: 'استيراد كتب',
  [LogAction.ArticleCreated]: 'إضافة مقال',
  [LogAction.ArticleUpdated]: 'تعديل مقال',
  [LogAction.ArticleDeleted]: 'حذف مقال',
  [LogAction.ActivityCreated]: 'إضافة نشاط',
  [LogAction.ActivityUpdated]: 'تعديل نشاط',
  [LogAction.ActivityDeleted]: 'حذف نشاط',
  [LogAction.ReviewDeleted]: 'حذف تقييم',
  [LogAction.LoanApproved]: 'قبول طلب إعارة',
  [LogAction.LoanRefused]: 'رفض طلب إعارة',
  [LogAction.LoanPickedUp]: 'تسليم كتاب',
  [LogAction.LoanReturned]: 'استلام كتاب',
  [LogAction.ExtensionApproved]: 'قبول تمديد',
  [LogAction.ExtensionRefused]: 'رفض تمديد',
  [LogAction.UserVerified]: 'توثيق عضو',
  [LogAction.UserRejected]: 'رفض توثيق عضو',
  [LogAction.UserRoleChanged]: 'تغيير دور',
  [LogAction.UserDeleted]: 'حذف عضو',
  [LogAction.UsersImported]: 'استيراد أعضاء',
  [LogAction.CardArchived]: 'أرشفة بطاقة',
}

export interface LogInput {
  action: LogActionValue
  targetType?: string
  targetId?: string | number | null
  message: string
  metadata?: Record<string, unknown>
}

export interface LogsQuery {
  page?: number
  limit?: number
  actor?: number | string
  action?: LogActionValue
  from?: string
  to?: string
}

export interface DayGroup<T> {
  dateKey: string
  label: string
  isToday: boolean
  items: T[]
}

/** Groups newest-first rows into local-day buckets with Arabic headers. */
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
