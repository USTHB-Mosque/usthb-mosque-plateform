/**
 * Notification vocabulary shared by the `notifications` collection schema and
 * the notifications feature (creation helper, SSE stream, UI).
 */

export const NOTIFICATION_TYPES = [
  { label: 'إعارة', value: 'loan' },
  { label: 'قائمة الانتظار', value: 'waitlist' },
  { label: 'تمديد الإعارة', value: 'extension' },
  { label: 'توثيق الحساب', value: 'verification' },
  { label: 'طلب كتاب', value: 'request' },
  { label: 'نشاط', value: 'activity' },
  { label: 'مقال', value: 'article' },
  { label: 'النظام', value: 'system' },
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['value']

/** Deep route of the notifications inbox, used by the bell and the list page. */
export const NOTIFICATIONS_PAGE = '/user/notifications'

/**
 * Keys of `user.notificationPreferences` — the four Figma email toggles from
 * Settings/notifications (2228:35550). They gate email only; in-app
 * notifications are always written.
 */
export type NotificationEmailPreference =
  'loanRequests' | 'activityRegistrations' | 'loanExtensions' | 'loanReturnReminder'

/**
 * Which email toggle gates each notification type, per the MVP trigger table
 * in #17: waitlist promotion answers a loan request, extension decisions are
 * extension requests, and the loan type carries the due-date reminder.
 * Types without a Figma toggle (verification, request, article, system) are
 * not gated — email goes out whenever the caller asks for it.
 */
export const EMAIL_PREFERENCE_BY_NOTIFICATION_TYPE: Partial<
  Record<NotificationType, NotificationEmailPreference>
> = {
  loan: 'loanReturnReminder',
  waitlist: 'loanRequests',
  extension: 'loanExtensions',
  activity: 'activityRegistrations',
}
