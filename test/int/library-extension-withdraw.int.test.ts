import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE } from '@/shared/lib/loan-gates'
import {
  withdrawLoanExtension,
  withdrawLoanExtensionLogic,
} from '@/features/library/server/loan-extensions'

import type { Payload } from 'payload'
import type { Loan, LoanExtension, User } from '@/payload-types'

// One shared instance for the whole file; destroyed exactly once at the end —
// destroying it per describe would strand every later operation on a dead pool.
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

async function extensionAfter(extensionId: number): Promise<LoanExtension> {
  return payload.findByID({
    collection: 'loan-extensions',
    id: extensionId,
    overrideAccess: true,
    depth: 0,
  }) as Promise<LoanExtension>
}

async function loanAfter(loanId: number) {
  return payload.findByID({ collection: 'loans', id: loanId, overrideAccess: true, depth: 0 })
}

async function notificationsFor(userId: number) {
  const rows = await payload.find({
    collection: 'notifications',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    overrideAccess: true,
    depth: 0,
  })
  return rows.docs
}

/** A picked-up loan for `member` — the only state an extension may be asked on. */
async function pickedUpLoan(days = 14): Promise<Loan> {
  const book = await createTestBook(payload, { available: 1, total: 1 })
  await payload.update({
    collection: 'books',
    id: book.id,
    data: { availableBooks: 0 },
    overrideAccess: true,
  })
  const loan = (await createTestLoan(payload, {
    book: book.id,
    user: member.id,
    status: 'picked_up',
    pickupCode: `مك-01/${book.id}/26`,
    dueDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  })) as Loan
  return loan
}

/** A `pending` extension request on `loan` for `member`. */
async function pendingExtension(loan: Loan, days = 7): Promise<LoanExtension> {
  return (await payload.create({
    collection: 'loan-extensions',
    data: { loan: loan.id, user: member.id, days },
    overrideAccess: true,
  })) as LoanExtension
}

/** Same row, forced into a state D6 says is no longer the member's to undo. */
async function decidedExtension(
  loan: Loan,
  status: 'approved' | 'refused' | 'withdrawn',
): Promise<LoanExtension> {
  const extension = await pendingExtension(loan)
  await payload.update({
    collection: 'loan-extensions',
    id: extension.id,
    data: { status },
    overrideAccess: true,
  })
  return extension as LoanExtension
}

describe('withdrawLoanExtensionLogic (#153, D6)', () => {
  it('refuses to withdraw a request the caller does not hold', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan()
    const extension = await pendingExtension(loan)

    const result = await withdrawLoanExtensionLogic(
      extension.id,
      await ctxFor(payload, otherMember),
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكنك سحب طلب تمديد لست مالكه')
    expect((await extensionAfter(extension.id)).status).toBe('pending')
  })

  it.each(['approved', 'refused', 'withdrawn'] as const)(
    'refuses a %s request — there is nothing left to undo',
    async (status) => {
      sendEmailSpy()
      const loan = await pickedUpLoan()
      const extension = await decidedExtension(loan, status)

      const result = await withdrawLoanExtensionLogic(extension.id, await ctxFor(payload, member))

      expect(result.success).toBe(false)
      expect(result.message).toBe(EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE)
      expect((await extensionAfter(extension.id)).status).toBe(status)
    },
  )

  it('withdraws a pending request without moving the due date or telling anyone', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan()
    const extension = await pendingExtension(loan)
    const dueBefore = (await loanAfter(loan.id)).dueDate
    // Creating the request already paged the administration once; a withdrawal
    // must not page them again.
    const memberBefore = (await notificationsFor(member.id)).length
    const adminBefore = (await notificationsFor(admin.id)).length

    const result = await withdrawLoanExtensionLogic(extension.id, await ctxFor(payload, member))

    expect(result).toEqual({
      success: true,
      message: 'تم سحب طلب التمديد',
      extensionId: extension.id,
      status: 'withdrawn',
    })

    const after = await extensionAfter(extension.id)
    expect(after.status).toBe('withdrawn')
    // Nothing was ever granted, so nothing may be given back — D6's whole point.
    // Both dates were stamped on the request, and a withdrawal leaves them as
    // they were: only an approval ever moves the loan's own due date.
    expect(new Date((await loanAfter(loan.id)).dueDate!).getTime()).toBe(
      new Date(dueBefore!).getTime(),
    )
    expect(new Date(after.originalDueDate!).getTime()).toBe(new Date(dueBefore!).getTime())
    expect(new Date(after.newDueDate!).getTime()).toBeGreaterThan(
      new Date(after.originalDueDate!).getTime(),
    )

    // The member pressed the button: no notice to them, and the administration
    // sees it leave the queue through the audit row rather than a second ping.
    expect((await notificationsFor(member.id)).length).toBe(memberBefore)
    expect((await notificationsFor(admin.id)).length).toBe(adminBefore)
    expect(adminBefore).toBe(1)
  })

  it('writes an audit row naming the actor, the request and the loan it belongs to', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan()
    const extension = await pendingExtension(loan)

    await withdrawLoanExtensionLogic(extension.id, await ctxFor(payload, member))

    // There is no admin list screen for extension requests, so this row is the
    // only trace the desk will ever see of a withdrawal.
    const logs = await payload.find({
      collection: 'logs',
      where: { action: { equals: 'extension_withdrawn' } },
      overrideAccess: true,
      depth: 0,
    })
    expect(logs.totalDocs).toBe(1)
    expect(logs.docs[0].actor).toBe(member.id)
    expect(logs.docs[0].targetType).toBe('loan-extension')
    expect(logs.docs[0].targetId).toBe(String(extension.id))
    expect(logs.docs[0].metadata).toEqual({ loan: loan.id })
  })

  it('reports a generic failure when the request does not exist', async () => {
    const result = await withdrawLoanExtensionLogic(99999999, await ctxFor(payload, member))
    expect(result).toEqual({
      success: false,
      message: 'حدث خطأ أثناء معالجة طلب التمديد',
    })
  })
})

describe('withdrawLoanExtension (cookie flow)', () => {
  it('asks anonymous callers to log in', async () => {
    expect(await withdrawLoanExtension('1')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
  })

  it("withdraws the caller's own request as the cookie member", async () => {
    sendEmailSpy()
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const loan = await pickedUpLoan()
    const extension = await pendingExtension(loan)

    const result = await withdrawLoanExtension(extension.id)

    expect(result.success).toBe(true)
    expect((await extensionAfter(extension.id)).status).toBe('withdrawn')
  })
})

describe('loan-extensions afterChange guard (withdrawn)', () => {
  it('treats a withdrawal as the member acting, not as a decision to announce', async () => {
    sendEmailSpy()
    const loan = await pickedUpLoan()
    const extension = await pendingExtension(loan)

    await payload.update({
      collection: 'loan-extensions',
      id: extension.id,
      data: { status: 'withdrawn' },
      overrideAccess: true,
    })

    // The hook notifies on `approved`/`refused` only; `withdrawn` must fall
    // through it untouched, exactly like the reopened-pending case in #152.
    const after = await extensionAfter(extension.id)
    expect(after.status).toBe('withdrawn')
    expect(await notificationsFor(member.id)).toHaveLength(0)
  })
})
