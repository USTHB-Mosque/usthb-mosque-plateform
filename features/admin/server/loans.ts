'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction, type LogActionValue } from './logs-core'
import {
  acceptLoan,
  acceptLoanLogic,
  markLoanPickedUp as libraryMarkLoanPickedUp,
  markLoanReturned as libraryMarkLoanReturned,
  refuseLoan,
} from '@/features/library'
import { createNotification } from '@/features/notifications'
import { formatArabicDate } from '@/shared/lib/dates'
import type { Payload, Where } from 'payload'
import type { Book, Loan, User } from '@/payload-types'
import type { LoanStatus } from '@/utils/constants/loans'

const revalidateAdminLoans = () => {
  revalidatePath('/admin-panel/dashboard')
  revalidatePath('/admin-panel/loans')
}

/** Writes a loan-transition log line, resolving the book title when possible. */
async function writeLoanLog(
  payload: Payload,
  user: User,
  loanId: number,
  action: LogActionValue,
  describe: (title: string) => string,
): Promise<void> {
  let title = ''
  try {
    const loan = await payload.findByID({
      collection: 'loans',
      id: Number(loanId),
      depth: 1,
      overrideAccess: false,
      user,
    })
    if (loan && typeof loan.book === 'object' && loan.book && 'title' in loan.book) {
      title = (loan.book as Book).title
    }
  } catch {
    // Fall through with an empty title rather than failing the transition.
  }
  await writeLog(payload, user, {
    action,
    targetType: 'loan',
    targetId: loanId,
    message: describe(title),
  })
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

export interface AdminLoansQuery {
  page?: number
  limit?: number
  search?: string
  overdue?: 'overdue' | 'not-overdue'
}

// Payload cannot `contains` through relationship fields, so a free-text search
// first resolves matching users/books to ids, then filters loans on those ids.
async function resolveSearchMatches(
  payload: Payload,
  user: User,
  search: string,
): Promise<{ userIds: number[]; bookIds: number[] }> {
  const [users, books] = await Promise.all([
    payload.find({
      collection: 'users',
      where: {
        or: [
          { email: { contains: search } },
          { fullName: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      },
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'books',
      where: {
        or: [
          { title: { contains: search } },
          { code: { contains: search } },
          { author: { contains: search } },
        ],
      },
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ])

  return {
    userIds: users.docs.map((doc) => doc.id),
    bookIds: books.docs.map((doc) => doc.id),
  }
}

export async function getLoansByStatus(
  status: LoanStatus,
  params: AdminLoansQuery = {},
): Promise<LoansPageResult> {
  const { payload, user } = await getAdminCtx()

  const andFilters: Where[] = [{ status: { equals: status } }]

  if (params.overdue) {
    andFilters.push(
      params.overdue === 'overdue'
        ? { dueDate: { less_than: new Date().toISOString() } }
        : { dueDate: { greater_than: new Date().toISOString() } },
    )
  }

  if (params.search) {
    const { userIds, bookIds } = await resolveSearchMatches(payload, user, params.search)
    const or: Where[] = []
    // `id: { in: [...] }` is ignored by the Postgres adapter on the primary
    // key, so borrower matches filter on the relationship value path instead.
    if (userIds.length > 0) or.push({ 'user.id': { in: userIds } })
    if (bookIds.length > 0) or.push({ book: { in: bookIds } })
    andFilters.push(or.length > 0 ? { or } : { id: { equals: -1 } })
  }

  const result = await payload.find({
    collection: 'loans',
    where: { and: andFilters },
    sort: '-createdAt',
    page: params.page || 1,
    limit: params.limit || 20,
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

export async function addLoan(
  bookId: number,
  userId: number,
  opts?: { pickupDate?: string; dueDate?: string },
) {
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
      ...(opts?.pickupDate ? { pickupDate: opts.pickupDate } : {}),
      ...(opts?.dueDate ? { dueDate: opts.dueDate } : {}),
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
  await writeLog(ctx.payload, ctx.user, {
    action: LogAction.LoanApproved,
    targetType: 'loan',
    targetId: loan.id,
    message: `قبل طلب إعارة للكتاب: ${book.title}`,
  })
  return { ok: true, loanId: result.loanId }
}

export async function approveLoan(loanId: number) {
  const result = await acceptLoan(loanId)
  if (!result.success) return { ok: false, error: result.message }
  const ctx = await getAdminCtx()
  await writeLoanLog(ctx.payload, ctx.user, loanId, LogAction.LoanApproved, (title) =>
    title ? `قبل طلب إعارة: ${title}` : `قبل طلب إعارة #${loanId}`,
  )
  revalidateAdminLoans()
  return { ok: true }
}

export async function rejectLoan(loanId: number, reason?: string) {
  const result = await refuseLoan(loanId, reason || 'رفض الطلب من قبل الإدارة')
  if (!result.success) return { ok: false, error: result.message }
  const ctx = await getAdminCtx()
  await writeLoanLog(ctx.payload, ctx.user, loanId, LogAction.LoanRefused, (title) =>
    title ? `رفض طلب إعارة: ${title}` : `رفض طلب إعارة #${loanId}`,
  )
  revalidateAdminLoans()
  return { ok: true }
}

// The `loans` afterChange hook releases the copy and promotes the waitlist
// head inside the same transaction; this wrapper only owns the transition.
export async function markLoanReturned(loanId: number) {
  const result = await libraryMarkLoanReturned(loanId)
  if (!result.success) return { ok: false, error: result.message }
  const ctx = await getAdminCtx()
  await writeLoanLog(ctx.payload, ctx.user, loanId, LogAction.LoanReturned, (title) =>
    title ? `استلم كتاباً: ${title}` : `استلم إعارة #${loanId}`,
  )
  revalidateAdminLoans()
  return { ok: true }
}

export async function markLoanPickedUp(loanId: number) {
  const result = await libraryMarkLoanPickedUp(loanId)
  if (!result.success) return { ok: false, error: result.message }
  const ctx = await getAdminCtx()
  await writeLoanLog(ctx.payload, ctx.user, loanId, LogAction.LoanPickedUp, (title) =>
    title ? `سلّم كتاباً: ${title}` : `سلّم إعارة #${loanId}`,
  )
  revalidateAdminLoans()
  return { ok: true }
}

/**
 * Sends an in-app notification and email reminder tailored to where the loan
 * sits: remind an accepted borrower to pick up, or a borrower holding the
 * book to return it before/after the due date.
 */
export async function sendLoanReminder(loanId: number) {
  const ctx = await getAdminCtx()

  let loan
  try {
    loan = (await ctx.payload.findByID({
      collection: 'loans',
      id: Number(loanId),
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
    })) as Loan | undefined
  } catch {
    return { ok: false, error: 'الإعارة غير موجودة' }
  }
  if (!loan) return { ok: false, error: 'الإعارة غير موجودة' }

  const book = (typeof loan.book === 'object' ? loan.book : undefined) as Book | undefined
  const bookTitle = book?.title ?? ''

  let title: string
  let message: string
  if (loan.status === 'accepted') {
    title = 'تذكير باستلام الكتاب'
    message = `تم تذكيرك باستلام كتاب «${bookTitle}». رمز الاستلام: ${loan.pickupCode ?? ''}. يرجى التوجه للمكتبة قبل انتهاء مدة الاستلام.`
  } else if (loan.status === 'picked_up') {
    title = 'تذكير بإرجاع الكتاب'
    const due = loan.dueDate ? formatArabicDate(loan.dueDate) : ''
    message = `تم تذكيرك بإرجاع كتاب «${bookTitle}» في الموعد المحدد${due ? ` (${due})` : ''}.`
  } else {
    return { ok: false, error: 'لا يمكن إرسال تذكير لهذه الحالة' }
  }

  await createNotification({
    req: ctx.req,
    user: (typeof loan.user === 'object' ? loan.user.id : loan.user) as number,
    type: 'loan',
    title,
    message,
    link: '/user/my-loans',
    email: true,
  })

  return { ok: true }
}
