'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { getAuthenticatedUser } from '@/lib/auth'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

interface BorrowBookResult {
  success: boolean
  message: string
  loan?: unknown
}

export async function borrowBookLogic(
  bookId: string,
  ctx: { payload: Payload; user: User },
): Promise<BorrowBookResult> {
  const { payload, user } = ctx

  try {
    const bookResult = await payload.findByID({
      collection: 'books',
      id: bookId,
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
      overrideAccess: false,
      req: { user: { id: user.id, role: user.role } } as Parameters<typeof payload.find>[0]['req'],
    })

    if (existingLoansResult.docs.length > 0) {
      return { success: false, message: 'لديك بالفعل طلب إعارة نشط لهذا الكتاب' }
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const loan = await payload.create({
      collection: 'loans',
      data: {
        book: parseInt(bookId),
        user: user.id,
        status: 'pending',
        loanDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
      },
    })

    return { success: true, message: 'تم تقديم طلب الإعارة بنجاح', loan }
  } catch (error) {
    console.error('Error borrowing book:', error)
    return { success: false, message: 'حدث خطأ أثناء تقديم طلب الإعارة' }
  }
}

export const borrowBook = async (bookId: string): Promise<BorrowBookResult> => {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return { success: false, message: 'يجب تسجيل الدخول أولاً' }
  }

  const payload = await getPayload({ config })
  return borrowBookLogic(bookId, { payload, user })
}
