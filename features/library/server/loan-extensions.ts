'use server'
import { getPayloadWithUser, isAdmin, type ActionCtx } from '@/shared/lib/auth'
import type { Loan, LoanExtension } from '@/payload-types'

import { createNotification } from '@/features/notifications'
import { MAX_EXTENSION_DAYS } from '@/utils/constants/loans'
import { formatArabicDate } from '@/shared/lib/dates'

export interface LoanExtensionActionResult {
  success: boolean
  message: string
  extensionId?: number
  status?: 'pending' | 'approved' | 'refused'
}

const NOT_LOGGED_IN = 'يجب تسجيل الدخول أولاً'
const NOT_ADMIN = 'غير مصرح لك بتنفيذ هذا الإجراء'
const GENERIC_ERROR = 'حدث خطأ أثناء معالجة طلب التمديد'

export type ExtensionCtx = ActionCtx

/**
 * Requests an extension on a loan the caller holds (#19). When the book's
 * waitlist is empty the extension is auto-approved: the due date moves now and
 * both dates are recorded. Otherwise the request stays pending for an admin.
 * The `loan-extensions` create hook stamps the borrower and both due dates
 * from the loan, so nothing here can be forged.
 */
export async function requestLoanExtensionLogic(
  loanId: number | string,
  days: number,
  ctx: ActionCtx,
  reason?: string,
): Promise<LoanExtensionActionResult> {
  try {
    // The loan is read for validation regardless of the caller: the ownership
    // check below turns "someone else's loan" into a friendly message instead
    // of a row-scoped 404.
    const loan = (await ctx.payload.findByID({
      collection: 'loans',
      id: loanId,
      req: ctx.req,
      overrideAccess: true,
      depth: 0,
    })) as Loan

    if (!loan || loan.user !== ctx.user.id) {
      return { success: false, message: 'لا يمكن تمديد إعارة لست مالكها' }
    }

    if (loan.status !== 'picked_up') {
      return { success: false, message: 'يمكن طلب التمديد للكتب التي تم أخذها فقط' }
    }

    if (!Number.isInteger(days) || days < 1 || days > MAX_EXTENSION_DAYS) {
      return { success: false, message: `يمكن التمديد من يوم واحد إلى ${MAX_EXTENSION_DAYS} يوماً` }
    }

    const pendingDuplicate = await ctx.payload.count({
      collection: 'loan-extensions',
      where: {
        and: [{ loan: { equals: Number(loanId) } }, { status: { equals: 'pending' } }],
      },
      req: ctx.req,
      overrideAccess: true,
    })
    if (pendingDuplicate.totalDocs > 0) {
      return { success: false, message: 'لديك بالفعل طلب تمديد قيد المراجعة لهذه الإعارة' }
    }

    const extension = (await ctx.payload.create({
      collection: 'loan-extensions',
      data: { loan: Number(loanId), user: ctx.user.id, days, reason },
      req: ctx.req,
      overrideAccess: false,
    })) as LoanExtension

    const queue = await ctx.payload.count({
      collection: 'waitlist-entries',
      where: { book: { equals: loan.book as number } },
      req: ctx.req,
      overrideAccess: true,
    })

    const book = await ctx.payload.findByID({
      collection: 'books',
      id: loan.book as number,
      req: ctx.req,
      overrideAccess: false,
      depth: 0,
    })

    if (queue.totalDocs === 0) {
      // Auto-approved: nobody is waiting for the book. The approval is
      // system state computed from the queue, so both writes bypass the
      // admin-only rules intentionally while joining the caller's transaction.
      await ctx.payload.update({
        collection: 'loan-extensions',
        id: extension.id,
        data: { status: 'approved' },
        req: ctx.req,
        overrideAccess: true,
      })
      await ctx.payload.update({
        collection: 'loans',
        id: loanId,
        data: { dueDate: extension.newDueDate },
        req: ctx.req,
        overrideAccess: true,
      })

      await createNotification({
        req: ctx.req,
        user: ctx.user.id,
        type: 'extension',
        title: 'تمت الموافقة على التمديد',
        message: `تم تمديد إعارة «${book.title}» حتى ${formatArabicDate(extension.newDueDate as string)}.`,
        link: '/user/my-loans',
        email: true,
      })

      return {
        success: true,
        message: 'تمت الموافقة على التمديد',
        extensionId: extension.id,
        status: 'approved',
      }
    }

    await createNotification({
      req: ctx.req,
      user: ctx.user.id,
      type: 'extension',
      title: 'طلب التمديد قيد المراجعة',
      message: `سيراجع الإدارة طلب تمديد إعارة «${book.title}» لوجود قائمة انتظار على الكتاب.`,
      link: '/user/my-loans',
      email: true,
    })

    return {
      success: true,
      message: 'تم إرسال طلب التمديد إلى الإدارة',
      extensionId: extension.id,
      status: 'pending',
    }
  } catch (error) {
    console.error('Error requesting a loan extension:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/** Admin decision on a pending extension: approval moves the loan's due date. */
export async function decideLoanExtensionLogic(
  extensionId: number | string,
  decision: 'approved' | 'refused',
  ctx: ActionCtx,
  adminResponse?: string,
): Promise<LoanExtensionActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const extension = (await ctx.payload.findByID({
      collection: 'loan-extensions',
      id: extensionId,
      req: ctx.req,
      overrideAccess: false,
      depth: 0,
    })) as LoanExtension

    if (extension.status !== 'pending') {
      return { success: false, message: 'تمت معالجة طلب التمديد مسبقاً' }
    }

    await ctx.payload.update({
      collection: 'loan-extensions',
      id: extensionId,
      data: { status: decision, adminResponse },
      req: ctx.req,
      overrideAccess: false,
    })

    if (decision === 'approved') {
      // Status stays picked_up, so the lifecycle hook is not triggered.
      await ctx.payload.update({
        collection: 'loans',
        id: extension.loan as number,
        data: { dueDate: extension.newDueDate },
        req: ctx.req,
        overrideAccess: false,
      })
    }

    const loan = (await ctx.payload.findByID({
      collection: 'loans',
      id: extension.loan as number,
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

    const approved = decision === 'approved'
    const title = approved ? 'تمت الموافقة على التمديد' : 'تم رفض طلب التمديد'
    let message: string
    if (approved) {
      message = adminResponse
        ? `تم تمديد إعارة «${book.title}» حتى ${formatArabicDate(extension.newDueDate as string)}. ملاحظة الإدارة: ${adminResponse}.`
        : `تم تمديد إعارة «${book.title}» حتى ${formatArabicDate(extension.newDueDate as string)}.`
    } else {
      message = adminResponse
        ? `تم رفض طلب تمديد إعارة «${book.title}». السبب: ${adminResponse}.`
        : `تم رفض طلب تمديد إعارة «${book.title}».`
    }

    await createNotification({
      req: ctx.req,
      user: extension.user as number,
      type: 'extension',
      title,
      message,
      link: '/user/my-loans',
      email: true,
    })

    return {
      success: true,
      message: approved ? 'تمت الموافقة على التمديد' : 'تم رفض طلب التمديد',
      extensionId: Number(extensionId),
      status: decision,
    }
  } catch (error) {
    console.error('Error deciding a loan extension:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

export const requestLoanExtension = (
  loanId: number | string,
  days: number,
  reason?: string,
): Promise<LoanExtensionActionResult> =>
  (async () => {
    const ctx = await getPayloadWithUser()
    if (!ctx) return { success: false, message: NOT_LOGGED_IN }
    return requestLoanExtensionLogic(loanId, days, ctx, reason)
  })()

export const decideLoanExtension = (
  extensionId: number | string,
  decision: 'approved' | 'refused',
  adminResponse?: string,
): Promise<LoanExtensionActionResult> =>
  (async () => {
    const ctx = await getPayloadWithUser({ allowAdmin: true })
    if (!ctx) return { success: false, message: NOT_LOGGED_IN }
    return decideLoanExtensionLogic(extensionId, decision, ctx, adminResponse)
  })()
