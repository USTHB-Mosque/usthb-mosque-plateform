'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { getPayloadWithUser } from '@/shared/lib/auth'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

interface BorrowBookResult {
  success: boolean
  message: string
  loan?: unknown
}

export async function borrowBookLogic(
  bookId: string,
  ctx: { payload: Payload; user: User; req: PayloadRequest },
  options?: { dueDate?: string; pickupDate?: string },
): Promise<BorrowBookResult> {
  const { payload, user, req } = ctx

  if (user.verificationStatus !== 'verified') {
    return { success: false, message: 'يجب تأكيد حسابك قبل استعارة الكتب' }
  }

  try {
    const bookResult = await payload.findByID({
      collection: 'books',
      id: bookId,
      req,
      overrideAccess: false,
    })

    if (!bookResult || !bookResult.availableBooks || bookResult.availableBooks <= 0) {
      return { success: false, message: 'عذراً، الكتاب غير متوفر حالياً' }
    }

    const existingLoansResult = await payload.find({
      collection: 'loans',
      where: {
        and: [
          { user: { equals: user.id } },
          { book: { equals: bookId } },
          { status: { not_equals: 'returned' } },
        ],
      },
      req,
      overrideAccess: false,
    })

    if (existingLoansResult.docs.length > 0) {
      return { success: false, message: 'لديك بالفعل طلب إعارة نشط لهذا الكتاب' }
    }

    const dueDate = options?.dueDate
      ? new Date(options.dueDate)
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() + 14)
          return d
        })()

    const loan = await payload.create({
      collection: 'loans',
      data: {
        book: parseInt(bookId),
        user: user.id,
        status: 'pending',
        loanDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        pickupDate: options?.pickupDate ? new Date(options.pickupDate).toISOString() : undefined,
      },
      req,
      overrideAccess: false,
    })

    // The copy decrement is system state driven by the gated logic above
    // (verified caller, availability, no active duplicate), so it intentionally
    // bypasses the admin-only write rule on books.
    await payload.update({
      collection: 'books',
      id: bookId,
      data: {
        availableBooks: bookResult.availableBooks - 1,
      },
      req,
      overrideAccess: true,
    })

    return { success: true, message: 'تم تقديم طلب الإعارة بنجاح', loan }
  } catch (error) {
    console.error('Error borrowing book:', error)
    return { success: false, message: 'حدث خطأ أثناء تقديم طلب الإعارة' }
  }
}

export const borrowBook = async (
  bookId: string,
  options?: { dueDate?: string; pickupDate?: string },
): Promise<BorrowBookResult> => {
  const ctx = await getPayloadWithUser()

  if (!ctx) {
    return { success: false, message: 'يجب تسجيل الدخول أولاً' }
  }

  return borrowBookLogic(bookId, ctx, options)
}

export async function getUserBookLoanState(bookId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { hasActiveLoan: false }

  const existing = await ctx.payload.find({
    collection: 'loans',
    where: {
      and: [
        { user: { equals: ctx.user.id } },
        { book: { equals: bookId } },
        { status: { not_equals: 'returned' } },
      ],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })

  return { hasActiveLoan: Boolean(existing.docs[0]) }
}
