import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { createNotification } from '@/features/notifications/server/create-notification'
import { getBellState, getNotifications } from '@/features/notifications/server/get-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/server/mark-notifications-read'

import type { Payload, CollectionSlug } from 'payload'
import type { User } from '@/payload-types'

let payload: Payload
let owner: User
let otherMember: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  owner = await createTestUser(payload, { email: 'notif-owner@usthb.dz', verified: true })
  otherMember = await createTestUser(payload, { email: 'notif-other@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

/** Server-side creation — the only path allowed for notifications. */
async function seedNotification(data: Partial<Record<string, unknown>> = {}) {
  return payload.create({
    collection: 'notifications',
    data: {
      user: owner.id,
      type: 'system',
      title: 'إشعار',
      message: 'رسالة تجريبية',
      ...data,
    },
    overrideAccess: true,
  })
}

async function canReadAs(user: User | undefined, id: number | string): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.findByID({ collection: 'notifications', id, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

async function canUpdateAs(
  user: User | undefined,
  id: number | string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.update({ collection: 'notifications', id, data, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

async function canCreateAs(
  user: User | undefined,
  // Loose on purpose: the access test cares about the permission, not the
  // typed shape (mirrors collections-access.int.test.ts).
  data: any,
): Promise<boolean> {
  try {
    const req = user ? await boundReq(payload, user) : await boundReq(payload)
    await payload.create({ collection: 'notifications', data, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

async function canDeleteAs(user: User | undefined, id: number | string): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.delete({ collection: 'notifications', id, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

describe('notifications collection access (#17)', () => {
  it('reads rows for the owner and admins, nobody else', async () => {
    const notification = await seedNotification()

    expect(await canReadAs(undefined, notification.id)).toBe(false)
    expect(await canReadAs(owner, notification.id)).toBe(true)
    expect(await canReadAs(otherMember, notification.id)).toBe(false)
    expect(await canReadAs(admin, notification.id)).toBe(true)
  })

  it('scopes every listing to the requesting user only', async () => {
    await seedNotification()
    await seedNotification({ seen: true })
    await seedNotification({ user: otherMember.id, title: 'ليست لي' })

    // Read access returns `false` for anonymous requests, so listing fails
    // closed instead of returning an empty page.
    await expect(
      payload.find({ collection: 'notifications', overrideAccess: false }),
    ).rejects.toThrow('not allowed')

    const ownerList = await payload.find({
      collection: 'notifications',
      req: await boundReq(payload, owner),
      depth: 0,
      overrideAccess: false,
    })
    expect(ownerList.totalDocs).toBe(2)
    expect(ownerList.docs.every((doc) => (doc.user as unknown as number) === owner.id)).toBe(true)

    const adminList = await payload.find({
      collection: 'notifications',
      req: await boundReq(payload, admin),
      depth: 0,
      overrideAccess: false,
    })
    expect(adminList.totalDocs).toBe(3)
  })

  it('can never be created through the API, only server side', async () => {
    const data = { user: owner.id, type: 'system', title: 'x', message: 'y' }

    expect(await canCreateAs(undefined, data)).toBe(false)
    expect(await canCreateAs(owner, data)).toBe(false)
    expect(await canCreateAs(admin, data)).toBe(false)
  })

  it('lets the owner set seen and nothing else', async () => {
    const notification = await seedNotification({ seen: false })

    expect(await canUpdateAs(otherMember, notification.id, { seen: true })).toBe(false)
    expect(await canUpdateAs(admin, notification.id, { seen: true })).toBe(false)
    expect(await canUpdateAs(owner, notification.id, { seen: true })).toBe(true)

    // Protected fields are silently skipped rather than rejected: one update
    // carrying every field must still change only `seen`.
    await payload.update({
      collection: 'notifications',
      id: notification.id,
      data: {
        title: 'معدل',
        message: 'معدلة',
        type: 'loan',
        emailSent: true,
        user: otherMember.id,
      },
      req: await boundReq(payload, owner),
      overrideAccess: false,
    })

    const after = await payload.findByID({
      collection: 'notifications',
      id: notification.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(after.seen).toBe(true)
    expect(after.title).toBe('إشعار')
    expect(after.message).toBe('رسالة تجريبية')
    expect(after.type).toBe('system')
    expect(after.emailSent).toBe(false)
    expect(after.user).toBe(owner.id)
  })

  it('can never be deleted through the API', async () => {
    const notification = await seedNotification()

    expect(await canDeleteAs(undefined, notification.id)).toBe(false)
    expect(await canDeleteAs(owner, notification.id)).toBe(false)
    expect(await canDeleteAs(admin, notification.id)).toBe(false)
  })

  it('defaults seen and emailSent to false', async () => {
    const notification = await seedNotification({ seen: undefined, emailSent: undefined })
    expect(notification.seen).toBe(false)
    expect(notification.emailSent).toBe(false)
  })
})

describe('createNotification (#17)', () => {
  let sendEmailSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    payload = await getTestPayload()
    await resetDatabase()
    owner = await createTestUser(payload, { email: 'notif-owner@usthb.dz', verified: true })
    otherMember = await createTestUser(payload, { email: 'notif-other@usthb.dz', verified: true })
    admin = await createTestUser(payload, { role: 'admin' })
    sendEmailSpy = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    sendEmailSpy.mockRestore()
  })

  it('writes the row server-side and returns it', async () => {
    const req = await boundReq(payload, admin)
    const notification = await createNotification({
      req,
      user: owner.id,
      type: 'waitlist',
      title: 'الكتاب متاح',
      message: 'جاء دورك في قائمة الانتظار',
      link: '/user/my-loans',
    })

    expect(notification.id).toBeTruthy()
    expect(notification.seen).toBe(false)
    expect(notification.emailSent).toBe(false)
    expect(notification.link).toBe('/user/my-loans')
  })

  it('does not send email when the caller does not ask for it', async () => {
    const req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'system',
      title: 'داخلي',
      message: 'بدون بريد',
    })

    expect(sendEmailSpy).not.toHaveBeenCalled()
  })

  it('sends the email in Arabic and stamps emailSent on success', async () => {
    const req = await boundReq(payload, admin)
    const notification = await createNotification({
      req,
      user: owner.id,
      type: 'verification',
      title: 'تم توثيق حسابك',
      message: 'أصبح حسابك موثقاً الآن',
      link: '/user/dashboard',
      email: true,
    })

    expect(sendEmailSpy).toHaveBeenCalledTimes(1)
    const sent = sendEmailSpy.mock.calls[0][0] as { to?: string; subject?: string; html?: string }
    expect(sent.to).toBe(owner.email)
    expect(sent.subject).toBe('تم توثيق حسابك')
    expect(sent.html).toContain('أصبح حسابك موثقاً الآن')
    expect(sent.html).toContain('عرض التفاصيل')

    const after = await payload.findByID({
      collection: 'notifications',
      id: notification.id,
      overrideAccess: true,
    })
    expect(after.emailSent).toBe(true)
  })

  it('gates email on the four Figma toggles, per type', async () => {
    // loanReturnReminder off → loan type silent
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: { notificationPreferences: { loanReturnReminder: false } },
      overrideAccess: true,
    })
    let req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'loan',
      title: 'تذكير',
      message: 'التأخر في الإرجاع',
      email: true,
    })
    expect(sendEmailSpy).not.toHaveBeenCalled()

    // loanRequests gates waitlist
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: { notificationPreferences: { loanReturnReminder: true, loanRequests: false } },
      overrideAccess: true,
    })
    req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'waitlist',
      title: 'ترقية',
      message: 'دورك',
      email: true,
    })
    expect(sendEmailSpy).not.toHaveBeenCalled()

    // loanExtensions gates extension
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: { notificationPreferences: { loanRequests: true, loanExtensions: false } },
      overrideAccess: true,
    })
    req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'extension',
      title: 'تمديد',
      message: 'قرار',
      email: true,
    })
    expect(sendEmailSpy).not.toHaveBeenCalled()

    // activityRegistrations gates activity
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: { notificationPreferences: { loanExtensions: true, activityRegistrations: false } },
      overrideAccess: true,
    })
    req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'activity',
      title: 'نشاط',
      message: 'تسجيل',
      email: true,
    })
    expect(sendEmailSpy).not.toHaveBeenCalled()

    // Types without a toggle (verification) are never gated
    req = await boundReq(payload, admin)
    await createNotification({
      req,
      user: owner.id,
      type: 'verification',
      title: 'توثيق',
      message: 'مقبول',
      email: true,
    })
    expect(sendEmailSpy).toHaveBeenCalledTimes(1)
  })

  it('still writes the in-app notification when the email is suppressed', async () => {
    await payload.update({
      collection: 'users',
      id: owner.id,
      data: { notificationPreferences: { loanReturnReminder: false } },
      overrideAccess: true,
    })
    const req = await boundReq(payload, admin)
    const notification = await createNotification({
      req,
      user: owner.id,
      type: 'loan',
      title: 'متأخر',
      message: 'تذكير',
      email: true,
    })

    const after = await payload.findByID({
      collection: 'notifications',
      id: notification.id,
      overrideAccess: true,
    })
    expect(after.id).toBe(notification.id)
    expect(after.emailSent).toBe(false)
  })

  it('does not fail the caller when the email transport fails', async () => {
    sendEmailSpy.mockRejectedValue(new Error('SMTP down'))
    const req = await boundReq(payload, admin)
    const notification = await createNotification({
      req,
      user: owner.id,
      type: 'extension',
      title: 'قرار التمديد',
      message: 'تم قبول التمديد',
      email: true,
    })

    expect(notification.id).toBeTruthy()
    const after = await payload.findByID({
      collection: 'notifications',
      id: notification.id,
      overrideAccess: true,
    })
    expect(after.emailSent).toBe(false)
  })

  it('joins the caller transaction: nothing is visible before the commit', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('the test adapter must support transactions')
    const req = await boundReq(payload, admin)
    await createNotification({
      req: { ...req, transactionID },
      user: owner.id,
      type: 'system',
      title: 'داخل المعاملة',
      message: 'غير مرئية بعد',
    })

    const outside = await payload.find({
      collection: 'notifications',
      depth: 0,
      overrideAccess: true,
    })
    expect(outside.totalDocs).toBe(0)

    await payload.db.rollbackTransaction(transactionID)
    const afterRollback = await payload.find({
      collection: 'notifications',
      depth: 0,
      overrideAccess: true,
    })
    expect(afterRollback.totalDocs).toBe(0)
  })

  it('joins the caller transaction: the row becomes visible after the caller commits', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('transaction required for this test')
    const req = await boundReq(payload, admin)
    await createNotification({
      req: { ...req, transactionID },
      user: owner.id,
      type: 'system',
      title: 'داخل المعاملة',
      message: 'تُرى بعد الالتزام',
    })

    await payload.db.commitTransaction(transactionID)

    const committed = await payload.find({
      collection: 'notifications',
      depth: 0,
      overrideAccess: true,
    })
    expect(committed.totalDocs).toBe(1)
  })
})

describe('notifications queries and actions (#17)', () => {
  beforeEach(async () => {
    payload = await getTestPayload()
    await resetDatabase()
    clearNextContext()
    owner = await createTestUser(payload, { email: 'notif-owner@usthb.dz', verified: true })
    otherMember = await createTestUser(payload, { email: 'notif-other@usthb.dz', verified: true })
    admin = await createTestUser(payload, { role: 'admin' })
  })

  async function loginAs(user: User) {
    const { token } = await loginToken(payload, {
      email: user.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
  }

  it('getBellState returns null for anonymous callers', async () => {
    clearNextContext()
    expect(await getBellState()).toBeNull()
  })

  it('getBellState returns only the signed-in user rows with an accurate unread count', async () => {
    await seedNotification()
    await seedNotification({ seen: true })
    await seedNotification({ user: otherMember.id })

    await loginAs(owner)
    const state = await getBellState()

    expect(state).not.toBeNull()
    expect(state!.unreadCount).toBe(1)
    expect(state!.notifications).toHaveLength(2)
    expect(state!.notifications.every((item) => item.title !== 'ليست لي')).toBe(true)
  })

  it('getNotifications returns an empty page for anonymous callers', async () => {
    clearNextContext()
    expect(await getNotifications({})).toEqual({
      notifications: [],
      unreadCount: 0,
      totalDocs: 0,
      totalPages: 0,
      page: 1,
    })
  })

  it('getNotifications applies sane defaults for empty and out-of-range args', async () => {
    await seedNotification()
    await seedNotification()

    await loginAs(owner)

    const everything = await getNotifications({})
    expect(everything.totalDocs).toBe(2)

    const paged = await getNotifications({ page: 2, limit: 1 })
    expect(paged.page).toBe(2)
    expect(paged.totalPages).toBe(2)
    expect(paged.notifications).toHaveLength(1)

    const clamped = await getNotifications({ page: 0, limit: 0 })
    expect(clamped.page).toBe(1)
    expect(clamped.totalDocs).toBe(2)
  })

  it('getNotifications filters by seen and by type', async () => {
    await seedNotification({ type: 'loan', seen: false })
    await seedNotification({ type: 'system', seen: false })
    await seedNotification({ type: 'loan', seen: true })

    await loginAs(owner)

    const unseen = await getNotifications({ seen: false })
    expect(unseen.totalDocs).toBe(2)

    const loans = await getNotifications({ type: 'loan' })
    expect(loans.totalDocs).toBe(2)

    const unseenLoans = await getNotifications({ seen: false, type: 'loan' })
    expect(unseenLoans.totalDocs).toBe(1)
  })

  it("markNotificationRead marks an owned row and refuses someone else's", async () => {
    const mine = await seedNotification()
    const theirs = await seedNotification({ user: otherMember.id })

    await loginAs(owner)
    expect(await markNotificationRead(mine.id as number)).toEqual({ ok: true })
    expect(await markNotificationRead(theirs.id as number)).toEqual({
      ok: false,
      error: 'الإشعار غير متوفر',
    })

    const afterMine = await payload.findByID({
      collection: 'notifications',
      id: mine.id,
      overrideAccess: true,
    })
    expect(afterMine.seen).toBe(true)

    const afterTheirs = await payload.findByID({
      collection: 'notifications',
      id: theirs.id,
      overrideAccess: true,
    })
    expect(afterTheirs.seen).toBe(false)
  })

  it('markNotificationRead is refused for anonymous callers', async () => {
    clearNextContext()
    expect(await markNotificationRead(1)).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('markAllNotificationsRead marks only the caller rows', async () => {
    const unseenMine = await seedNotification()
    const seenMine = await seedNotification({ seen: true })
    const theirs = await seedNotification({ user: otherMember.id })

    await loginAs(owner)
    expect(await markAllNotificationsRead()).toEqual({ ok: true, count: 1 })

    const rows = await payload.find({ collection: 'notifications', depth: 0, overrideAccess: true })
    const byId = new Map(rows.docs.map((doc) => [doc.id, doc]))
    expect(byId.get(unseenMine.id)!.seen).toBe(true)
    expect(byId.get(seenMine.id)!.seen).toBe(true)
    expect(byId.get(theirs.id)!.seen).toBe(false)
  })

  it('markAllNotificationsRead is refused for anonymous callers', async () => {
    clearNextContext()
    expect(await markAllNotificationsRead()).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('markAllNotificationsRead reports an error instead of throwing on database failure', async () => {
    await seedNotification()

    await loginAs(owner)
    const updateSpy = vi.spyOn(payload, 'update').mockRejectedValueOnce(new Error('DB down'))
    try {
      expect(await markAllNotificationsRead()).toEqual({ ok: false, error: 'تعذر تحديث الإشعارات' })
    } finally {
      updateSpy.mockRestore()
    }
  })
})
