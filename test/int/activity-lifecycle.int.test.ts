import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { boundReq, getTestPayload, resetDatabase } from '../setup-integration'
import { createTestActivity } from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  registerActivityLogic,
  cancelActivityRegistration,
  getUserActivityRegistration,
} from '@/features/activities/server/activities'
import {
  markActivityAttendance,
  decideActivityRegistration,
} from '@/features/admin/server/activity-registrations'
import { leaveActivityFeedback, getActivityFeedback } from '@/features/activities/server/feedback'
import { completeFinishedRegistrations } from '@/features/activities/server/completion'
import { ACTIVITY_COMPLETION_QUEUE } from '@/features/activities/server/jobs'

let payload: Payload
let member: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'activity-member@usthb.dz', verified: true })
  admin = await createTestUser(payload, { email: 'activity-admin@usthb.dz', role: 'admin' })
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

describe('Activity lifecycle', () => {
  it('lets a member cancel after the joining deadline but before the activity starts and frees the spot', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 1 })
    const registration = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(registration.success).toBe(true)
    const waiting = await createTestUser(payload, { email: 'activity-waiting@usthb.dz' })
    const full = await registerActivityLogic(String(activity.id), {
      payload,
      user: waiting,
      req: await boundReq(payload, waiting),
    })
    expect(full.success).toBe(false)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { registrationDeadline: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    await signIn(member)
    expect(
      await cancelActivityRegistration((registration.registration as { id: number }).id),
    ).toEqual({
      ok: true,
    })
    const updated = await payload.findByID({
      collection: 'activities',
      id: activity.id,
      overrideAccess: true,
    })
    expect(updated.currentParticipants).toBe(0)
    const retry = await registerActivityLogic(String(activity.id), {
      payload,
      user: waiting,
      req: await boundReq(payload, waiting),
    })
    // Registration deadline still gates joining, even though cancellation is allowed until start.
    expect(retry.success).toBe(false)
  })

  it('refuses cancellation once the activity starts', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { startDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await cancelActivityRegistration(row.id)).toMatchObject({
      ok: false,
      error: expect.stringContaining('بدأ'),
    })
  })

  it('reopens a full activity for a quota-rejected member when a registration is cancelled', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 1 })
    const other = await createTestUser(payload, { email: 'next-activity@usthb.dz' })
    const first = await registerActivityLogic(String(activity.id), {
      payload,
      user: member,
      req: await boundReq(payload, member),
    })
    expect(first.success).toBe(true)
    expect(
      (
        await registerActivityLogic(String(activity.id), {
          payload,
          user: other,
          req: await boundReq(payload, other),
        })
      ).success,
    ).toBe(false)
    await signIn(member)
    expect(await cancelActivityRegistration((first.registration as { id: number }).id)).toEqual({
      ok: true,
    })
    expect(
      (
        await registerActivityLogic(String(activity.id), {
          payload,
          user: other,
          req: await boundReq(payload, other),
        })
      ).success,
    ).toBe(true)
  })

  it('allows an admin to mark attendance and records the action in the admin log', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await signIn(admin)
    expect(await markActivityAttendance(row.id, true)).toEqual({ ok: true })
    expect(
      (
        await payload.findByID({
          collection: 'activity-registrations',
          id: row.id,
          overrideAccess: true,
        })
      ).attended,
    ).toBe(true)
    expect((await payload.find({ collection: 'logs', overrideAccess: true })).docs).toEqual(
      expect.arrayContaining([expect.objectContaining({ targetId: String(row.id) })]),
    )
  })

  it('completes registrations only after the activity has ended', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    const req = await boundReq(payload, member)
    expect(await completeFinishedRegistrations({ payload, req, user: member })).toBe(0)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    expect(
      await completeFinishedRegistrations({
        payload,
        req: await boundReq(payload, member),
        user: member,
      }),
    ).toBe(1)
    expect(
      (
        await payload.findByID({
          collection: 'activity-registrations',
          id: row.id,
          overrideAccess: true,
        })
      ).status,
    ).toBe('completed')
  })

  it('runs completion automatically through the scheduled jobs queue', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    const registration = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await payload.jobs.queue({
      queue: ACTIVITY_COMPLETION_QUEUE,
      task: 'completeActivityRegistrations',
      input: {},
    })
    const result = await payload.jobs.run({ queue: ACTIVITY_COMPLETION_QUEUE, limit: 1 })
    expect(result).toBeDefined()
    expect(
      (
        await payload.findByID({
          collection: 'activity-registrations',
          id: registration.id,
          overrideAccess: true,
        })
      ).status,
    ).toBe('completed')
  })

  it('does not grant participation to a request nobody decided before the event ended', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'pending' },
      overrideAccess: true,
    })
    expect(await completeFinishedRegistrations({ payload, req: await boundReq(payload) })).toBe(1)
    expect(
      (
        await payload.findByID({
          collection: 'activity-registrations',
          id: row.id,
          overrideAccess: true,
        })
      ).status,
    ).toBe('refused')
    await signIn(member)
    expect(await leaveActivityFeedback(activity.id, 'positive')).toMatchObject({ ok: false })
  })

  it('reminds an accepted member of an upcoming scheduled session only once', async () => {
    const activity = await createTestActivity(payload)
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { startDate: soon, schedules: [{ dateAndTime: soon }] },
      overrideAccess: true,
    })
    const registration = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    for (let i = 0; i < 2; i++) {
      await payload.jobs.queue({
        queue: ACTIVITY_COMPLETION_QUEUE,
        task: 'completeActivityRegistrations',
        input: {},
      })
      await payload.jobs.run({ queue: ACTIVITY_COMPLETION_QUEUE, limit: 1 })
    }
    const reminders = await payload.find({
      collection: 'notifications',
      where: { eventKey: { equals: `activity-reminder:${registration.id}:${soon}` } },
      overrideAccess: true,
    })
    expect(reminders.totalDocs).toBe(1)
  })

  it('accepts one feedback after completion, permits revision, and denies a second member-owned row', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: {
        startDate: new Date(Date.now() - 86_400_000).toISOString(),
        endDate: new Date(Date.now() - 60_000).toISOString(),
      },
      overrideAccess: true,
    })
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await leaveActivityFeedback(activity.id, 'positive', 'مفيد')).toMatchObject({ ok: true })
    expect(await leaveActivityFeedback(activity.id, 'negative', 'يحتاج تحسين')).toMatchObject({
      ok: true,
    })
    const feedback = await payload.find({ collection: 'activity-feedback', overrideAccess: true })
    expect(feedback.totalDocs).toBe(1)
    expect(feedback.docs[0]).toMatchObject({ sentiment: 'negative', comment: 'يحتاج تحسين' })
    expect(row.attended).toBe(false)
    await expect(
      payload.create({
        collection: 'activity-feedback',
        data: { activity: activity.id, user: member.id, sentiment: 'positive' },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const other = await createTestUser(payload, { email: 'private-feedback@usthb.dz' })
    expect(
      (
        await payload.find({
          collection: 'activity-feedback',
          req: await boundReq(payload, other),
          overrideAccess: false,
        })
      ).totalDocs,
    ).toBe(0)
  })

  it('rejects feedback before the activity ends and from someone not registered', async () => {
    const activity = await createTestActivity(payload)
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await leaveActivityFeedback(activity.id, 'positive')).toMatchObject({ ok: false })
    const other = await createTestUser(payload, { email: 'unregistered-feedback@usthb.dz' })
    await signIn(other)
    expect(await leaveActivityFeedback(activity.id, 'positive')).toMatchObject({ ok: false })
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    expect(await leaveActivityFeedback(activity.id, 'positive')).toMatchObject({ ok: false })
  })

  it('blocks another member from cancelling or marking attendance', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    const other = await createTestUser(payload, { email: 'other-activity@usthb.dz' })
    await signIn(other)
    expect(await cancelActivityRegistration(row.id)).toMatchObject({ ok: false })
    await expect(markActivityAttendance(row.id, true)).rejects.toThrow('Unauthorized')
  })
})

describe('Registration and feedback guards on the collections themselves', () => {
  it('refuses registration through the API once the activity has started', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { startDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    expect(
      (
        await registerActivityLogic(String(activity.id), {
          payload,
          user: member,
          req: await boundReq(payload, member),
        })
      ).success,
    ).toBe(false)
    await expect(
      payload.create({
        collection: 'activity-registrations',
        data: { activity: activity.id, user: member.id },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('refuses a cancellation the collection guard catches after the activity started', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { startDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: row.id,
        data: { status: 'cancelled' },
        req: await boundReq(payload, member),
        overrideAccess: true,
        context: { cancelRegistration: true },
      }),
    ).rejects.toThrow('بدأ النشاط')
  })

  it('refuses an automated completion for a registration already settled', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'cancelled' },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'activity-registrations',
        id: row.id,
        data: { status: 'completed' },
        req: await boundReq(payload, member),
        overrideAccess: true,
        context: { completeActivity: true },
      }),
    ).rejects.toThrow('لا يمكن تغيير قرار التسجيل')
  })

  it('refuses feedback written straight through the collection, and a rewrite of its owner', async () => {
    const activity = await createTestActivity(payload)
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'activity-feedback',
        data: { activity: activity.id, sentiment: 'positive', user: member.id },
        req: await boundReq(payload, member),
        overrideAccess: false,
      }),
    ).rejects.toThrow('قبل انتهائه')

    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    const feedback = await payload.create({
      collection: 'activity-feedback',
      data: { activity: activity.id, sentiment: 'positive', user: member.id },
      overrideAccess: true,
    })
    const other = await createTestUser(payload, { email: 'feedback-owner@usthb.dz' })
    for (const change of [
      { user: other.id },
      { activity: (await createTestActivity(payload)).id },
    ]) {
      await expect(
        payload.update({
          collection: 'activity-feedback',
          id: feedback.id,
          data: change,
          req: await boundReq(payload, member),
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    }
  })

  it('rejects an unusable sentiment and a failing write, and reads the aggregate for a visitor', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await leaveActivityFeedback(activity.id, 'sideways' as 'positive')).toEqual({
      ok: false,
      error: 'التقييم غير صالح',
    })
    expect(await leaveActivityFeedback(9999, 'positive')).toMatchObject({ ok: false })

    await payload.create({
      collection: 'activity-feedback',
      data: { activity: activity.id, sentiment: 'negative', user: member.id },
      overrideAccess: true,
    })
    expect(await getActivityFeedback(activity.id)).toMatchObject({
      positive: 0,
      negative: 1,
      mine: expect.objectContaining({ sentiment: 'negative' }),
    })
    clearNextContext()
    expect(await getActivityFeedback(activity.id)).toMatchObject({
      positive: 0,
      negative: 1,
      mine: null,
    })
  })

  it('reminds a session with no schedule from the start date, and skips far-off sessions', async () => {
    const activity = await createTestActivity(payload)
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { startDate: soon, schedules: [] },
      overrideAccess: true,
    })
    const registration = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    const distant = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: distant.id,
      data: { startDate: new Date(Date.now() + 5 * 86_400_000).toISOString(), schedules: [] },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: distant.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await payload.jobs.queue({
      queue: ACTIVITY_COMPLETION_QUEUE,
      task: 'completeActivityRegistrations',
      input: {},
    })
    await payload.jobs.run({ queue: ACTIVITY_COMPLETION_QUEUE, limit: 1 })
    const reminded = await payload.find({
      collection: 'notifications',
      where: { eventKey: { equals: `activity-reminder:${registration.id}:${soon}` } },
      overrideAccess: true,
    })
    expect(reminded.totalDocs).toBe(1)
  })

  it('reports a friendly error when attendance targets an undecided registration', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'pending' },
      overrideAccess: true,
    })
    await signIn(admin)
    expect(await markActivityAttendance(row.id, true)).toMatchObject({
      ok: false,
      error: 'لا يمكن تسجيل الحضور لهذا التسجيل',
    })
    expect(await markActivityAttendance(9999, true)).toMatchObject({
      ok: false,
      error: 'تعذر تحديث الحضور',
    })
  })

  it('also clears attendance when an admin withdraws it', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted', attended: true },
      overrideAccess: true,
    })
    await signIn(admin)
    expect(await markActivityAttendance(row.id, false)).toEqual({ ok: true })
    expect(
      (
        await payload.findByID({
          collection: 'activity-registrations',
          id: row.id,
          overrideAccess: true,
        })
      ).attended,
    ).toBe(false)
  })

  it('releases the spot only when an admin deletes a registration that held one', async () => {
    const activity = await createTestActivity(payload, { maxParticipants: 3 })
    const pending = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'pending' },
      overrideAccess: true,
    })
    const cancelled = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: admin.id, status: 'cancelled' },
      overrideAccess: true,
    })
    const participants = async () =>
      (
        await payload.findByID({
          collection: 'activities',
          id: activity.id,
          overrideAccess: true,
        })
      ).currentParticipants
    expect(await participants()).toBe(1)

    await payload.delete({
      collection: 'activity-registrations',
      id: cancelled.id,
      overrideAccess: true,
    })
    expect(await participants()).toBe(1)

    await signIn(admin)
    expect(await decideActivityRegistration(pending.id, 'accepted')).toEqual({ ok: true })
    expect(await participants()).toBe(1)

    await payload.delete({
      collection: 'activity-registrations',
      id: pending.id,
      overrideAccess: true,
    })
    expect(await participants()).toBe(0)
  })

  it('refuses a cancellation the member has already resolved, and an anonymous one', async () => {
    const activity = await createTestActivity(payload)
    const row = await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'cancelled' },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await cancelActivityRegistration(row.id)).toMatchObject({
      ok: false,
      error: 'لا يمكن إلغاء هذا التسجيل',
    })
    expect(await getUserActivityRegistration(String(activity.id))).toEqual({ registered: false })
    clearNextContext()
    expect(await cancelActivityRegistration(row.id)).toEqual({
      ok: false,
      error: 'يجب تسجيل الدخول أولاً',
    })
    expect(await leaveActivityFeedback(activity.id, 'positive')).toEqual({
      ok: false,
      error: 'يجب تسجيل الدخول أولاً',
    })
  })

  it('refuses a direct feedback write by someone who never registered', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    const stranger = await createTestUser(payload, { email: 'stranger-feedback@usthb.dz' })
    await expect(
      payload.create({
        collection: 'activity-feedback',
        data: { activity: activity.id, sentiment: 'positive', user: stranger.id },
        req: await boundReq(payload, stranger),
        overrideAccess: false,
      }),
    ).rejects.toThrow('للمسجلين')
  })

  it('stores a blank comment as no comment', async () => {
    const activity = await createTestActivity(payload)
    await payload.update({
      collection: 'activities',
      id: activity.id,
      data: { endDate: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: activity.id, user: member.id, status: 'accepted' },
      overrideAccess: true,
    })
    await signIn(member)
    expect(await leaveActivityFeedback(activity.id, 'positive', '   ')).toEqual({ ok: true })
    expect(
      (await payload.find({ collection: 'activity-feedback', overrideAccess: true })).docs[0]
        .comment,
    ).toBeNull()
  })
})
