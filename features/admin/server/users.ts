'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import type { ExtensionStatus } from './extensions'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import { softDeleteUserAccount } from '@/features/users/server/account-lifecycle'
import { resolveRelationId } from '@/shared/lib/relations'
import type { Article, Book, Loan, LoanExtension, Review, WaitlistEntry } from '@/payload-types'
import type { Where } from 'payload'

export { getAdminCtx }

export async function getAdminUsersStats() {
  const { payload, user } = await getAdminCtx()

  const base: Where = { deletedAt: { exists: false } }

  const [total, active, pending, inactive] = await Promise.all([
    payload.count({
      collection: 'users',
      where: base,
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: { and: [base, { verificationStatus: { equals: 'verified' } }] },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: { and: [base, { verificationStatus: { equals: 'pending_verification' } }] },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: {
        and: [
          base,
          {
            or: [
              { verificationStatus: { equals: 'rejected' } },
              { verificationStatus: { exists: false } },
            ],
          },
        ],
      },
      overrideAccess: false,
      user,
    }),
  ])

  return {
    stats: {
      totalUsers: total.totalDocs,
      activeAccounts: active.totalDocs,
      pendingJoinRequests: pending.totalDocs,
      inactiveAccounts: inactive.totalDocs,
    },
  }
}

export interface AdminUsersQuery {
  page?: number
  limit?: number
  search?: string
  role?: 'admin' | 'librarian' | 'user'
  verificationStatus?: string[]
}

export async function getAdminUsers(query: AdminUsersQuery = {}) {
  const { payload, user } = await getAdminCtx()

  const andFilters: Where[] = [{ deletedAt: { exists: false } }]

  if (query.role) {
    andFilters.push({ role: { equals: query.role } })
  }

  if (query.verificationStatus?.length) {
    andFilters.push({ verificationStatus: { in: query.verificationStatus } })
  }

  if (query.search) {
    andFilters.push({
      or: [
        { email: { contains: query.search } },
        { fullName: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { phone: { contains: query.search } },
      ],
    })
  }

  const result = await payload.find({
    collection: 'users',
    where: { and: andFilters },
    sort: '-createdAt',
    depth: 0,
    page: query.page || 1,
    limit: query.limit || 20,
    overrideAccess: false,
    user,
  })

  return result
}

export async function softDeleteUser(userId: number) {
  const { payload, user, req } = await getAdminCtx()

  await softDeleteUserAccount(payload, userId, req)

  revalidatePath('/admin-panel/users')
  await writeLog(payload, user, {
    action: LogAction.UserDeleted,
    targetType: 'user',
    targetId: userId,
    message: `حذف عضو #${userId}`,
  })
  return { ok: true }
}

export async function getAdminUser(userId: number | string) {
  const { payload, user } = await getAdminCtx()

  const doc = await payload.findByID({
    collection: 'users',
    id: userId as number,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return doc
}

/**
 * The stored fields are read as Payload types them: a nullable column may simply
 * be absent. The view renders "—" for that, so nothing here invents a value to
 * fill a hole.
 */
/** #156: a member's history is a recent slice, not an archive. */
const USER_HISTORY_LIMIT = 20

export interface AdminUserBorrowing {
  id: number
  title: string | null
  /**
   * Both statuses are required-with-default columns, so Payload types them as
   * nullable; they are never null in a stored row and narrowing them here keeps
   * the view from having to defend against a value the schema cannot hold.
   */
  status: NonNullable<Loan['status']>
  /** Derived, never stored: the loan came back. Anything else has not. */
  returned: boolean
  loanDate: string
  dueDate: string | null | undefined
  returnDate: string | null | undefined
}

export interface AdminUserReview {
  id: number
  rating: number
  comment: string | null | undefined
  targetType: 'book' | 'article'
  targetTitle: string | null
  createdAt: string
}

export interface AdminUserExtension {
  id: number
  status: ExtensionStatus
  days: number
  reason: string | null | undefined
  bookTitle: string | null
  originalDueDate: string | null | undefined
  newDueDate: string | null | undefined
  /**
   * #156, SPEC §7.3: the due-check behind an extension. Zero means nobody is
   * waiting for the book, so approval costs the library nothing — the same
   * queue the member's own request was auto-approved against.
   */
  waitingForBook: number
  createdAt: string
}

/**
 * #156: the three timelines SPEC §7.3 asks for on the user page — previous
 * borrowings with their returned state, the member's reviews, and their
 * extension requests. Without them an admin cannot answer "does this person
 * have something overdue" from the user screen at all.
 *
 * The lists are the most recent slice, and the totals are reported alongside so
 * the view can say it is showing 20 of 34 rather than implying 20 is all there
 * is. Every read is depth-limited and scoped to this one member: an admin
 * decision on an extension is made from here, so the rows must be complete
 * enough to decide on (book, dates, days, queue depth).
 */
export async function getAdminUserHistory(userId: number | string): Promise<{
  borrowings: { docs: AdminUserBorrowing[]; total: number }
  reviews: { docs: AdminUserReview[]; total: number }
  extensions: { docs: AdminUserExtension[] }
}> {
  const { payload, user } = await getAdminCtx()
  const id = Number(userId)

  const [loans, loanTotal, reviews, reviewTotal, extensions] = await Promise.all([
    payload.find({
      collection: 'loans',
      where: { user: { equals: id } },
      // depth 1 populates `book`, which is the only thing the row shows besides
      // the dates.
      depth: 1,
      sort: '-loanDate',
      limit: USER_HISTORY_LIMIT,
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'loans',
      where: { user: { equals: id } },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'reviews',
      where: { user: { equals: id } },
      depth: 1,
      sort: '-createdAt',
      limit: USER_HISTORY_LIMIT,
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'reviews',
      where: { user: { equals: id } },
      overrideAccess: false,
      user,
    }),
    // depth 2 populates extension -> loan -> book, so the row can name the
    // title the decision is actually about.
    payload.find({
      collection: 'loan-extensions',
      where: { user: { equals: id } },
      depth: 2,
      sort: '-createdAt',
      limit: USER_HISTORY_LIMIT,
      overrideAccess: false,
      user,
    }),
  ])

  // The depths below are the contract this mapping relies on: `depth: 1`
  // populates a loan's book and a review's target, `depth: 2` populates an
  // extension's loan and that loan's book. Everything else here reads plain
  // fields off the populated document — the same assumption the rest of the
  // admin views make about a `depth` they asked for.
  const loanDocs = loans.docs as Loan[]
  const extensionDocs = extensions.docs as LoanExtension[]
  const bookTitleOf = (value: unknown): string => (value as Book).title

  const bookOf = (extension: LoanExtension) => (extension.loan as Loan).book

  const bookIds = [
    ...new Set(extensionDocs.map((extension) => resolveRelationId(bookOf(extension)))),
  ]
  const queue =
    bookIds.length > 0
      ? await payload.find({
          collection: 'waitlist-entries',
          where: { book: { in: bookIds } },
          depth: 0,
          pagination: false,
          overrideAccess: false,
          user,
        })
      : { docs: [] as WaitlistEntry[] }

  const waitingByBook = new Map<number, number>()
  for (const entry of queue.docs as WaitlistEntry[]) {
    const book = resolveRelationId(entry.book)
    waitingByBook.set(book, (waitingByBook.get(book) ?? 0) + 1)
  }

  return {
    borrowings: {
      docs: loanDocs.map((loan) => ({
        id: loan.id,
        title: bookTitleOf(loan.book),
        status: loan.status as NonNullable<Loan['status']>,
        returned: loan.status === 'returned',
        loanDate: loan.loanDate,
        dueDate: loan.dueDate,
        returnDate: loan.returnDate,
      })),
      total: loanTotal.totalDocs,
    },
    reviews: {
      docs: (reviews.docs as Review[]).map((review) => {
        // Exactly one target is guaranteed by the collection's own beforeValidate,
        // and `depth: 1` populated whichever one it is — so the book relation is
        // the discriminator: present on a book review, null on an article review.
        const book = review.book as Book | null
        const target = (book ?? review.article) as Book | Article
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          targetType: book ? ('book' as const) : ('article' as const),
          targetTitle: target.title,
          createdAt: review.createdAt,
        }
      }),
      total: reviewTotal.totalDocs,
    },
    extensions: {
      docs: extensionDocs.map((extension) => {
        const book = bookOf(extension)
        return {
          id: extension.id,
          status: extension.status as ExtensionStatus,
          days: extension.days,
          reason: extension.reason,
          bookTitle: bookTitleOf(book),
          originalDueDate: extension.originalDueDate,
          newDueDate: extension.newDueDate,
          waitingForBook: waitingByBook.get(resolveRelationId(book)) ?? 0,
          createdAt: extension.createdAt,
        }
      }),
    },
  }
}

export async function createAdminUser(input: {
  fullName?: string
  email: string
  password: string
  role: 'admin' | 'librarian'
}): Promise<{ ok: boolean; error?: string; userId?: number }> {
  try {
    const { payload, user } = await getAdminCtx()

    const doc = await payload.create({
      collection: 'users',
      data: {
        fullName: input.fullName || undefined,
        email: input.email,
        password: input.password,
        role: input.role,
        verificationStatus: 'verified',
        // An admin vouches for the account they create, so consent is recorded.
        consentGiven: true,
      },
      overrideAccess: false,
      user,
    })

    revalidatePath('/admin-panel/users')
    await writeLog(payload, user, {
      action: LogAction.UserRoleChanged,
      targetType: 'user',
      targetId: doc.id,
      message: `أنشأ حساباً بدور ${input.role}`,
    })
    return { ok: true, userId: doc.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر إنشاء المستخدم'
    const errorMessage = /duplicate|unique/i.test(message)
      ? 'البريد الإلكتروني مستخدم بالفعل'
      : 'تعذر إنشاء المستخدم'
    return { ok: false, error: errorMessage }
  }
}

export async function updateUserRole(
  userId: number,
  role: 'admin' | 'librarian' | 'user',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { payload, user } = await getAdminCtx()

    await payload.update({
      collection: 'users',
      id: userId,
      data: { role },
      overrideAccess: false,
      user,
    })

    revalidatePath('/admin-panel/users')
    revalidatePath(`/admin-panel/users/${userId}`)
    await writeLog(payload, user, {
      action: LogAction.UserRoleChanged,
      targetType: 'user',
      targetId: userId,
      message: `غيّر دور عضو #${userId} إلى ${role}`,
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر تحديث الدور'
    return { ok: false, error: message }
  }
}

/**
 * D2 (#153): the only way a no-show block ends. An admin reviews the case and
 * lifts it — the block timestamp clears and the counter steps back one, so a
 * member blocked at two starts again at one rather than at zero. Lifting is
 * forgiveness of the block, not of the history behind it: it takes a third
 * no-show to block them again, and it is the counter, not the timestamp, that
 * decides that.
 *
 * The write is logged so lifting is as accountable as setting the block.
 */
export async function liftBorrowingBlock(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const { payload, user, req } = await getAdminCtx()

    const target = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
      req,
      overrideAccess: false,
      user,
    })

    if (!target.borrowingBlockedAt) {
      return { ok: false, error: 'لا يوجد حجب إعارة مفتوح على هذا العضو' }
    }

    const noShowCount = Math.max(0, (target.noShowCount ?? 0) - 1)

    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        borrowingBlockedAt: null,
        noShowCount,
      },
      req,
      overrideAccess: false,
      user,
    })

    revalidatePath('/admin-panel/users')
    revalidatePath(`/admin-panel/users/${userId}`)
    await writeLog(payload, user, {
      action: LogAction.UserBlockLifted,
      targetType: 'user',
      targetId: userId,
      message: `رفع حجب الإعارة عن عضو #${userId}`,
      metadata: { noShowCount },
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر رفع الحجب'
    return { ok: false, error: message }
  }
}
