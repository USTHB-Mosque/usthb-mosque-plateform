import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import type { LoanExtension, User } from '@/payload-types'
import {
  decideLoanExtension,
  decideLoanExtensionLogic,
  requestLoanExtension,
  requestLoanExtensionLogic,
} from '@/features/library/server/loan-extensions'

let payload: Payload
let member: User
let otherMember: User
let admin: User

const sendEmailSpy = () => vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { verified: true })
  otherMember = await createTestUser(payload, { email: 'other-borrower@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

/** A picked-up loan for `member` with a due date `days` from now. */
async function pickedUpLoan(days: number) {
  const book = await createTestBook(payload, { available: 1, total: 1 })
  await payload.update({
    collection: 'books',
    id: book.id,
    data: { availableBooks: 0 },
    overrideAccess: true,
  })
  return createTestLoan(payload, {
    book: book.id,
    user: member.id,
    status: 'picked_up',
    pickupCode: `مك-01/${book.id}/26`,
    dueDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  })
}

async function extensionAfter(extensionId: number): Promise<LoanExtension> {
  return payload.findByID({
    collection: 'loan-extensions',
    id: extensionId,
    overrideAccess: true,
    depth: 0,
  })
}

describe('requestLoanExtensionLogic', () => {
  it('refuses a loan the caller does not hold', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: otherMember.id,
      status: 'picked_up',
    })

    const result = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكن تمديد إعارة لست مالكها')
  })

  it('refuses a loan that is not picked up', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('يمكن طلب التمديد للكتب التي تم أخذها فقط')
  })

  it.each([0, 22, 1.5])('refuses an invalid extension length (%d days)', async (days) => {
    const loan = await pickedUpLoan(14)

    const result = await requestLoanExtensionLogic(loan.id, days, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('يمكن التمديد من يوم واحد إلى 21 يوماً')
  })

  it('auto-approves and moves the due date when the queue is empty', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)

    const result = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    expect(result.success).toBe(true)
    expect(result.status).toBe('approved')
    const extension = await extensionAfter(result.extensionId!)
    expect(extension.status).toBe('approved')
    // Both dates recorded: original stays, new moves by the requested days.
    expect(new Date(extension.originalDueDate as string).getTime()).toBeGreaterThan(
      Date.now() + 13.5 * 24 * 60 * 60 * 1000,
    )
    expect(new Date(extension.newDueDate as string).getTime()).toBeGreaterThan(
      Date.now() + 20.5 * 24 * 60 * 60 * 1000,
    )
    // The loan's due date moved.
    const freshLoan = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(new Date(freshLoan.dueDate as string).toISOString()).toBe(
      new Date(extension.newDueDate as string).toISOString(),
    )

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.type).toBe('extension')
    expect(notifications.docs[0]?.title).toBe('تمت الموافقة على التمديد')
  })

  it('stays pending for an admin when the book has a waitlist', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })

    const result = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    expect(result.success).toBe(true)
    expect(result.status).toBe('pending')
    const extension = await extensionAfter(result.extensionId!)
    expect(extension.status).toBe('pending')

    // The due date did not move while an admin must decide.
    const freshLoan = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(new Date(freshLoan.dueDate as string).getTime()).toBeGreaterThan(
      Date.now() + 13.5 * 24 * 60 * 60 * 1000,
    )
    expect(new Date(freshLoan.dueDate as string).getTime()).toBeLessThan(
      Date.now() + 14.5 * 24 * 60 * 60 * 1000,
    )
  })

  it('refuses a second pending extension for the same loan', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    // Queue the book so the first request stays pending.
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })

    const first = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))
    expect(first.success).toBe(true)

    const second = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))
    expect(second.success).toBe(false)
    expect(second.message).toBe('لديك بالفعل طلب تمديد قيد المراجعة لهذه الإعارة')
  })

  it('reports an error when the loan does not exist', async () => {
    const result = await requestLoanExtensionLogic(99999999, 7, await ctxFor(payload, member))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء معالجة طلب التمديد')
  })

  it('reports an error when the extension does not exist', async () => {
    const result = await decideLoanExtensionLogic(
      99999999,
      'approved',
      await ctxFor(payload, admin),
    )
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء معالجة طلب التمديد')
  })
})

describe('decideLoanExtensionLogic', () => {
  it('refuses a non-admin actor', async () => {
    const loan = await pickedUpLoan(14)
    // Queue the book so the request stays pending.
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const result = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))
    expect(result.status).toBe('pending')

    const decision = await decideLoanExtensionLogic(
      result.extensionId!,
      'approved',
      await ctxFor(payload, member),
    )

    expect(decision.success).toBe(false)
    expect(decision.message).toBe('غير مصرح لك بتنفيذ هذا الإجراء')
  })

  it('refuses an extension that was already decided', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    // Queue the book so the request stays pending for the admin.
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const request = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))
    expect(request.status).toBe('pending')

    const first = await decideLoanExtensionLogic(
      request.extensionId!,
      'approved',
      await ctxFor(payload, admin),
    )
    expect(first.success).toBe(true)

    const second = await decideLoanExtensionLogic(
      request.extensionId!,
      'refused',
      await ctxFor(payload, admin),
    )

    expect(second.success).toBe(false)
    expect(second.message).toBe('تمت معالجة طلب التمديد مسبقاً')
  })

  it('approves: moves the loan due date, records both dates and notifies', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const request = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))
    expect(request.status).toBe('pending')

    const decision = await decideLoanExtensionLogic(
      request.extensionId!,
      'approved',
      await ctxFor(payload, admin),
      'نظراً لعدم وجود مستعيرين آخرين',
    )

    expect(decision.success).toBe(true)
    const extension = await extensionAfter(request.extensionId!)
    expect(extension.status).toBe('approved')
    expect(extension.adminResponse).toBe('نظراً لعدم وجود مستعيرين آخرين')

    const freshLoan = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(new Date(freshLoan.dueDate as string).toISOString()).toBe(
      new Date(extension.newDueDate as string).toISOString(),
    )

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.title).toBe('تمت الموافقة على التمديد')
  })

  it('refuses: keeps the due date and notifies with the admin response', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const request = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    const decision = await decideLoanExtensionLogic(
      request.extensionId!,
      'refused',
      await ctxFor(payload, admin),
      'الكتاب مطلوب',
    )

    expect(decision.success).toBe(true)
    expect(decision.status).toBe('refused')
    const extension = await extensionAfter(request.extensionId!)
    expect(extension.status).toBe('refused')
    expect(extension.adminResponse).toBe('الكتاب مطلوب')

    const freshLoan = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(new Date(freshLoan.dueDate as string).getTime()).toBeGreaterThan(
      Date.now() + 13.5 * 24 * 60 * 60 * 1000,
    )

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.title).toBe('تم رفض طلب التمديد')
    expect(notifications.docs[0]?.message).toContain('الكتاب مطلوب')
  })

  it('refuses without an admin response and notifies plainly', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan(14)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const request = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    const decision = await decideLoanExtensionLogic(
      request.extensionId!,
      'refused',
      await ctxFor(payload, admin),
    )

    expect(decision.success).toBe(true)
    const extension = await extensionAfter(request.extensionId!)
    expect(extension.status).toBe('refused')

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.title).toBe('تم رفض طلب التمديد')
    expect(notifications.docs[0]?.message).toContain('تم رفض طلب تمديد إعارة')
  })
})

describe('loan-extensions collection guard (REST surface)', () => {
  it('stamps the borrower from the loan, ignoring a lying client user', async () => {
    const loan = await pickedUpLoan(14)

    const extension = await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: admin.id, days: 7 },
      req: await boundReq(payload, member),
      overrideAccess: false,
      depth: 0,
    })

    expect(String(extension.user)).toBe(String(member.id))
    expect(extension.status).toBe('pending')
  })

  it('throws when the loan is not picked up', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { loan: loan.id, user: member.id, days: 7 },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('يمكن طلب التمديد للكتب التي تم أخذها فقط')
  })

  it('throws on an out-of-range days value', async () => {
    const loan = await pickedUpLoan(14)

    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { loan: loan.id, user: member.id, days: 30 },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('يمكن التمديد من يوم واحد إلى 21 يوماً')
  })

  it('throws on zero or missing days', async () => {
    const loan = await pickedUpLoan(14)

    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { loan: loan.id, user: member.id, days: 0 },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('يمكن التمديد من يوم واحد إلى 21 يوماً')

    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { loan: loan.id, user: member.id, days: undefined as unknown as number },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('يمكن التمديد من يوم واحد إلى 21 يوماً')
  })

  it('throws on a second pending extension bypassing the action', async () => {
    const loan = await pickedUpLoan(14)

    await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: member.id, days: 7 },
      req: await boundReq(payload, member),
      overrideAccess: false,
      depth: 0,
    })

    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { loan: loan.id, user: member.id, days: 7 },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('لديك بالفعل طلب تمديد قيد المراجعة لهذه الإعارة')
  })

  it('falls back to now for the original due date when the loan has none', async () => {
    const loan = await pickedUpLoan(14)
    await payload.update({
      collection: 'loans',
      id: loan.id,
      data: { dueDate: null },
      overrideAccess: true,
    })

    const extension = await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: member.id, days: 1 },
      req: await boundReq(payload, member),
      overrideAccess: false,
      depth: 0,
    })

    expect(extension.originalDueDate).toBeTruthy()
  })

  it('returns data untouched when the loan id is missing', async () => {
    await expect(
      payload.create({
        collection: 'loan-extensions',
        data: { user: member.id, days: 7 } as never,
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow()
  })
})

describe('extension wrappers (cookie flows)', () => {
  it('asks anonymous callers to log in', async () => {
    expect(await requestLoanExtension('1', 7)).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
    expect(await decideLoanExtension('1', 'approved')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
  })

  it('requests an auto-approved extension as the cookie member', async () => {
    sendEmailSpy()
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const loan = await pickedUpLoan(14)

    const result = await requestLoanExtension(loan.id, 7)

    expect(result.success).toBe(true)
    expect(result.status).toBe('approved')
  })

  it('decides a pending extension as the cookie admin', async () => {
    sendEmailSpy()
    const { token } = await loginToken(payload, {
      email: admin.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const loan = await pickedUpLoan(14)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: loan.book, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    const request = await requestLoanExtensionLogic(loan.id, 7, await ctxFor(payload, member))

    const decision = await decideLoanExtension(request.extensionId!, 'approved')

    expect(decision.success).toBe(true)
    expect((await extensionAfter(request.extensionId!)).status).toBe('approved')
  })
})
