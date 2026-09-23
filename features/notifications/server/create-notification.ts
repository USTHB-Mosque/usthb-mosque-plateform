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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildEmailHtml(title: string, message: string, link?: string): string {
  return `
    <div dir="rtl" style="font-family: sans-serif; text-align: right;">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      ${link ? `<p><a href="${escapeHtml(link)}">عرض التفاصيل في بوابة الجامعة</a></p>` : ''}
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

  // The row write joins the caller's transaction; the email goes out inside
  // that window, before the caller commits. If the caller rolls back after a
  // successful email, the recipient gets a mail for an event that never
  // persisted — accepted trade-off: emails carry no secret state, and sending
  // after an unknown-time commit is not possible from inside the helper.
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
  } catch (error) {
    // Email failure must not roll back the notification (#17) — but it must
    // not vanish silently either: the row keeps `emailSent: false`.
    console.error('[notifications] transactional email failed', error)
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
