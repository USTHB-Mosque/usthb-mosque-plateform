import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { boundReq, getTestPayload, resetDatabase } from '../setup-integration'
import {
  createTestActivity,
  createTestArticle,
  createTestBook,
  createTestLoan,
  createTestReview,
} from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { registerActivityLogic } from '@/features/activities/server/activities'
import { borrowBookLogic } from '@/features/library/server/borrow-book'
import { requestLoanExtensionLogic } from '@/features/library/server/loan-extensions'
import {
  decideActivityRegistration,
  getAdminActivityRegistrations,
} from '@/features/admin/server/activity-registrations'
import { sendBulkEmailDigest } from '@/features/notifications/server/send-digest'
import { getBellState, getNotifications } from '@/features/notifications/server/get-notifications'
import { updateNotificationPreferences } from '@/features/profile/server/settings'
import { resolveRelationId } from '@/shared/lib/relations'

let payload: Payload
let member: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'coverage-member@usthb.dz', verified: true })
  admin = await createTestUser(payload, { email: 'coverage-admin@usthb.dz', role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function signIn(user: User) {
  const { token } = await loginToken(payload, {
    email: user.email!,
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

async function notificationsFor(user: User) {
  return payload.find({
    collection: 'notifications',
    where: { user: { equals: user.id } },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
}

describe('Activity registration decisions', () => {
  it('lets an Admin accept a pending registration and notifies its owner once', async () => {
    const activity = await createTestActivity(payload)
    const result = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(result.success).toBe(true)
    const registration = result.registration as { id: number }

    await signIn(admin)
    const before = await getAdminActivityRegistrations(activity.id)
    expect(before.registrations.map((item) => item.id)).toContain(registration.id)
    expect(before.canDecide).toBe(true)
    expect(await decideActivityRegistration(registration.id, 'accepted')).toEqual({ ok: true })
    expect(await decideActivityRegistration(registration.id, 'accepted')).toMatchObject({
      ok: false,
    })
    const row = await payload.findByID({
      collection: 'activity-registrations',
      id: registration.id,
      overrideAccess: true,
    })
    expect(row.status).toBe('accepted')
    const notices = await notificationsFor(member)
    expect(notices.docs.filter((notice) => notice.title.includes('قبول التسجيل'))).toHaveLength(1)
  })

  it('requires a refusal reason and sends the reason in-app', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      overrideAccess: true,
    })
    await signIn(admin)
    expect(await decideActivityRegistration(row.id, 'refused', '  ')).toMatchObject({ ok: false })
    expect(await decideActivityRegistration(row.id, 'refused', 'تعارض في الموعد')).toEqual({
      ok: true,
    })
    const notices = await notificationsFor(member)
    expect(notices.docs.some((notice) => notice.message.includes('تعارض في الموعد'))).toBe(true)
    const updated = await payload.findByID({
      collection: 'activity-registrations',
      id: row.id,
      overrideAccess: true,
    })
    expect(updated.refusalReason).toBe('تعارض في الموعد')
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(0)
  })

  it('records a full-capacity rejection, notifies the member, and does not occupy a spot', async () => {
    const activity = await createTestActivity(payload, {
      maxParticipants: 1,
      currentParticipants: 1,
    })
    const result = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(result.success).toBe(false)
    const rows = await payload.find({ collection: 'activity-registrations', overrideAccess: true })
    expect(rows.docs[0].status).toBe('quota_rejected')
    expect(
      (await notificationsFor(member)).docs.some((notice) => notice.title.includes('اكتمل')),
    ).toBe(true)
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(1)
  })

  it('lets a quota-rejected member register once a place becomes available', async () => {
    const activity = await createTestActivity(payload, {
      maxParticipants: 1,
      currentParticipants: 1,
    })
    const req = await boundReq(payload, member)
    const first = await registerActivityLogic(String(activity.id), { payload, user: member, req })
    expect(first.success).toBe(false)
    // A retry while the activity is still full lands on the quota message.
    const stillFull = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(stillFull.success).toBe(false)
    expect(stillFull.message).toBe('عذراً، اكتمل الحد الأقصى للمشاركين')
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { currentParticipants: 0 },
      overrideAccess: true,
    })
    const next = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(next.success).toBe(true)
    expect((next.registration as { id: number }).id).toBe((first.registration as { id: number }).id)
    const row = await payload.findByID({
      collection: 'activity-registrations',
      id: (next.registration as { id: number }).id,
      overrideAccess: true,
    })
    expect(row.status).toBe('pending')
  })

  it('does not let a member read or resolve another registration, or decide their own', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      overrideAccess: true,
    })
    const other = await createTestUser(payload, { email: 'coverage-other@usthb.dz' })
    const req = await boundReq(payload, other)
    await expect(
      payload.findByID({
        collection: 'activity-registrations',
        id: row.id,
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: row.id,
        data: { status: 'accepted' },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await signIn(other)
    await expect(decideActivityRegistration(row.id, 'accepted')).rejects.toThrow('Unauthorized')
    await expect(getAdminActivityRegistrations(activity.id)).rejects.toThrow('Unauthorized')
  })

  it('reports a friendly error instead of throwing when the decision write fails', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      overrideAccess: true,
    })
    await signIn(admin)
    const updateSpy = vi.spyOn(payload, 'update').mockRejectedValueOnce(new Error('DB down'))
    try {
      expect(await decideActivityRegistration(row.id, 'accepted')).toEqual({
        ok: false,
        error: 'تعذر معالجة التسجيل',
      })
    } finally {
      updateSpy.mockRestore()
    }
  })

  it('does not let members forge attendance or a decision during registration', async () => {
    const activity = await createTestActivity(payload)
    const other = await createTestUser(payload, { email: 'forged-user@usthb.dz' })
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: other.id, activity: activity.id, attended: true, status: 'accepted' },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    expect(resolveRelationId(row.user)).toBe(member.id)
    expect(row.status).toBe('pending')
    expect(row.attended).toBe(false)
  })

  it('rejects member API writes against closed activities, decided rows and blank reasons', async () => {
    // Closed activity through the API: the hook is the guard (#154).
    const closed = await createTestActivity(payload, { openForRegistration: false })
    await expect(
      payload.create({
        collection: 'activity-registrations',
        data: { user: member.id, activity: closed.id },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow('التسجيل مغلق لهذا النشاط')

    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    // An admin decision moves the row; the same decision made by a member is
    // blocked by row-level access.
    await payload.update({
      collection: 'activity-registrations',
      id: row.id,
      data: { status: 'accepted' },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: row.id,
        data: { status: 'refused' },
        req: await boundReq(payload, admin),
        overrideAccess: false,
      }),
    ).rejects.toThrow('لا يمكن تغيير قرار التسجيل')

    const fresh = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: fresh.id,
        data: { status: 'refused' },
        req: await boundReq(payload, admin),
        overrideAccess: false,
      }),
    ).rejects.toThrow('سبب الرفض مطلوب')

    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { openForRegistration: false },
      overrideAccess: true,
    })
  })

  it('guards quota retries on the API surface', async () => {
    const activity = await createTestActivity(payload)
    // Fresh quota-rejected rows, seeded directly (the create hook is skipped
    // without a user), one per scenario.
    const quotaRow = async () =>
      payload.create({
        collection: 'activity-registrations',
        data: { user: member.id, activity: activity.id, status: 'quota_rejected' },
        overrideAccess: true,
      })

    const open = await createTestActivity(payload)

    // Someone else's row.
    const stranger = await createTestUser(payload, { email: 'quota-stranger@usthb.dz' })
    const strangerRow = await quotaRow()
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: strangerRow.id,
        data: { status: 'pending' },
        req: await boundReq(payload, stranger),
        overrideAccess: true,
        context: { retryQuota: true },
      }),
    ).rejects.toThrow('لا يمكن إعادة التسجيل')

    // Closed activity.
    await payload.update({
      collection: 'activities',
      id: open.id,
      data: { openForRegistration: false },
      overrideAccess: true,
    })
    const closedCheck = await payload.findByID({
      collection: 'activities',
      id: open.id,
      overrideAccess: true,
    })
    expect(closedCheck.openForRegistration).toBe(false)
    const closedRow = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: open.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: closedRow.id,
        data: { status: 'pending' },
        req: await boundReq(payload, member),
        overrideAccess: true,
        context: { retryQuota: true },
      }),
    ).rejects.toThrow('لا يمكن إعادة التسجيل')

    // Past the deadline.
    const deadlined = await createTestActivity(payload, {
      registrationDeadline: new Date(Date.now() - 60 * 60 * 1000),
    })
    const deadlinedRow = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: deadlined.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: deadlinedRow.id,
        data: { status: 'pending' },
        req: await boundReq(payload, member),
        overrideAccess: true,
        context: { retryQuota: true },
      }),
    ).rejects.toThrow('لا يمكن إعادة التسجيل')

    // Still full.
    const full = await createTestActivity(payload, { maxParticipants: 1, currentParticipants: 1 })
    const fullRow = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: full.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: fullRow.id,
        data: { status: 'pending' },
        req: await boundReq(payload, member),
        overrideAccess: true,
        context: { retryQuota: true },
      }),
    ).rejects.toThrow('لا يمكن إعادة التسجيل')

    // With every guard satisfied (open, future deadline, spare capacity) the
    // same retry goes through.
    const eligible = await createTestActivity(payload, {
      registrationDeadline: new Date(Date.now() + 60 * 60 * 1000),
      maxParticipants: 10,
    })
    const eligibleRow = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: eligible.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'activity-registrations',
      id: eligibleRow.id,
      data: { status: 'pending' },
      req: await boundReq(payload, member),
      overrideAccess: true,
      context: { retryQuota: true },
    })
    const after = await payload.findByID({
      collection: 'activity-registrations',
      id: eligibleRow.id,
      overrideAccess: true,
    })
    expect(after.status).toBe('pending')
  })

  it('frees a spot when a registration is withdrawn', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 1 })
    const req = await boundReq(payload, member)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req,
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(1)
    await payload.delete({
      collection: 'activity-registrations',
      id: row.id,
      req,
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(0)
  })

  it('tolerates a null participant counter and duplicates through the API', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 10 })
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { currentParticipants: null },
      overrideAccess: true,
    })

    // While the counter is still null, a seeded quota rejection retries
    // through the action, whose guard reads the null counter as zero.
    const waiter = await createTestUser(payload, { email: 'null-counter-waiter@usthb.dz' })
    await payload.create({
      collection: 'activity-registrations',
      data: { user: waiter.id, activity: activity.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await signIn(waiter)
    const retry = await registerActivityLogic(String(activity.id), {
      payload,
      user: waiter,
      req: await boundReq(payload, waiter),
    })
    expect(retry.success).toBe(true)
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(1)

    // A null counter also reads as zero in the counter write-back: reset it
    // to null so the member's create guard sees the empty form too.
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { currentParticipants: null },
      overrideAccess: true,
    })
    const req = await boundReq(payload, member)
    await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req,
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(1)

    // A second member API write is refused by the duplicate guard itself.
    await expect(
      payload.create({
        collection: 'activity-registrations',
        data: { user: member.id, activity: activity.id },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow('لديك بالفعل تسجيل في هذا النشاط')
  })

  it('leaves the counter alone when a decided registration is withdrawn', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 5 })
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    await payload.update({
      collection: 'activity-registrations',
      id: row.id,
      data: { status: 'refused', refusalReason: 'تعارض في الموعد' },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })
    // The refused row never occupied a spot, so withdrawing it changes nothing.
    await payload.delete({
      collection: 'activity-registrations',
      id: row.id,
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(0)
  })

  it('withdrawal reads a null counter as an empty activity', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { currentParticipants: null },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'activity-registrations',
      id: row.id,
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(0)
  })

  it('retries a quota rejection on an activity with no capacity limit', async () => {
    const activity = await createTestActivity(payload)
    await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id, status: 'quota_rejected' },
      overrideAccess: true,
    })
    await signIn(member)
    const retry = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(retry.success).toBe(true)
  })

  it('frees a spot when an accepted registration is withdrawn', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 1 })
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    await payload.update({
      collection: 'activity-registrations',
      id: row.id,
      data: { status: 'accepted' },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })
    await payload.delete({
      collection: 'activity-registrations',
      id: row.id,
      req: await boundReq(payload, member),
      overrideAccess: false,
    })
    expect(
      (await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true }))
        .currentParticipants,
    ).toBe(0)
  })
})

describe('New content and Email Digest', () => {
  it('fans new Activities and Articles out to all members, not staff, once on publish', async () => {
    const other = await createTestUser(payload, { email: 'another-member@usthb.dz' })
    const activity = await createTestActivity(payload, { title: 'دورة التجويد' })
    const article = await createTestArticle(payload, { title: 'آداب الصيام' })
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { title: 'آداب الصيام المحدثة' },
      overrideAccess: true,
    })
    for (const user of [member, other]) {
      const notices = await notificationsFor(user)
      expect(notices.docs.map((doc) => doc.type).sort()).toEqual(['activity', 'article'])
      expect(notices.docs.some((doc) => doc.link === `/user/activities/${activity.id}`)).toBe(true)
    }
    expect(
      (await notificationsFor(admin)).docs.some((notice) => notice.eventKey?.startsWith('bulk:')),
    ).toBe(false)
  })

  it('skips soft-deleted members during fan-out', async () => {
    const leaving = await createTestUser(payload, { email: 'leaving@usthb.dz' })
    const before = (await notificationsFor(leaving)).totalDocs
    await payload.update({
      collection: 'users',
      id: leaving.id,
      data: { deletedAt: new Date().toISOString() },
      overrideAccess: true,
    })
    await createTestActivity(payload, { title: 'نشاط بعد المغادرة' })
    expect((await notificationsFor(leaving)).totalDocs).toBe(before)
  })

  it('sends one on-demand digest to opted-in members only and does not resend it', async () => {
    const optedOut = await createTestUser(payload, { email: 'digest-opted-out@usthb.dz' })
    expect(optedOut.notificationPreferences?.bulkEmailDigest).toBe(false)
    await signIn(member)
    // Omitting the toggle resets it to its off-by-default value (CONTEXT.md).
    await updateNotificationPreferences({
      loanRequests: true,
      activityRegistrations: true,
      loanExtensions: true,
    })
    const untouched = await payload.findByID({
      collection: 'users',
      id: member.id,
      overrideAccess: true,
    })
    expect(untouched.notificationPreferences?.bulkEmailDigest).toBe(false)
    expect(await updateNotificationPreferences({ bulkEmailDigest: true })).toMatchObject({
      ok: true,
    })
    const optedIn = await payload.findByID({
      collection: 'users',
      id: member.id,
      overrideAccess: true,
    })
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      // A soft-deleted member still matching the opt-in filter is skipped.
      const gone = await createTestUser(payload, { email: 'digest-gone@usthb.dz' })
      await payload.update({
        collection: 'users',
        id: gone.id,
        data: { notificationPreferences: { bulkEmailDigest: true } },
        overrideAccess: true,
      })
      await createTestActivity(payload, { title: 'نشاط قبل المغادرة' })
      await payload.update({
        collection: 'users',
        id: gone.id,
        data: { deletedAt: new Date().toISOString() },
        overrideAccess: true,
      })
      await createTestActivity(payload, { title: 'ندوة علوم الحديث' })
      await createTestArticle(payload, { title: 'فضائل الذكر' })
      // A legacy bulk row without a link still renders in the digest.
      await payload.create({
        collection: 'notifications',
        data: {
          user: member.id,
          type: 'activity',
          title: 'سطر قديم',
          message: 'بلا رابط',
          eventKey: 'bulk:legacy:1',
        },
        overrideAccess: true,
      })
      await signIn(admin)
      expect(await sendBulkEmailDigest()).toMatchObject({ sent: 1 })
      expect(send).toHaveBeenCalledTimes(1)
      expect(send.mock.calls[0][0]).toMatchObject({ to: optedIn.email })
      const html = String((send.mock.calls[0][0] as { html: string }).html)
      expect(html).toContain('ندوة علوم الحديث')
      expect(html).toContain('فضائل الذكر')
      expect(html).toContain('سطر قديم')
      expect(html).toContain('نشاط قبل المغادرة')
      // The soft-deleted member's queued row never produced a second email:
      // one send for one live recipient, and nothing is sent twice.
      expect(await sendBulkEmailDigest()).toMatchObject({ sent: 0 })
      expect(send).toHaveBeenCalledTimes(1)
      const notices = await notificationsFor(member)
      expect(notices.docs.every((doc) => doc.emailSent)).toBe(true)
    } finally {
      send.mockRestore()
    }
  })

  it('does not include registration decisions in the bulk digest', async () => {
    await payload.update({
      collection: 'users',
      id: member.id,
      data: { notificationPreferences: { bulkEmailDigest: true } },
      overrideAccess: true,
    })
    const activity = await createTestActivity(payload, { title: 'دورة التجويد' })
    const registration = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'activity-registrations',
      id: registration.id,
      data: { status: 'refused', refusalReason: 'عدم اكتمال الشروط' },
      overrideAccess: true,
    })
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      await signIn(admin)
      expect(await sendBulkEmailDigest()).toMatchObject({ sent: 1 })
      const html = String((send.mock.calls[0][0] as { html: string }).html)
      expect(html).toContain('دورة التجويد')
      expect(html).not.toContain('رفض التسجيل')
    } finally {
      send.mockRestore()
    }
  })

  it('refuses non-admin digest requests and leaves unsent rows queued after an email error', async () => {
    await payload.update({
      collection: 'users',
      id: member.id,
      data: { notificationPreferences: { bulkEmailDigest: true } },
      overrideAccess: true,
    })
    await createTestArticle(payload, { title: 'أخلاق المسلم' })
    await signIn(member)
    await expect(sendBulkEmailDigest()).rejects.toThrow('Unauthorized')
    await signIn(admin)
    const send = vi
      .spyOn(payload, 'sendEmail')
      .mockRejectedValueOnce(new Error('SMTP down'))
      .mockResolvedValue(undefined as never)
    try {
      expect(await sendBulkEmailDigest()).toEqual({ sent: 0 })
      expect((await notificationsFor(member)).docs[0].emailSent).toBe(false)
      expect(await sendBulkEmailDigest()).toEqual({ sent: 1 })
      expect((await notificationsFor(member)).docs[0].emailSent).toBe(true)
    } finally {
      send.mockRestore()
    }
  })
})

describe('Admin notification triggers', () => {
  it('notifies admins about pending loans, extensions, reviews and verification/new members', async () => {
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    // New member and pending verification are emitted on creation.
    await createTestUser(payload, { email: 'new-member@usthb.dz' })
    const notices = await notificationsFor(admin)
    expect(notices.docs.some((doc) => doc.title.includes('إعارة'))).toBe(true)
    expect(notices.docs.some((doc) => doc.title.includes('عضو جديد'))).toBe(true)
    expect(notices.docs.some((doc) => doc.title.includes('توثيق'))).toBe(true)
  })

  it('notifies admins when a previously rejected verification is resubmitted', async () => {
    // A member without a fullName exercises the email fallback in the message.
    const applicant = await payload.create({
      collection: 'users',
      data: {
        email: 'resubmitted@usthb.dz',
        password: 'correct horse battery',
        role: 'user',
        consentGiven: true,
      },
      draft: false,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: applicant.id,
      data: { verificationStatus: 'rejected', verificationNote: 'بيانات ناقصة' },
      overrideAccess: true,
    })
    const before = (await notificationsFor(admin)).totalDocs
    await payload.update({
      collection: 'users',
      id: applicant.id,
      data: { verificationStatus: 'pending_verification' },
      overrideAccess: true,
    })
    const after = await notificationsFor(admin)
    expect(after.totalDocs).toBe(before + 1)
    expect(after.docs.some((notice) => notice.title.includes('توثيق'))).toBe(true)

    // The member hears about both outcomes in-app.
    const borrower = await payload.find({
      collection: 'notifications',
      where: { user: { equals: applicant.id } },
      overrideAccess: true,
    })
    expect(borrower.docs.some((notice) => notice.message.includes('بيانات ناقصة'))).toBe(true)
    await payload.update({
      collection: 'users',
      id: applicant.id,
      data: { verificationStatus: 'verified' },
      overrideAccess: true,
    })
    const verifiedNotices = await payload.find({
      collection: 'notifications',
      where: { user: { equals: applicant.id } },
      overrideAccess: true,
    })
    expect(verifiedNotices.docs.some((notice) => notice.title.includes('توثيق الحساب'))).toBe(true)
  })

  it('suppresses an admin category switched off without suppressing other categories', async () => {
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { notificationPreferences: { loanRequests: false } },
      overrideAccess: true,
    })
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    await createTestUser(payload, { email: 'newer-member@usthb.dz' })
    const notices = await notificationsFor(admin)
    expect(notices.docs.some((doc) => doc.title.includes('إعارة'))).toBe(false)
    expect(notices.docs.some((doc) => doc.title.includes('عضو جديد'))).toBe(true)
  })

  it('shows admin-only notifications in the admin Bell', async () => {
    await createTestUser(payload, { email: 'bell-member@usthb.dz' })
    await signIn(admin)
    const state = await getBellState()
    expect(state?.unreadCount).toBeGreaterThan(0)
    expect(state?.notifications.some((notice) => notice.title.includes('عضو جديد'))).toBe(true)
    // The updates page reads through the same admin-scoped queries.
    const inbox = await getNotifications({})
    expect(inbox.notifications.some((notice) => notice.title.includes('عضو جديد'))).toBe(true)
  })

  it('notifies about queued extensions and Reviews once, but never pages admins for auto-approvals', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
    // A waiter makes this extension need an admin decision: they borrow the
    // same book while it is out of copies, which queues them through the real
    // borrow seam.
    const waiter = await createTestUser(payload, {
      email: 'extension-waiter@usthb.dz',
      verified: true,
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: 0 },
      overrideAccess: true,
    })
    await borrowBookLogic(String(book.id), {
      payload,
      user: waiter,
      req: await boundReq(payload, waiter),
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: 1 },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: member.id, days: 2 },
      overrideAccess: true,
    })

    // An extension with an empty queue is auto-approved through the action:
    // no admin page, and the due date moves immediately.
    const freeBook = await createTestBook(payload)
    const freeLoan = await createTestLoan(payload, {
      book: freeBook.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
    const autoApproved = await requestLoanExtensionLogic(freeLoan.id, 2, {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(autoApproved.status).toBe('approved')

    const review = await createTestReview(payload, { book: book.id, user: member.id, rating: 5 })
    const notices = await notificationsFor(admin)
    expect(notices.docs.filter((notice) => notice.title.includes('تمديد')).length).toBe(1)
    expect(notices.docs.some((notice) => notice.title.includes('تقييم'))).toBe(true)

    // Review updates are edits, not new reviews: no second page.
    await payload.update({
      collection: 'reviews',
      id: review.id,
      data: { comment: 'تعديل' },
      overrideAccess: true,
    })
    expect(
      (await notificationsFor(admin)).docs.filter((n) => n.title.includes('تقييم')).length,
    ).toBe(1)
  })

  it('adds pickups due today and severe overdues once when an Admin reads the Bell', async () => {
    const book = await createTestBook(payload)
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupDate: new Date().toISOString(),
    })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    })
    await signIn(admin)
    const first = await getBellState()
    expect(first?.notifications.some((notice) => notice.title.includes('استلام'))).toBe(true)
    expect(first?.notifications.some((notice) => notice.title.includes('متأخرة بشدة'))).toBe(true)
    await getBellState()
    expect((await notificationsFor(admin)).totalDocs).toBe(2)
  })

  it('honours each stored Admin toggle at its own trigger', async () => {
    await payload.update({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
      data: {
        notificationPreferences: {
          loanRequests: false,
          loanExtensions: false,
          accountRequests: false,
          overdueReturns: false,
          newReviews: false,
          activityLogEvents: false,
        },
      },
    })
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    const pickedUp = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    })
    // A waiter keeps the extension queued, so the loanExtensions toggle (not
    // the auto-approval context) is what suppresses the page.
    const waiter = await createTestUser(payload, {
      email: 'toggle-waiter@usthb.dz',
      verified: true,
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: 0 },
      overrideAccess: true,
    })
    await borrowBookLogic(String(book.id), {
      payload,
      user: waiter,
      req: await boundReq(payload, waiter),
    })
    await payload.create({
      collection: 'loan-extensions',
      data: { loan: pickedUp.id, user: member.id, days: 2 },
      overrideAccess: true,
    })
    await createTestReview(payload, { book: book.id, user: member.id, rating: 4 })
    await createTestUser(payload, { email: 'toggles-member@usthb.dz' })
    await signIn(admin)
    await getBellState()
    expect((await notificationsFor(admin)).totalDocs).toBe(0)
  })

  it('does not page admins when an admin-only update touches a staff account', async () => {
    const before = (await notificationsFor(admin)).totalDocs
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { fullName: 'مسؤول محدث' },
      overrideAccess: true,
    })
    expect((await notificationsFor(admin)).totalDocs).toBe(before)
  })
})
