'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import {
  acceptLoan,
  acceptLoanLogic,
  markLoanReturned as libraryMarkLoanReturned,
  refuseLoan,
} from '@/features/library'
import type { Loan } from '@/payload-types'
import type { LoanStatus } from '@/utils/constants/loans'

const revalidateAdminLoans = () => {
  revalidatePath('/admin-panel/dashboard')
  revalidatePath('/admin-panel/loans')
}

export interface AdminLoansStats {
  stats: {
    totalLoans: number
    pendingLoans: number
    extensionRequests: number
    overdueLoans: number
  }
}

export async function getAdminLoansStats(): Promise<AdminLoansStats> {
  const { payload, user } = await getAdminCtx()

  const [totalLoans, pendingLoans, extensionRequests, overdueLoans] = await Promise.all([
    payload.count({
      collection: 'loans',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'loans',
      where: { status: { equals: 'pending' } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'loan-extensions',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'loans',
      where: {
        and: [
          { status: { in: ['accepted', 'picked_up'] } },
          { dueDate: { less_than: new Date().toISOString() } },
        ],
      },
      overrideAccess: false,
      user,
    }),
  ])

  return {
    stats: {
      totalLoans: totalLoans.totalDocs,
      pendingLoans: pendingLoans.totalDocs,
      extensionRequests: extensionRequests.totalDocs,
      overdueLoans: overdueLoans.totalDocs,
    },
  }
}

export interface LoansPageResult {
  docs: Loan[]
  totalPages: number
  totalDocs: number
}

export async function getLoansByStatus(
  status: LoanStatus,
  page = 1,
  limit = 20,
): Promise<LoansPageResult> {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'loans',
    where: { status: { equals: status } },
    sort: '-createdAt',
    page,
    limit,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return {
    docs: result.docs as Loan[],
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  }
}

export async function addLoan(bookId: number, userId: number) {
  const ctx = await getAdminCtx()

  let book
  try {
    book = await ctx.payload.findByID({
      collection: 'books',
      id: Number(bookId),
      req: ctx.req,
      overrideAccess: false,
      depth: 0,
    })
  } catch {
    return { ok: false, error: 'الكتاب غير موجود' }
  }
  if ((book.availableBooks ?? 0) <= 0) {
    return { ok: false, error: 'لا توجد نسخ متاحة حالياً' }
  }

  const loan = await ctx.payload.create({
    collection: 'loans',
    data: {
      book: book.id,
      user: Number(userId),
      status: 'pending',
      loanDate: new Date().toISOString(),
    },
    req: ctx.req,
    overrideAccess: false,
    user: ctx.user,
  })

  const result = await acceptLoanLogic(loan.id, ctx)
  if (!result.success) {
    // Best effort: roll back the loan we just created if the accept fails.
    await ctx.payload.delete({
      collection: 'loans',
      id: loan.id,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    })
    return { ok: false, error: result.message }
  }

  revalidateAdminLoans()
  return { ok: true, loanId: result.loanId }
}

export async function approveLoan(loanId: number) {
  const result = await acceptLoan(loanId)
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}

export async function rejectLoan(loanId: number, reason?: string) {
  const result = await refuseLoan(loanId, reason || 'رفض الطلب من قبل الإدارة')
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}

// The `loans` afterChange hook releases the copy and promotes the waitlist
// head inside the same transaction; this wrapper only owns the transition.
export async function markLoanReturned(loanId: number) {
  const result = await libraryMarkLoanReturned(loanId)
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}
