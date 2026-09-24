'use server'
import { getPayloadWithUser, isAdmin, type ActionCtx } from '@/shared/lib/auth'
import type { Payload } from 'payload'
import type { Loan, User } from '@/payload-types'

import { createNotification } from '@/features/notifications'
import { PROMOTED_USER_ID } from '@/utils/constants/loans'
import { formatArabicDate } from '@/shared/lib/dates'

export interface LoanActionResult {
  success: boolean
  message: string
  loanId?: number
}

const NOT_LOGGED_IN = 'يجب تسجيل الدخول أولاً'
const NOT_ADMIN = 'غير مصرح لك بتنفيذ هذا الإجراء'
const GENERIC_ERROR = 'حدث خطأ أثناء تحديث حالة الإعارة'

export type TransitionCtx = ActionCtx

/** Reads the loan and its book title for a transition's checks and messages. */
async function readLoanAndBook(ctx: TransitionCtx, loanId: number | string) {
  const loan = (await ctx.payload.findByID({
    collection: 'loans',
    id: loanId,
    req: ctx.req,
    overrideAccess: false,
    depth: 0,
  })) as Loan

  const book = await ctx.payload.findByID({
    collection: 'books',
    id: loan.book as number,
    req: ctx.req,
    overrideAccess: false,
    depth: 0,
  })

  return { loan, bookTitle: book.title }
}

/**
 * Accepts a pending loan (#19): reserves the copy and stamps the pickup code,
 * date and hour. The lifecycle hook on `loans` performs the stamps and the
 * reservation; this transition owns the actor and state checks and the
 * notification.
 */
export async function acceptLoanLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const { loan, bookTitle } = await readLoanAndBook(ctx, loanId)

    if (loan.status !== 'pending') {
      return { success: false, message: 'لا يمكن قبول طلب ليس في حالة الانتظار' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'accepted' },
      req: ctx.req,
      overrideAccess: false,
    })

    const fresh = (await ctx.payload.findByID({
      collection: 'loans',
      id: loanId,
      req: ctx.req,
      overrideAccess: false,
      depth: 0,
    })) as Loan

    await createNotification({
      req: ctx.req,
      user: fresh.user as number,
      type: 'loan',
      title: 'تم قبول طلب الإعارة',
      message: `تم قبول طلب استعارة «${bookTitle}». رمز الاستلام: ${fresh.pickupCode}. تاريخ الاستلام: ${formatArabicDate(fresh.pickupDate as string)} الساعة ${fresh.pickupHour}.`,
      link: '/user/my-loans',
      email: true,
    })

    return { success: true, message: 'تم قبول طلب الإعارة', loanId: fresh.id }
  } catch (error) {
    console.error('Error accepting a loan:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/** Refuses a pending or accepted loan with a mandatory reason (#19). */
export async function refuseLoanLogic(
  loanId: number | string,
  reason: string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  if (!reason || !reason.trim()) {
    return { success: false, message: 'يجب إدخال سبب الرفض' }
  }

  try {
    const { loan, bookTitle } = await readLoanAndBook(ctx, loanId)

    if (loan.status !== 'pending' && loan.status !== 'accepted') {
      return { success: false, message: 'لا يمكن رفض إعارة بهذه الحالة' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'refused', refusalReason: reason },
      req: ctx.req,
      overrideAccess: false,
    })

    await createNotification({
      req: ctx.req,
      user: loan.user as number,
      type: 'loan',
      title: 'تم رفض طلب الإعارة',
      message: `تم رفض طلب استعارة «${bookTitle}». السبب: ${reason}.`,
      link: '/user/my-loans',
      email: true,
    })

    return { success: true, message: 'تم رفض طلب الإعارة', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error refusing a loan:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/** Marks an accepted loan as picked up; the due date is stamped by the hook. */
export async function markLoanPickedUpLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const { loan } = await readLoanAndBook(ctx, loanId)

    if (loan.status !== 'accepted') {
      return { success: false, message: 'لا يمكن تسجيل أخذ كتاب لطلب غير مقبول' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'picked_up' },
      req: ctx.req,
      overrideAccess: false,
    })

    return { success: true, message: 'تم تسجيل أخذ الكتاب', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error marking a loan picked up:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/**
 * Marks a picked-up loan returned. The lifecycle hook releases the copy and
 * promotes the waitlist head inside the same transaction; the promoted user
 * is reported back on `req.context` so the notification joins it too.
 */
export async function markLoanReturnedLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const { loan, bookTitle } = await readLoanAndBook(ctx, loanId)

    if (loan.status !== 'picked_up') {
      return { success: false, message: 'لا يمكن إرجاع إعارة لم تؤخذ بعد' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned' },
      req: ctx.req,
      overrideAccess: false,
    })

    const promotedUserId = ctx.req.context?.[PROMOTED_USER_ID]
    if (typeof promotedUserId === 'number') {
      await createNotification({
        req: ctx.req,
        user: promotedUserId,
        type: 'waitlist',
        title: 'الكتاب متاح الآن لاستعارتك',
        message: `جاء دورك لاستعارة «${bookTitle}»: سُجّل طلبك بانتظار موافقة الإدارة.`,
        link: '/user/my-loans',
        email: true,
      })
    }

    return { success: true, message: 'تم تسجيل إرجاع الكتاب', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error marking a loan returned:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

async function withAdminCtx(
  run: (ctx: TransitionCtx) => Promise<LoanActionResult>,
): Promise<LoanActionResult> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return { success: false, message: NOT_LOGGED_IN }
  return run(ctx)
}

export const acceptLoan = (loanId: number | string) =>
  withAdminCtx((ctx) => acceptLoanLogic(loanId, ctx))

export const refuseLoan = (loanId: number | string, reason: string) =>
  withAdminCtx((ctx) => refuseLoanLogic(loanId, reason, ctx))

export const markLoanPickedUp = (loanId: number | string) =>
  withAdminCtx((ctx) => markLoanPickedUpLogic(loanId, ctx))

export const markLoanReturned = (loanId: number | string) =>
  withAdminCtx((ctx) => markLoanReturnedLogic(loanId, ctx))
