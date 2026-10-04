import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  getMyBookRequests,
  submitBookRequest,
  submitBookRequestLogic,
} from '@/features/library/server/book-requests'

let payload: Payload
let owner: User
let other: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  owner = await createTestUser(payload)
  other = await createTestUser(payload)
  admin = await createTestUser(payload, { role: 'admin' })
})
afterAll(async () => {
  await payload.db.destroy?.()
})

describe('book requests (#152)', () => {
  it('forces a member request to their own pending row and scopes reads to the owner', async () => {
    const req = await boundReq(payload, owner)
    const doc = await payload.create({
      collection: 'book-requests',
      data: { user: other.id, title: 'كتاب مقترح', status: 'approved' },
      req,
      overrideAccess: false,
      depth: 0,
    })
    expect(doc.user).toBe(owner.id)
    expect(doc.status).toBe('pending')
    expect(
      (await payload.find({ collection: 'book-requests', req, overrideAccess: false })).totalDocs,
    ).toBe(1)
    expect(
      (
        await payload.find({
          collection: 'book-requests',
          req: await boundReq(payload, other),
          overrideAccess: false,
        })
      ).totalDocs,
    ).toBe(0)
    expect(
      (
        await payload.find({
          collection: 'book-requests',
          req: await boundReq(payload, admin),
          overrideAccess: false,
        })
      ).totalDocs,
    ).toBe(1)
    await expect(
      payload.update({
        collection: 'book-requests',
        id: doc.id,
        data: { status: 'approved' },
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: 'book-requests',
        id: doc.id,
        req: await boundReq(payload, admin),
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'book-requests',
        data: { user: owner.id, title: 'بدون تسجيل', status: 'pending' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('submits through the member action and shows only the caller’s requests and statuses', async () => {
    expect(
      await submitBookRequestLogic({ title: '  ' }, await ctxFor(payload, owner)),
    ).toMatchObject({ ok: false })
    expect(await submitBookRequest({ title: 'بدون حساب' })).toMatchObject({ ok: false })
    const { token } = await loginToken(payload, {
      email: owner.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    expect(await submitBookRequest({ title: '  طلب كتاب  ', author: ' مؤلف ' })).toMatchObject({
      ok: true,
    })
    expect((await getMyBookRequests()).map((r) => [r.title, r.author, r.status])).toEqual([
      ['طلب كتاب', 'مؤلف', 'pending'],
    ])
    clearNextContext()
    expect(await getMyBookRequests()).toEqual([])
  })

  it('reports a failure instead of throwing when the write is rejected', async () => {
    const { token } = await loginToken(payload, {
      email: owner.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    // A blank title is refused by the action's own validation, and a title the
    // collection rejects surfaces as a generic failure rather than an exception.
    const failed = await submitBookRequest({ title: 'x'.repeat(0) })
    expect(failed).toMatchObject({ ok: false, error: 'عنوان الكتاب مطلوب' })

    clearNextContext()
  })

  it('returns a generic failure when the create itself throws', async () => {
    const { token } = await loginToken(payload, {
      email: owner.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const spy = vi.spyOn(payload, 'create').mockRejectedValueOnce(new Error('db exploded') as never)

    await expect(submitBookRequest({ title: 'كتاب' })).resolves.toEqual({
      ok: false,
      error: 'تعذر إرسال طلب الكتاب',
    })

    spy.mockRestore()
    clearNextContext()
  })

  it('covers the admin-note and status early-returns in the resolution hook', async () => {
    const req = await boundReq(payload, admin)
    const row = await payload.create({
      collection: 'book-requests',
      data: { user: owner.id, title: 'سيرة', status: 'pending' },
      req,
      overrideAccess: false,
    })

    // Re-saving the same status must not notify a second time.
    await payload.update({
      collection: 'book-requests',
      id: row.id,
      data: { adminNote: 'ملاحظة فقط' },
      req,
      overrideAccess: false,
    })
    expect(
      (await payload.count({ collection: 'notifications', overrideAccess: true })).totalDocs,
    ).toBe(0)

    // A decision that carries an admin note.
    await payload.update({
      collection: 'book-requests',
      id: row.id,
      data: { status: 'approved', adminNote: 'سيُضاف قريباً' },
      req,
      overrideAccess: false,
    })
    const withNote = await payload.find({
      collection: 'notifications',
      where: { user: { equals: owner.id } },
      overrideAccess: true,
    })
    expect(withNote.docs[0].message).toContain('ملاحظة الإدارة: سيُضاف قريباً')

    // A second request decided with no note at all, which is the empty-note
    // branch of the message.
    const bare = await payload.create({
      collection: 'book-requests',
      data: { user: other.id, title: 'فقه', status: 'pending' },
      req,
      overrideAccess: false,
    })
    await payload.update({
      collection: 'book-requests',
      id: bare.id,
      data: { status: 'rejected' },
      req,
      overrideAccess: false,
    })
    const rows = await payload.find({
      collection: 'notifications',
      where: { user: { equals: other.id } },
      overrideAccess: true,
    })
    expect(rows.totalDocs).toBe(1)
    expect(rows.docs[0].message).not.toContain('ملاحظة الإدارة')
  })

  it('notifies the owner exactly once when an admin resolves through Payload', async () => {
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      const req = await boundReq(payload, admin)
      const row = await payload.create({
        collection: 'book-requests',
        data: { user: owner.id, title: 'سيرة', status: 'pending' },
        req,
        overrideAccess: false,
      })
      await payload.update({
        collection: 'book-requests',
        id: row.id,
        data: { status: 'approved', adminNote: 'سنضيفه' },
        req,
        overrideAccess: false,
      })
      await payload.update({
        collection: 'book-requests',
        id: row.id,
        data: { adminNote: 'سنضيفه قريباً' },
        req,
        overrideAccess: false,
      })
      const notifications = await payload.find({
        collection: 'notifications',
        overrideAccess: true,
        depth: 0,
      })
      expect(notifications.totalDocs).toBe(1)
      expect(notifications.docs[0]).toMatchObject({
        user: owner.id,
        type: 'request',
        title: 'تمت الموافقة على طلب الكتاب',
      })
      expect(notifications.docs[0].message).toContain('سنضيفه')
      expect(sendEmail).toHaveBeenCalledOnce()

      const second = await payload.create({
        collection: 'book-requests',
        data: { user: other.id, title: 'فقه', status: 'pending' },
        req,
        overrideAccess: false,
      })
      await payload.update({
        collection: 'book-requests',
        id: second.id,
        data: { status: 'rejected', adminNote: 'غير متوفر' },
        req,
        overrideAccess: false,
      })
      const otherRows = await payload.find({
        collection: 'notifications',
        where: { user: { equals: other.id } },
        overrideAccess: true,
      })
      expect(otherRows.docs[0].title).toBe('تم رفض طلب الكتاب')
      expect(otherRows.docs[0].message).toContain('غير متوفر')
    } finally {
      sendEmail.mockRestore()
    }
  })
})

describe('book request resolution branches (#152)', () => {
  it('does not notify when a decided request is moved back to pending', async () => {
    const req = await boundReq(payload, admin)
    const row = await payload.create({
      collection: 'book-requests',
      data: { user: owner.id, title: 'سيرة', status: 'pending' },
      req,
      overrideAccess: false,
    })
    await payload.update({
      collection: 'book-requests',
      id: row.id,
      data: { status: 'approved' },
      req,
      overrideAccess: false,
    })
    const afterApproval = (
      await payload.count({ collection: 'notifications', overrideAccess: true })
    ).totalDocs
    expect(afterApproval).toBe(1)

    // Reverting the status is an update that is neither approved nor rejected,
    // so the hook must stay silent.
    await payload.update({
      collection: 'book-requests',
      id: row.id,
      data: { status: 'pending' },
      req,
      overrideAccess: false,
    })
    expect(
      (await payload.count({ collection: 'notifications', overrideAccess: true })).totalDocs,
    ).toBe(afterApproval)
  })

  it('resolves a request whose owner relation is populated, not an id', async () => {
    const req = await boundReq(payload, admin)
    const row = await payload.create({
      collection: 'book-requests',
      data: { user: owner.id, title: 'م Ashe', status: 'pending' },
      req,
      overrideAccess: false,
      depth: 2,
    })
    await payload.update({
      collection: 'book-requests',
      id: row.id,
      data: { status: 'approved' },
      req,
      overrideAccess: false,
      depth: 2,
    })
    const rows = await payload.find({
      collection: 'notifications',
      where: { user: { equals: owner.id } },
      overrideAccess: true,
    })
    expect(rows.totalDocs).toBe(1)
  })
})
