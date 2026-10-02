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
  [LogAction.ActivityAttendance]: 'تسجيل حضور نشاط',
  [LogAction.ReviewDeleted]: 'حذف تقييم',
  [LogAction.LoanApproved]: 'قبول طلب إعارة',
  [LogAction.LoanRefused]: 'رفض طلب إعارة',
  [LogAction.LoanExpired]: 'انتهاء نافذة الاستلام',
  [LogAction.LoanRescheduled]: 'إعادة جدولة استلام',
  [LogAction.LoanPickedUp]: 'تسليم كتاب',
  [LogAction.LoanReturned]: 'استلام كتاب',
  [LogAction.LoanCancelled]: 'إلغاء طلب إعارة',
  [LogAction.ExtensionApproved]: 'قبول تمديد',
  [LogAction.ExtensionRefused]: 'رفض تمديد',
  [LogAction.ExtensionWithdrawn]: 'سحب طلب تمديد',
  [LogAction.UserVerified]: 'توثيق عضو',
  [LogAction.UserRejected]: 'رفض توثيق عضو',
  [LogAction.UserBlockLifted]: 'رفع حجب الإعارة',
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
