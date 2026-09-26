import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  bulkDeleteActivities,
  createActivity,
  deleteActivity,
  getAdminActivitiesStats,
  getAdminActivity,
  updateActivity,
} from '@/features/admin/server/activities'

import type { Payload } from 'payload'
import type { Activity, User } from '@/payload-types'

let payload: Payload
let admin: User

function longDescriptionState(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'rtl',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          direction: null,
          format: '',
          indent: 0,
          children: [
            { type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style: '', text },
          ],
        },
      ],
    },
  }
}

function activityFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('title', 'برنامج العشر الأواخر')
  fd.set('type', 'sirah')
  fd.set('shortDescription', 'برنامج اعتكاف ليالي العشر الأواخر')
  fd.set('longDescription', JSON.stringify(longDescriptionState('تفاصيل البرنامج')))
  fd.set(
    'benefits',
    JSON.stringify([{ name: 'إحياء سنة الاعتكاف' }, { name: 'تقوية الصلة بالله' }]),
  )
  fd.set('targetAudience', JSON.stringify([{ name: 'جميع الطلاب' }]))
  fd.set('schedules', JSON.stringify([{ dateAndTime: '2099-03-20T21:00:00.000Z' }]))
  fd.set('location', 'مصلى الجامعة')
  fd.set('supervisor', 'الإدارة')
  fd.set('openForRegistration', 'true')
  fd.set('registrationDeadline', '2099-03-10T21:00:00.000Z')
  fd.set('startDate', '2099-03-20T21:00:00.000Z')
  fd.set('maxParticipants', '50')
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value)
  return fd
}

function imageFile() {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new File([Buffer.from(base64, 'base64')], 'activity.png', { type: 'image/png' })
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@activities-int.usthb.dz' })

  const { token } = await loginToken(payload, {
    email: admin.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))

  vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function activityById(activityId: number, depth = 0): Promise<Activity> {
  return payload.findByID({ collection: 'activities', id: activityId, overrideAccess: true, depth })
}

describe('getAdminActivitiesStats', () => {
  it('aggregates total, upcoming, completed and open-for-registration activities', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())
    await createActivity(fd)

    const pastFd = activityFormData({
      startDate: '2000-01-01T10:00:00.000Z',
      openForRegistration: 'false',
    })
    pastFd.set('image', imageFile())
    await createActivity(pastFd)

    const stats = await getAdminActivitiesStats()

    expect(stats.stats).toEqual({
      totalActivities: 2,
      upcomingActivities: 1,
      completedActivities: 1,
      openForRegistrationActivities: 1,
    })
  })

  it('starts at zero on an empty database', async () => {
    const stats = await getAdminActivitiesStats()
    expect(stats.stats).toEqual({
      totalActivities: 0,
      upcomingActivities: 0,
      completedActivities: 0,
      openForRegistrationActivities: 0,
    })
  })
})

describe('createActivity', () => {
  it('creates an activity with all fields', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())

    const result = await createActivity(fd)

    expect(result.ok).toBe(true)
    const activityId = (result as { activityId: number }).activityId
    const activity = await activityById(activityId, 1)
    expect(activity.title).toBe('برنامج العشر الأواخر')
    expect(activity.type).toBe('sirah')
    expect(activity.location).toBe('مصلى الجامعة')
    expect(activity.supervisor).toBe('الإدارة')
    expect(activity.openForRegistration).toBe(true)
    expect(activity.maxParticipants).toBe(50)
    expect(activity.benefits?.map((b) => b.name)).toEqual([
      'إحياء سنة الاعتكاف',
      'تقوية الصلة بالله',
    ])
    expect(activity.targetAudience?.map((a) => a.name)).toEqual(['جميع الطلاب'])
    expect(activity.schedules).toHaveLength(1)
    expect((activity.image as { id: number } | undefined)?.id).toBeTruthy()
  })

  it('creates an activity with closed registration and no participants limit', async () => {
    const fd = activityFormData({
      openForRegistration: 'false',
      maxParticipants: '',
      registrationDeadline: '',
    })
    fd.set('image', imageFile())

    const result = await createActivity(fd)

    const activityId = (result as { activityId: number }).activityId
    const activity = await activityById(activityId)
    expect(activity.openForRegistration).toBe(false)
    expect(activity.maxParticipants).toBeNull()
    expect(activity.registrationDeadline).toBeNull()
  })

  it('rejects creation without an image', async () => {
    await expect(createActivity(activityFormData())).rejects.toThrow('صورة النشاط مطلوبة')
  })
})

describe('updateActivity', () => {
  it('replaces the image when a new file is uploaded', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())
    const created = (await createActivity(fd)) as { activityId: number }
    const oldImageId = (await activityById(created.activityId, 1)).image as { id: number }

    const updateFd = activityFormData({ title: 'عنوان معدل' })
    updateFd.set('image', imageFile())
    const result = await updateActivity(created.activityId, updateFd)

    expect(result.ok).toBe(true)
    const after = await activityById(created.activityId, 1)
    expect(after.title).toBe('عنوان معدل')
    expect((after.image as { id: number }).id).not.toBe(oldImageId.id)
  })

  it('keeps the image and updates arrays when no new file is sent', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())
    const created = (await createActivity(fd)) as { activityId: number }
    const oldImageId = (await activityById(created.activityId, 1)).image as { id: number }

    const updateFd = activityFormData({
      schedules: JSON.stringify([
        { dateAndTime: '2099-03-20T21:00:00.000Z' },
        { dateAndTime: '2099-03-27T21:00:00.000Z' },
      ]),
      openForRegistration: 'false',
    })
    const result = await updateActivity(created.activityId, updateFd)

    expect(result.ok).toBe(true)
    const after = await activityById(created.activityId, 1)
    expect(after.schedules).toHaveLength(2)
    expect(after.openForRegistration).toBe(false)
    expect((after.image as { id: number }).id).toBe(oldImageId.id)
  })
})

describe('getAdminActivity', () => {
  it('returns the activity with populated relations', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())
    const created = (await createActivity(fd)) as { activityId: number }

    const activity = await getAdminActivity(created.activityId)

    expect(activity.id).toBe(created.activityId)
    expect((activity.image as { id: number } | undefined)?.id).toBeTruthy()
  })
})

describe('deleteActivity', () => {
  it('deletes the activity entirely', async () => {
    const fd = activityFormData()
    fd.set('image', imageFile())
    const created = (await createActivity(fd)) as { activityId: number }

    const result = await deleteActivity(created.activityId)

    expect(result.ok).toBe(true)
    await expect(
      payload.findByID({ collection: 'activities', id: created.activityId, overrideAccess: true }),
    ).rejects.toThrow()
  })
})

describe('bulkDeleteActivities', () => {
  it('deletes the selected activities together', async () => {
    const firstFd = activityFormData({ title: 'نشاط أول' })
    firstFd.set('image', imageFile())
    const first = (await createActivity(firstFd)) as { activityId: number }

    const secondFd = activityFormData({ title: 'نشاط ثان' })
    secondFd.set('image', imageFile())
    const second = (await createActivity(secondFd)) as { activityId: number }

    const result = await bulkDeleteActivities([first.activityId, second.activityId])

    expect(result).toEqual({ ok: true, count: 2 })
    await expect(
      payload.findByID({ collection: 'activities', id: first.activityId, overrideAccess: true }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'activities', id: second.activityId, overrideAccess: true }),
    ).rejects.toThrow()
  })

  it('does nothing for an empty selection', async () => {
    const result = await bulkDeleteActivities([])

    expect(result).toEqual({ ok: true, count: 0 })
  })
})

describe('permissions', () => {
  it('rejects activity creation without a staff session', async () => {
    clearNextContext()
    setNextHeaders({})

    await expect(createActivity(activityFormData())).rejects.toThrow('Unauthorized')
  })

  it('rejects activity creation for a regular member', async () => {
    const member = await createTestUser(payload, { role: 'user' })
    const { token } = await loginToken(payload, {
      email: member.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    await expect(createActivity(activityFormData())).rejects.toThrow('Unauthorized')
  })
})
