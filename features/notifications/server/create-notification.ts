import type { PayloadRequest } from 'payload'
import type { Notification } from '@/payload-types'
import { EMAIL_PREFERENCE_BY_NOTIFICATION_TYPE, type NotificationType } from '@/utils/notifications'

export type CreateNotificationArgs = {
  /** The caller's request: passing it joins the caller's transaction. */
  req: PayloadRequest
  user: number
  type: NotificationType
  title: string
  message: string
  link?: string
  email?: boolean
}

function buildEmailHtml(title: string, message: string, link?: string): string {
  return `
    <div dir="rtl" style="font-family: sans-serif; text-align: right;">
      <h2>${title}</h2>
      <p>${message}</p>
      ${link ? `<p><a href="${link}">عرض التفاصيل في بوابة الجامعة</a></p>` : ''}
      <p>مسجد الجامعة USTHB</p>
    </div>`
}

/**
 * Writes a notification row and, when `email` is requested, sends the
 * transactional email through the configured nodemailer adapter and stamps
 * `emailSent`.
 *
 * The row write joins the caller's transaction through `req` — it commits or
 * rolls back together with whatever change triggered it (#17). Email failure
 * is swallowed so it can never fail the caller: the notification stays with
 * `emailSent: false`.
 *
 * Email is gated by the user's four Figma toggles from
 * Settings/notifications — but only for types that have a toggle; in-app
 * notifications are always written regardless.
 */
export async function createNotification(args: CreateNotificationArgs): Promise<Notification> {
  const { req, user, type, title, message, link, email } = args

  const notification = (await req.payload.create({
    collection: 'notifications',
    data: { user, type, title, message, link },
    req,
    overrideAccess: true,
  })) as Notification

  if (!email) return notification

  const recipient = (await req.payload.findByID({
    collection: 'users',
    id: user,
    req,
    overrideAccess: true,
  })) as { email?: string; notificationPreferences?: Record<string, boolean> }

  const preferenceKey = EMAIL_PREFERENCE_BY_NOTIFICATION_TYPE[type]
  const preferenceEnabled = preferenceKey
    ? Boolean(recipient.notificationPreferences?.[preferenceKey])
    : true

  if (!preferenceEnabled) return notification

  try {
    await req.payload.sendEmail({
      to: recipient.email,
      subject: title,
      html: buildEmailHtml(title, message, link),
    })
  } catch {
    // Email failure must not roll back the notification (#17).
    return notification
  }

  return (await req.payload.update({
    collection: 'notifications',
    id: notification.id,
    data: { emailSent: true },
    req,
    overrideAccess: true,
  })) as Notification
}
