import { describe, expect, it, vi, beforeEach } from 'vitest'

const getStaffCtx = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('./ctx', () => ({
  getStaffCtx: (...args: unknown[]) => getStaffCtx(...args),
}))

vi.mock('./logs', () => ({ writeLog: vi.fn() }))

const {
  getAdminActivitiesStats,
  createActivity,
  updateActivity,
  getAdminActivity,
  deleteActivity,
  bulkDeleteActivities,
} = await import('./activities')

type PayloadStub = {
  create?: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
  findByID?: ReturnType<typeof vi.fn>
  delete?: ReturnType<typeof vi.fn>
  count?: ReturnType<typeof vi.fn>
}

function staffMock(
  payload: PayloadStub = {},
  user: { id: number; role: string } = { id: 2, role: 'admin' },
) {
  getStaffCtx.mockResolvedValue({ payload, user })
}

function activityFormData(overrides: Record<string, string | null> = {}) {
  const fd = new FormData()
  fd.set('title', 'دورة فقهية')
  fd.set('type', 'fiqh')
  fd.set('shortDescription', 'وصف مختصر')
  fd.set('longDescription', JSON.stringify({ root: { children: [] } }))
  fd.set('benefits', JSON.stringify([{ name: 'فائدة 1' }]))
  fd.set('targetAudience', JSON.stringify([{ name: 'الطلاب' }]))
  fd.set('schedules', JSON.stringify([{ dateAndTime: '2026-03-01T10:00:00.000Z' }]))
  fd.set('location', 'قاعة المحاضرات')
  fd.set('supervisor', 'د. محمد')
  fd.set('openForRegistration', 'true')
  fd.set('registrationDeadline', '2026-02-20T10:00:00.000Z')
  fd.set('startDate', '2026-03-01T10:00:00.000Z')
  fd.set('maxParticipants', '30')
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) fd.delete(key)
    else fd.set(key, value)
  }
  return fd
}

function pngFile(): File {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new File([Buffer.from(base64, 'base64')], 'image.png', { type: 'image/png' })
}

beforeEach(() => {
  getStaffCtx.mockReset()
})

describe('features/admin/server/activities.ts', () => {
  describe('getAdminActivitiesStats', () => {
    it('returns the aggregated counts', async () => {
      const count = vi
        .fn()
        .mockResolvedValueOnce({ totalDocs: 8 })
        .mockResolvedValueOnce({ totalDocs: 5 })
        .mockResolvedValueOnce({ totalDocs: 3 })
        .mockResolvedValueOnce({ totalDocs: 2 })
      staffMock({ count })

      const { stats } = await getAdminActivitiesStats()

      expect(stats).toEqual({
        totalActivities: 8,
        upcomingActivities: 5,
        completedActivities: 3,
        openForRegistrationActivities: 2,
      })
      expect(count).toHaveBeenCalledTimes(4)
    })
  })

  describe('createActivity', () => {
    it('uploads the image and creates the activity', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 11 })
      staffMock({ create })
      const fd = activityFormData()
      fd.set('image', pngFile())

      const result = await createActivity(fd)

      expect(result).toEqual({ ok: true, activityId: 11 })
      expect(create).toHaveBeenCalledTimes(2)
      expect(create).toHaveBeenNthCalledWith(2, {
        collection: 'activities',
        data: expect.objectContaining({
          title: 'دورة فقهية',
          type: 'fiqh',
          openForRegistration: true,
          registrationDeadline: '2026-02-20T10:00:00.000Z',
          startDate: '2026-03-01T10:00:00.000Z',
          maxParticipants: 30,
          image: 99,
        }),
        req: expect.any(Object),
        overrideAccess: false,
      })
    })

    it('treats missing registration fields as closed and unset', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 12 })
      staffMock({ create })
      const fd = activityFormData({
        openForRegistration: 'false',
        registrationDeadline: null,
        startDate: null,
        maxParticipants: null,
      })
      fd.set('image', pngFile())

      const result = await createActivity(fd)

      expect(result).toEqual({ ok: true, activityId: 12 })
      const data = create.mock.calls[1][0].data
      expect(data.openForRegistration).toBe(false)
      expect(data.registrationDeadline).toBeUndefined()
      expect(data.startDate).toBe('')
      expect(data.maxParticipants).toBeUndefined()
    })

    it('treats missing or malformed array fields as empty', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 13 })
      staffMock({ create })
      const fd = activityFormData({ benefits: null, targetAudience: null, schedules: null })
      fd.set('image', pngFile())

      const result = await createActivity(fd)

      expect(result).toEqual({ ok: true, activityId: 13 })
      const data = create.mock.calls[1][0].data
      expect(data.benefits).toEqual([])
      expect(data.targetAudience).toEqual([])
      expect(data.schedules).toEqual([])
    })

    it('returns an empty array when an array field is JSON without an array', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 14 })
      staffMock({ create })
      const fd = activityFormData({ benefits: '{}' })
      fd.set('image', pngFile())

      const result = await createActivity(fd)

      expect(result).toEqual({ ok: true, activityId: 14 })
      expect(create.mock.calls[1][0].data.benefits).toEqual([])
    })

    it('throws when the activity has no image', async () => {
      staffMock({})
      const fd = activityFormData()

      await expect(createActivity(fd)).rejects.toThrow('صورة النشاط مطلوبة')
    })

    it('treats missing location and supervisor as unset', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 15 })
      staffMock({ create })
      const fd = activityFormData({ location: null, supervisor: null })
      fd.set('image', pngFile())

      const result = await createActivity(fd)

      expect(result).toEqual({ ok: true, activityId: 15 })
      const data = create.mock.calls[1][0].data
      expect(data.location).toBeUndefined()
      expect(data.supervisor).toBeUndefined()
    })

    it('rejects an activity without a long description', async () => {
      staffMock({})
      const fd = activityFormData({ longDescription: null })
      fd.set('image', pngFile())

      await expect(createActivity(fd)).rejects.toThrow()
    })
  })

  describe('updateActivity', () => {
    it('updates the activity without touching the image', async () => {
      const update = vi.fn().mockResolvedValue({ id: 21 })
      staffMock({ update })

      const result = await updateActivity(21, activityFormData())

      expect(result).toEqual({ ok: true, activityId: 21 })
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'activities',
          id: 21,
          data: expect.not.objectContaining({ image: expect.anything() }),
        }),
      )
    })

    it('uploads and attaches a new image when provided', async () => {
      const create = vi.fn().mockResolvedValue({ id: 77 })
      const update = vi.fn().mockResolvedValue({ id: 21 })
      staffMock({ create, update })
      const fd = activityFormData()
      fd.set('image', pngFile())

      await updateActivity(21, fd)

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'media' }))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'activities',
          id: 21,
          data: expect.objectContaining({ image: 77 }),
        }),
      )
    })
  })

  describe('getAdminActivity', () => {
    it('returns the activity found by id', async () => {
      const doc = { id: 7, title: 'نشاط' }
      staffMock({ findByID: vi.fn().mockResolvedValue(doc) })

      const result = await getAdminActivity(7)

      expect(result).toBe(doc)
    })
  })

  describe('deleteActivity', () => {
    it('returns a friendly error when the activity lookup fails', async () => {
      staffMock({ findByID: vi.fn().mockRejectedValue(new Error('missing')) })
      await expect(deleteActivity(404)).resolves.toEqual({
        ok: false,
        error: expect.stringContaining('حذف'),
      })
    })

    it('deletes the activity', async () => {
      const deleteFn = vi.fn().mockResolvedValue({})
      staffMock({ findByID: vi.fn().mockResolvedValue({ id: 7, title: 'نشاط' }), delete: deleteFn })

      const result = await deleteActivity(7)

      expect(result).toEqual({ ok: true })
      expect(deleteFn).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'activities', id: 7, overrideAccess: false }),
      )
    })

    it('returns a friendly error when the delete fails', async () => {
      staffMock({
        findByID: vi.fn().mockResolvedValue({ id: 7, title: 'نشاط' }),
        delete: vi.fn().mockRejectedValue(new Error('fk constraint')),
      })

      const result = await deleteActivity(7)

      expect(result).toEqual({ ok: false, error: expect.stringContaining('حذف') })
    })
  })

  describe('bulkDeleteActivities', () => {
    it('returns early for an empty selection', async () => {
      const deleteFn = vi.fn()
      staffMock({ delete: deleteFn })

      const result = await bulkDeleteActivities([])

      expect(result).toEqual({ ok: true, count: 0 })
      expect(deleteFn).not.toHaveBeenCalled()
    })

    it('deletes the selected activities and reports the count', async () => {
      const deleteFn = vi.fn().mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }], errors: [] })
      staffMock({ delete: deleteFn })

      const result = await bulkDeleteActivities([1, 2])

      expect(result).toEqual({ ok: true, count: 2 })
      expect(deleteFn).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'activities',
          where: { id: { in: [1, 2] } },
          overrideAccess: false,
        }),
      )
    })

    it('returns ok false when some deletes fail', async () => {
      staffMock({ delete: vi.fn().mockResolvedValue({ docs: [], errors: [{ id: 2 }] }) })

      const result = await bulkDeleteActivities([1, 2])

      expect(result).toEqual({ ok: false, count: 0 })
    })
  })
})
