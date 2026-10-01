'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx, type AdminCtx } from './ctx'
import { writeLoanLog } from './loan-log-core'
import { LogAction } from './logs-core'
import { resolveSearchMatches } from './search-core'
import { acceptLoanLogic } from '@/features/library'
import { resolveRelationId } from '@/shared/lib/relations'
import type { PayloadRequest, Where } from 'payload'
import type { Book, User, WaitlistEntry } from '@/payload-types'

const GENERIC_ERROR = 'حدث خطأ أثناء إسناد النسخة'
const NO_ENTRY = 'سجل قائمة الانتظار غير موجود'
const NO_COPY = 'لا توجد نسخة متاحة لإسنادها'

const revalidateWaitlist = () => {
  revalidatePath('/admin-panel/loans/waitlist')
  revalidatePath('/admin-panel/loans')
  revalidatePath('/admin-panel/dashboard')
}

export interface WaitlistQuery {
  search?: string
  page?: number
  limit?: number
}

/** One book's FIFO queue, with the free-copy count that gates assignment. */
export interface WaitlistGroup {
  bookId: number
  title: string
  availableBooks: number
  entries: WaitlistEntry[]
}

export interface WaitlistPage {
  docs: WaitlistGroup[]
  page: number
  totalPages: number
  totalDocs: number
}

export interface WaitlistActionResult {
  ok: boolean
  error?: string
  loanId?: number
}

/**
 * The waitlist screen (#144): every book's queue, in position order.
 *
 * Entries are read whole and grouped here rather than paged as rows, because
 * `position` is only meaningful inside one book's queue — paging rows would
 * hand the desk a page that starts halfway through somebody's line. `book_id`
 * is a foreign key, so a row can never outlive its book, which is what makes
 * reading the whole table safe: a queue row only exists while its book is at
 * zero copies, and there are never many of those at once.
 */
export async function getWaitlist(params: WaitlistQuery = {}): Promise<WaitlistPage> {
  const ctx = await getAdminCtx()
  const { payload, user } = ctx

  const search = params.search?.trim() ?? ''
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const limit = Math.max(1, Math.trunc(params.limit ?? 20))

  const andFilters: Where[] = []
  if (search) {
    const { userIds, bookIds } = await resolveSearchMatches(payload, user, search)
    const or: Where[] = []
    // `id: { in: [...] }` is ignored by the Postgres adapter on the primary
    // key, so a borrower match filters on the relationship value path instead.
    if (userIds.length > 0) or.push({ 'user.id': { in: userIds } })
    if (bookIds.length > 0) or.push({ book: { in: bookIds } })
    andFilters.push(or.length > 0 ? { or } : { id: { equals: -1 } })
  }

  const result = await payload.find({
    collection: 'waitlist-entries',
    where: andFilters.length ? { and: andFilters } : {},
    sort: 'book',
    pagination: false,
    depth: 1,
    overrideAccess: false,
    user,
  })

  const queues = groupByBook(result.docs as WaitlistEntry[])
  const totalDocs = queues.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
  const start = (page - 1) * limit

  return { docs: queues.slice(start, start + limit), page, totalPages, totalDocs }
}

/**
 * Collapses the flat rows into one queue per book. `depth: 1` populated both
 * relations and both are foreign keys, so neither can dangle.
 */
function groupByBook(entries: WaitlistEntry[]): WaitlistGroup[] {
  const queues = new Map<number, WaitlistGroup>()

  for (const entry of entries) {
    const book = entry.book as Book
    const existing = queues.get(book.id)
    if (existing) {
      existing.entries.push(entry)
      continue
    }
    queues.set(book.id, {
      bookId: book.id,
      title: book.title,
      availableBooks: Number(book.availableBooks),
      entries: [entry],
    })
  }

  return [...queues.values()].map((queue) => ({
    ...queue,
    entries: [...queue.entries].sort((a, b) => a.position - b.position),
  }))
}

/**
 * Rewrites a book's positions to 1..n after a row leaves the queue. Rows that
 * are already where they belong are not written — removing the last entry
 * changes nothing at all.
 */
async function compactPositions(ctx: AdminCtx, bookId: number, req: PayloadRequest): Promise<void> {
  const remaining = await ctx.payload.find({
    collection: 'waitlist-entries',
    where: { book: { equals: bookId } },
    sort: 'position',
    pagination: false,
    depth: 0,
    req,
    overrideAccess: false,
    user: ctx.user,
  })

  let position = 1
  for (const row of remaining.docs) {
    if (row.position !== position) {
      await ctx.payload.update({
        collection: 'waitlist-entries',
        id: row.id,
        data: { position },
        req,
        overrideAccess: false,
        user: ctx.user,
      })
    }
    position += 1
  }
}

/**
 * Hands a free copy to one person in the queue (#144): the loan is created and
 * accepted, the row leaves the queue and the rest are renumbered — all in one
 * transaction, so a half-assigned queue is never visible.
 *
 * The loan goes in as `pending` and is then accepted rather than created
 * accepted, because the `loans` hook — not this action — is what reserves the
 * copy and stamps the pickup code. Reusing that path is what keeps the shelf
 * count and the queue in agreement.
 */
export async function assignWaitlistEntry(entryId: number): Promise<WaitlistActionResult> {
  const ctx = await getAdminCtx()
  const { payload, user } = ctx

  let entry: WaitlistEntry
  try {
    entry = await payload.findByID({
      collection: 'waitlist-entries',
      id: Number(entryId),
      depth: 1,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false, error: NO_ENTRY }
  }

  const book = entry.book as Book
  const bookId = book.id
  const memberId = (entry.user as User).id

  // `Number(null)` is 0, so an unset copy count reads as nothing to hand over —
  // the same rule the member-facing request gate applies.
  if (Number(book.availableBooks) <= 0) {
    return { ok: false, error: NO_COPY }
  }

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, error: GENERIC_ERROR }
  const req = { ...ctx.req, transactionID }
  const txCtx = { ...ctx, req }

  let loanId: number
  try {
    const loan = await payload.create({
      collection: 'loans',
      data: {
        book: bookId,
        user: memberId,
        status: 'pending',
        loanDate: new Date().toISOString(),
      },
      req,
      overrideAccess: false,
    })

    const accepted = await acceptLoanLogic(loan.id, txCtx)
    if (!accepted.success) {
      await payload.db.rollbackTransaction(transactionID)
      return { ok: false, error: accepted.message }
    }
    loanId = loan.id

    await payload.delete({
      collection: 'waitlist-entries',
      id: entryId,
      req,
      overrideAccess: false,
      user,
    })
    await compactPositions(ctx, bookId, req)

    await payload.db.commitTransaction(transactionID)
  } catch (error) {
    console.error('Error assigning a waitlist entry:', error)
    await payload.db.rollbackTransaction(transactionID)
    return { ok: false, error: GENERIC_ERROR }
  }

  // After the commit: the audit line reads the loan back to name the book, and
  // it must not survive a rollback of the loan it describes.
  await writeLoanLog(
    payload,
    user,
    loanId,
    LogAction.LoanApproved,
    (title) => `قبل طلب إعارة للكتاب: ${title}`,
  )
  revalidateWaitlist()
  return { ok: true, loanId }
}

/**
 * Puts one row at the head of its book's queue so it takes the next copy that
 * is released, ahead of everyone who joined earlier. This is the out-of-order
 * promotion an assignment alone cannot express: a queue only exists at zero
 * copies, so `assignWaitlistEntry` is rarely reachable while somebody is
 * waiting — moving them up is the action the desk actually needs.
 */
export async function moveWaitlistEntryToFront(entryId: number): Promise<WaitlistActionResult> {
  const ctx = await getAdminCtx()
  const { payload, user } = ctx

  let entry: WaitlistEntry
  try {
    entry = await payload.findByID({
      collection: 'waitlist-entries',
      id: Number(entryId),
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false, error: NO_ENTRY }
  }

  const bookId = resolveRelationId(entry.book)
  const queue = await payload.find({
    collection: 'waitlist-entries',
    where: { book: { equals: bookId } },
    sort: 'position',
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const order = [entry, ...queue.docs.filter((row) => row.id !== entry.id)]

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, error: GENERIC_ERROR }
  const req = { ...ctx.req, transactionID }

  try {
    for (let index = 0; index < order.length; index += 1) {
      const row = order[index]
      // Already where the shift leaves it — no write.
      if (row.position === index + 1) continue
      await payload.update({
        collection: 'waitlist-entries',
        id: row.id,
        data: { position: index + 1 },
        req,
        overrideAccess: false,
        user,
      })
    }
    await payload.db.commitTransaction(transactionID)
  } catch (error) {
    console.error('Error reordering the waitlist:', error)
    await payload.db.rollbackTransaction(transactionID)
    return { ok: false, error: GENERIC_ERROR }
  }

  revalidateWaitlist()
  return { ok: true }
}
