import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestActivity } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { getUserActivityRegistration, registerActivity, registerActivityLogic } from '@/features/activities/server/activities'
import type { User } from '@/payload-types'

let payload: Payload
let member: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { verified: true })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('registerActivityLogic', () => {
  it('refuses a closed activity', async () => {
    const activity = await createTestActivity(payload, { openForRegistration: false })

    const result = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('عذراً، التسجيل مغلق لهذا النشاط')
  })

  it('refuses when the registration deadline has passed', async () => {
    const activity = await createTestActivity(payload, {
      registrationDeadline: new Date(Date.now() - 60 * 60 * 1000),
    })

    const result = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('انتهى موعد التسجيل لهذا النشاط')
  })

  it('refuses when capacity is reached', async () => {
    const activity = await createTestActivity(payload, {
      maxParticipants: 2,
      currentParticipants: 2,
    })

    const result = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('عذراً، اكتمل الحد الأقصى للمشاركين')
  })

  it('accepts a registration with a future deadline and spare capacity', async () => {
    const activity = await createTestActivity(payload, {
      registrationDeadline: new Date(Date.now() + 60 * 60 * 1000),
      maxParticipants: 10,
    })

    const result = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))
    expect(result.success).toBe(true)
  })

  it('refuses a duplicate registration', async () => {
    const activity = await createTestActivity(payload)

    const first = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))
    expect(first.success).toBe(true)

    const second = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))
    expect(second.success).toBe(false)
    expect(second.message).toBe('لديك بالفعل تسجيل في هذا النشاط')
  })

  it('increments currentParticipants exactly once on the happy path', async () => {
    const activity = await createTestActivity(payload, { currentParticipants: 1 })

    const result = await registerActivityLogic(String(activity.id), await ctxFor(payload, member))

    expect(result.success).toBe(true)
    const after = await payload.findByID({ collection: 'activities', id: activity.id, overrideAccess: true })
    expect(after.currentParticipants).toBe(2)

    const registrations = await payload.find({
      collection: 'activity-registrations',
      where: { user: { equals: member.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(registrations.totalDocs).toBe(1)
    expect(registrations.docs[0].activity).toBe(activity.id)
    expect(registrations.docs[0].attended).toBe(false)
  })

  it('reports an error when the activity id does not exist', async () => {
    const result = await registerActivityLogic('99999999', await ctxFor(payload, member))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء التسجيل في النشاط')
  })
})

describe('registerActivity (wrapper)', () => {
  it('asks anonymous callers to log in', async () => {
    const result = await registerActivity('1')
    expect(result).toEqual({ success: false, message: 'يجب تسجيل الدخول أولاً' })
  })

  it('registers as the cookie user', async () => {
    const activity = await createTestActivity(payload)
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await registerActivity(String(activity.id))
    expect(result.success).toBe(true)
  })
})

describe('getUserActivityRegistration', () => {
  it('reports unregistered for anonymous callers', async () => {
    expect(await getUserActivityRegistration('1')).toEqual({ registered: false })
  })

  it('reports registered after registration', async () => {
    const activity = await createTestActivity(payload)
    await registerActivityLogic(String(activity.id), await ctxFor(payload, member))

    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))
    expect(await getUserActivityRegistration(String(activity.id))).toEqual({ registered: true })
  })
})

describe('activity registration access', () => {
  it('scopes rows to the owner and lets admin see all', async () => {
    const activity = await createTestActivity(payload)
    const req = await boundReq(payload, member)
    const registration = await payload.create({
      collection: 'activity-registrations',
      data: { user: member.id, activity: activity.id },
      req,
      overrideAccess: false,
    })

    const otherMember = await createTestUser(payload, { verified: true })
    const otherReq = await boundReq(payload, otherMember)
    const othersView = await payload.find({
      collection: 'activity-registrations',
      req: otherReq,
      overrideAccess: false,
    })
    expect(othersView.totalDocs).toBe(0)

    const admin = await createTestUser(payload, { role: 'admin' })
    const adminReq = await boundReq(payload, admin)
    const adminView = await payload.find({
      collection: 'activity-registrations',
      req: adminReq,
      overrideAccess: false,
    })
    expect(adminView.totalDocs).toBe(1)
    expect(String(adminView.docs[0].id)).toBe(String(registration.id))
  })
})
