'use server'
import { getPayloadWithUser, type ActionCtx } from '@/shared/lib/auth'

import { checkRequestGates } from '@/shared/lib/loan-gates'

interface BorrowBookResult {
  success: boolean
  message: string
  loan?: unknown
  waitlisted?: boolean
}

/**
 * The loan request transition (#19): a verified borrower under the borrow
 * limit either takes a pending loan on a free copy or joins the book's FIFO
 * waitlist. Nothing is reserved yet — `accept` reserves the copy.
 */
export async function borrowBookLogic(
  bookId: string,
  ctx: ActionCtx,
  options?: { pickupDate?: string },
): Promise<BorrowBookResult> {
  const { payload, user, req } = ctx

  try {
    const book = await payload.findByID({
      collection: 'books',
      id: bookId,
      req,
      overrideAccess: false,
      depth: 0,
    })

    const gates = await checkRequestGates(ctx, Number(bookId))
    if (!gates.ok) {
      return { success: false, message: gates.message }
    }

    if ((book.availableBooks ?? 0) > 0) {
      const loan = await payload.create({
        collection: 'loans',
        data: {
          book: Number(bookId),
          user: user.id,
          status: 'pending',
          loanDate: new Date().toISOString(),
          ...(options?.pickupDate
            ? { pickupDate: new Date(options.pickupDate).toISOString() }
            : {}),
        },
        req,
        overrideAccess: false,
      })

      return { success: true, message: 'تم تقديم طلب الإعارة بنجاح', loan }
    }

    // No free copy: the request joins the end of the book's waitlist. The
    // position is stamped by the collection hook (end of the queue).
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: Number(bookId), user: user.id, position: 0 },
      req,
      overrideAccess: false,
    })

    return {
      success: true,
      message: 'لا توجد نسخ متاحة حالياً — تم إضافتك إلى قائمة الانتظار لهذا الكتاب',
      waitlisted: true,
    }
  } catch (error) {
    console.error('Error requesting a loan:', error)
    return { success: false, message: 'حدث خطأ أثناء تقديم طلب الإعارة' }
  }
}

export const borrowBook = async (
  bookId: string,
  options?: { pickupDate?: string },
): Promise<BorrowBookResult> => {
  const ctx = await getPayloadWithUser()

  if (!ctx) {
    return { success: false, message: 'يجب تسجيل الدخول أولاً' }
  }

  return borrowBookLogic(bookId, ctx, options)
}

export async function getUserBookLoanState(bookId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { hasActiveLoan: false, waitlisted: false }

  const existing = await ctx.payload.find({
    collection: 'loans',
    where: {
      and: [
        { user: { equals: ctx.user.id } },
        { book: { equals: bookId } },
        { status: { in: ['pending', 'accepted', 'picked_up'] } },
      ],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })

  const waitlisted = await ctx.payload.count({
    collection: 'waitlist-entries',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { book: { equals: bookId } }],
    },
    req: ctx.req,
    overrideAccess: false,
  })

  return {
    hasActiveLoan: Boolean(existing.docs[0]),
    waitlisted: waitlisted.totalDocs > 0,
  }
}
