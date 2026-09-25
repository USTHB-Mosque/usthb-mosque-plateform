import type { CollectionConfig, PayloadRequest } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import {
  ACTIVE_LOAN_STATUSES,
  IS_WAITLIST_PROMOTION,
  PROMOTED_USER_ID,
  RESERVED_LOAN_STATUSES,
  SKIP_LOAN_LIFECYCLE,
} from '@/utils/constants/loans'
import { getLoanSettings } from '@/shared/lib/settings'
import { addDays } from '@/shared/lib/dates'
import { checkRequestGates } from '@/shared/lib/loan-gates'

function formatHour(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function resolveId(value: unknown): number {
  if (typeof value === 'number') return value
  return (value as { id: number }).id
}

/** `${bookCode}/${loanId}/${twoDigitYear}` — the loan id makes it unique. */
async function generatePickupCode(
  loanId: number,
  bookId: number,
  req: PayloadRequest,
): Promise<string> {
  const book = await req.payload.findByID({
    collection: 'books',
    id: bookId,
    req,
    overrideAccess: true,
    depth: 0,
  })
  // A book without a shelf code still gets a deterministic, unique code.
  const bookCode = book?.code || `ب-${bookId}`
  return `${bookCode}/${loanId}/${String(new Date().getFullYear()).slice(-2)}`
}

/** Loan duration: the book's own duration, falling back to the global default. */
async function resolveLoanDuration(bookId: number, req: PayloadRequest): Promise<number> {
  const book = await req.payload.findByID({
    collection: 'books',
    id: bookId,
    req,
    overrideAccess: true,
    depth: 0,
  })
  const duration =
    typeof book?.loanDurationDays === 'number' && book.loanDurationDays > 0
      ? book.loanDurationDays
      : (await getLoanSettings(req.payload, req)).defaultLoanDurationDays
  return duration
}

/** Releases a held copy back to the shelf and promotes the queue head. */
async function releaseAndPromote(
  bookId: number,
  previousStatus: string | null | undefined,
  req: PayloadRequest,
  context: Record<string, unknown> | undefined,
): Promise<void> {
  if (!RESERVED_LOAN_STATUSES.includes(previousStatus as never)) return

  const book = await req.payload.findByID({
    collection: 'books',
    id: bookId,
    req,
    overrideAccess: true,
    depth: 0,
  })
  // System state driven by the gated transition, so this intentionally
  // bypasses the admin-only write rule on books while joining the caller's
  // transaction through `req`. A null count reads as zero copies.
  await req.payload.update({
    collection: 'books',
    id: bookId,
    data: { availableBooks: (book.availableBooks ?? 0) + 1 },
    req,
    overrideAccess: true,
  })

  const entries = await req.payload.find({
    collection: 'waitlist-entries',
    where: { book: { equals: bookId } },
    sort: 'position',
    req,
    overrideAccess: true,
    depth: 0,
  })

  // Promote the first waiter who does not already hold an active loan for the
  // book (defensive: the request gates normally keep those apart).
  let head: (typeof entries.docs)[number] | undefined
  for (const entry of entries.docs) {
    const active = await req.payload.find({
      collection: 'loans',
      where: {
        and: [
          { user: { equals: entry.user } },
          { book: { equals: bookId } },
          { status: { in: [...ACTIVE_LOAN_STATUSES] } },
        ],
      },
      req,
      overrideAccess: true,
      limit: 1,
      depth: 0,
    })
    if (active.docs.length === 0) {
      head = entry
      break
    }
  }
  if (!head) return

  await req.payload.delete({
    collection: 'waitlist-entries',
    id: head.id,
    req,
    overrideAccess: true,
  })

  // Resequence the remaining waiters back to 1..n.
  const remaining = entries.docs.filter((entry) => entry.id !== head.id)
  for (const [index, entry] of remaining.entries()) {
    const position = index + 1
    if (entry.position !== position) {
      await req.payload.update({
        collection: 'waitlist-entries',
        id: entry.id,
        data: { position },
        req,
        overrideAccess: true,
      })
    }
  }

  await req.payload.create({
    collection: 'loans',
    data: {
      book: bookId,
      user: head.user,
      status: 'pending',
      loanDate: new Date().toISOString(),
    },
    req,
    overrideAccess: true,
    context: { [IS_WAITLIST_PROMOTION]: true },
  })
  delete req.context[IS_WAITLIST_PROMOTION]

  // Tell the caller (a transition) who was promoted so it can notify them.
  // Writes go on the live req.context: nested operations reassign it, so the
  // hook's `context` argument can be a stale copy by this point.
  req.context[PROMOTED_USER_ID] = head.user
}

/**
 * Member-facing create guard: a member can only create a fresh `pending`
 * request for themselves, and the shared request gates are re-checked here so
 * the REST surface cannot bypass the ones the server action enforces. Admins
 * and seed scripts (no user attached) pass through untouched.
 */
async function enforceRequestGatesOnCreate(
  data: Record<string, unknown>,
  req: PayloadRequest,
  context: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  if (!req.user || isAdmin(req.user) || context?.[IS_WAITLIST_PROMOTION]) return data

  // A member's create is always their own fresh pending request.
  data.user = req.user.id
  data.status = 'pending'

  const gates = await checkRequestGates(
    {
      payload: req.payload,
      user: req.user as unknown as Parameters<typeof checkRequestGates>[0]['user'],
      req,
    },
    Number(data.book),
  )
  if (!gates.ok) throw new Error(gates.message)

  return data
}

export const Loan: CollectionConfig = {
  slug: 'loans',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['book', 'user', 'status', 'pickupCode', 'dueDate'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    // Loans move only through the admin transitions; a borrower never edits
    // their own row.
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, context }) => {
        if (operation !== 'create') return data
        return enforceRequestGatesOnCreate(data as Record<string, unknown>, req, context)
      },
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc, context }) => {
        if (context?.[SKIP_LOAN_LIFECYCLE]) return doc
        if (operation !== 'update' || !previousDoc) return doc

        const status = doc.status
        const previousStatus = previousDoc.status
        if (!status || status === previousStatus) return doc

        const bookId = resolveId(doc.book)

        // ---- stamps written back to the loan itself ----
        const stamps: Record<string, unknown> = {}

        if (status === 'accepted') {
          if (!doc.pickupCode) {
            stamps.pickupCode = await generatePickupCode(doc.id, bookId, req)
          }
          const pickupAt = doc.pickupDate ? new Date(doc.pickupDate) : new Date()
          stamps.pickupDate = pickupAt.toISOString()
          stamps.pickupHour = formatHour(pickupAt)
        }

        if (status === 'picked_up' && !doc.dueDate) {
          const duration = await resolveLoanDuration(bookId, req)
          stamps.dueDate = addDays(new Date(), duration).toISOString()
        }

        if (status === 'returned' && !doc.returnDate) {
          stamps.returnDate = new Date().toISOString()
        }

        if (Object.keys(stamps).length > 0) {
          // Guard only the hook's own write-back, then clear it: req.context
          // outlives this operation, and a later transition on the same req
          // must run its lifecycle again.
          req.context[SKIP_LOAN_LIFECYCLE] = true
          await req.payload.update({
            collection: 'loans',
            id: doc.id,
            data: stamps,
            req,
            overrideAccess: true,
          })
          delete req.context[SKIP_LOAN_LIFECYCLE]
        }

        // ---- copy reservation / release and queue promotion ----
        if (status === 'accepted') {
          const book = await req.payload.findByID({
            collection: 'books',
            id: bookId,
            req,
            overrideAccess: true,
            depth: 0,
          })
          // A null count reads as zero copies: there is nothing to reserve.
          const available = book?.availableBooks ?? 0
          if (available <= 0) {
            throw new Error('لا توجد نسخ متاحة حالياً')
          }
          await req.payload.update({
            collection: 'books',
            id: bookId,
            data: { availableBooks: available - 1 },
            req,
            overrideAccess: true,
          })
        }

        if (status === 'returned' || status === 'refused') {
          await releaseAndPromote(bookId, previousStatus, req, context)
        }

        return doc
      },
    ],
  },
  fields: [
    { name: 'book', type: 'relationship', relationTo: 'books', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'قيد الانتظار', value: 'pending' },
        { label: 'مقبول', value: 'accepted' },
        { label: 'تم الأخذ', value: 'picked_up' },
        { label: 'تم الإرجاع', value: 'returned' },
        { label: 'مرفوض', value: 'refused' },
      ],
    },
    { name: 'loanDate', type: 'date', required: true, defaultValue: () => new Date() },
    // Stamped when the loan is picked up; a fresh request has none.
    { name: 'dueDate', type: 'date' },
    // Scheduled pickup, set at accept time (Figma: تاريخ أخذ الكتاب + hour).
    { name: 'pickupDate', type: 'date' },
    { name: 'pickupHour', type: 'text' },
    // Generated at accept time, unique per loan.
    { name: 'pickupCode', type: 'text', unique: true, index: true },
    { name: 'refusalReason', type: 'text' },
    { name: 'returnDate', type: 'date' },
    // Overdue is derived from `dueDate`; this flag makes the notification fire
    // exactly once (lazy check on read, not a scheduled job).
    { name: 'overdueNotified', type: 'checkbox', defaultValue: false },
  ],
}
