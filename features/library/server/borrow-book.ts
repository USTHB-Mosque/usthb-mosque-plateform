'use server'
import { getPayloadWithUser, type ActionCtx } from '@/shared/lib/auth'

import { checkRequestGates } from '@/shared/lib/loan-gates'
import { getLoanSettings } from '@/shared/lib/settings'
import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'

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

/**
 * What the book page needs to render for one member (#153): whether they
 * already hold this book, where they sit in its queue, how much of the borrow
 * budget is left, and whether their account still needs verifying. Anonymous
 * callers get the neutral shape — the page is public and there is nothing to
 * show until someone signs in.
 *
 * The fields are the front half of `checkRequestGates`: read the same rows it
 * reads, so the page can say *why* before the member clicks, instead of the
 * toast that used to arrive after the fact.
 */
export interface UserBookLoanState {
  hasActiveLoan: boolean
  waitlisted: boolean
  /** 1-based position in the book's FIFO queue; null when not queued. */
  waitlistPosition: number | null
  /** Borrow-limit budget left; null for a caller who has none to spend. */
  remainingSlots: number | null
  needsVerification: boolean
}

const ANONYMOUS_STATE: UserBookLoanState = {
  hasActiveLoan: false,
  waitlisted: false,
  waitlistPosition: null,
  remainingSlots: null,
  needsVerification: false,
}

export async function getUserBookLoanState(bookId: number): Promise<UserBookLoanState> {
  const ctx = await getPayloadWithUser()
  if (!ctx) return ANONYMOUS_STATE

  const { payload, user, req } = ctx

  const [existing, queue, active, { borrowLimit }] = await Promise.all([
    payload.find({
      collection: 'loans',
      where: {
        and: [
          { user: { equals: user.id } },
          { book: { equals: bookId } },
          { status: { in: [...ACTIVE_LOAN_STATUSES] } },
        ],
      },
      limit: 1,
      depth: 0,
      req: ctx.req,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'waitlist-entries',
      where: {
        and: [{ user: { equals: user.id } }, { book: { equals: bookId } }],
      },
      limit: 1,
      depth: 0,
      req: ctx.req,
      overrideAccess: false,
    }),
    payload.count({
      collection: 'loans',
      where: {
        and: [{ user: { equals: user.id } }, { status: { in: [...ACTIVE_LOAN_STATUSES] } }],
      },
      req: ctx.req,
      overrideAccess: true,
    }),
    getLoanSettings(payload, req),
  ])

  const entry = queue.docs[0]

  return {
    hasActiveLoan: Boolean(existing.docs[0]),
    waitlisted: Boolean(entry),
    waitlistPosition: entry?.position ?? null,
    // The gate refuses at `>= borrowLimit`, so a member sitting at the limit
    // has spent their budget, not lent the platform one. Never read negative.
    remainingSlots: Math.max(0, borrowLimit - active.totalDocs),
    needsVerification: user.verificationStatus !== 'verified',
  }
}
