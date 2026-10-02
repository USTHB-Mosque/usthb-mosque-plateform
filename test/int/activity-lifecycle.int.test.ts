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
} from '@/features/activities/server/activities'
import { markActivityAttendance } from '@/features/admin/server/activity-registrations'
import { leaveActivityFeedback } from '@/features/activities/server/feedback'
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
