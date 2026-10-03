import type { CollectionConfig, PayloadRequest } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import {
  ACTIVE_LOAN_STATUSES,
  IS_WAITLIST_PROMOTION,
  PICKUP_WINDOW_EXPIRED,
  PICKUP_WINDOW_EXPIRY_REASON,
  PROMOTED_USER_ID,
  RESERVED_LOAN_STATUSES,
  SKIP_LOAN_LIFECYCLE,
} from '@/utils/constants/loans'
import { getLoanSettings } from '@/shared/lib/settings'
import { addDays, formatArabicDate, formatHour } from '@/shared/lib/dates'
import { checkPickupGate, checkRequestGates } from '@/shared/lib/loan-gates'
import { resolveRelationId } from '@/shared/lib/relations'
import { createNotification } from '@/features/notifications/server/create-notification'
import { notifyAdmins } from '@/features/notifications/server/audiences'
import { MemberEventAction } from '@/collections/MemberEvent'
import { memberEventOnCreate } from '@/features/profile/server/member-events'

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
    // their own row. The one exception is D6 cancellation, which is a member
    // action on their own request — and even that does not come through here:
    // `cancelLoan` writes with `overrideAccess: true` after validating
    // ownership and state itself, so this rule stays as narrow as it reads.
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
      // A loan request is the member's own action however it arrives — they
      // write it themselves, or an admin/seed writes it *for* them — so the
      // event names the row's owner, not the performing session (#178).
      memberEventOnCreate(MemberEventAction.LoanRequested, (doc) => ({
        type: 'book',
        id: resolveRelationId(doc.book),
      })),
      async ({ doc, req, operation, previousDoc, context }) => {
        if (context?.[SKIP_LOAN_LIFECYCLE]) return doc
        if (operation === 'create' && doc.status === 'pending') {
          await notifyAdmins(req, 'loanRequests', {
            type: 'loan',
            title: 'طلب إعارة جديد',
            message: 'هناك طلب إعارة ينتظر المراجعة.',
            link: '/admin-panel/loans/pending',
          })
        }
        if (operation !== 'update' || !previousDoc) return doc

        const status = doc.status
        const previousStatus = previousDoc.status
        if (!status || status === previousStatus) return doc

        const bookId = resolveRelationId(doc.book)

        // SPEC §4 / #153: verification is enforced at collection, so the hook
        // checks it too — the Payload admin surface reaches `picked_up` without
        // passing through the transition. Thrown rather than notified, and
        // deliberately so: this write is about to abort, and an alert created
        // inside it joins the same transaction and dies with it. The transition
        // (which can fail cleanly, before writing) owns the admins' warning.
        if (status === 'picked_up') {
          const borrower = await req.payload.findByID({
            collection: 'users',
            id: resolveRelationId(doc.user),
            req,
            overrideAccess: true,
            depth: 0,
          })
          const gate = checkPickupGate(borrower)
          if (!gate.ok) throw new Error(gate.message)
        }

        // ---- stamps written back to the loan itself ----
        const stamps: Record<string, unknown> = {}

        if (status === 'accepted') {
          if (!doc.pickupCode) {
            stamps.pickupCode = await generatePickupCode(doc.id, bookId, req)
          }
          const pickupAt = doc.pickupDate ? new Date(doc.pickupDate) : new Date()
          stamps.pickupDate = pickupAt.toISOString()
          stamps.pickupHour = formatHour(pickupAt)
          // D1 (#153): the window runs from acceptance, not from the slot the
          // member asked for. The form only offers *days* inside 48h of the
          // request and acceptance cannot precede it, so the day always opens
          // inside this window — but the hour can slip past it when an admin
          // accepts fast, which is why the acceptance notice below carries this
          // deadline alongside the slot rather than the slot alone.
          const { pickupWindowHours } = await getLoanSettings(req.payload, req)
          stamps.pickupWindowExpiresAt = new Date(
            Date.now() + pickupWindowHours * 60 * 60 * 1000,
          ).toISOString()
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

        // D6 (#153): a cancelled Loan unwinds exactly what an admin refusal of
        // the same Loan would unwind — the reserved copy goes back and the
        // queue moves up. `releaseAndPromote` only acts when the *previous*
        // status held a copy, so `pending -> cancelled` releases nothing (there
        // was nothing to release) and `accepted -> cancelled` hands the copy to
        // the next waiter. The notification block below deliberately does NOT
        // include `cancelled`: the member cancelled it themselves, so telling
        // them so would be noise, and D6 refuses to count it as a no-show.
        if (status === 'returned' || status === 'refused' || status === 'cancelled') {
          await releaseAndPromote(bookId, previousStatus, req, context)
        }

        // A Payload-admin edit and a custom-panel transition are the same
        // event. Emit from this hook, after stamps/copy accounting succeeded,
        // so neither surface can forget the borrower (#152).
        if (status === 'accepted' || status === 'refused') {
          const book = await req.payload.findByID({
            collection: 'books',
            id: bookId,
            req,
            overrideAccess: true,
            depth: 0,
          })
          if (status === 'accepted') {
            // `stamps` is filled for every accept above; only the pickup code
            // can come from the existing row, and only when there was none.
            const code = String(stamps.pickupCode ?? doc.pickupCode)
            const date = String(stamps.pickupDate)
            const hour = String(stamps.pickupHour)
            // D1 (#153): the slot is what the member asked for, this is when
            // the copy goes back on the shelf. They are the only thing that
            // tells a member arriving at their own approved hour that the
            // window had already closed, so both go out together.
            const windowEnd = new Date(String(stamps.pickupWindowExpiresAt))
            await createNotification({
              req,
              user: resolveRelationId(doc.user),
              type: 'loan',
              title: 'تم قبول طلب الإعارة',
              message: `تم قبول طلب استعارة «${book.title}». رمز الاستلام: ${code}. تاريخ الاستلام: ${formatArabicDate(date)} الساعة ${hour}. آخر موعد للاستلام: ${formatArabicDate(windowEnd.toISOString())} الساعة ${formatHour(windowEnd)}.`,
              link: '/user/my-loans',
              email: true,
              emailTemplate: {
                kind: 'reservation-available',
                bookTitle: book.title,
                pickupCode: code,
                pickupDate: date,
                pickupHour: hour,
              },
            })
          } else if (context?.[PICKUP_WINDOW_EXPIRED]) {
            // D1/D2 (#153): a refusal the sweep wrote is a no-show, not an
            // admin decision. The borrower is told what actually happened and
            // gets the dedicated template rather than the generic refusal.
            await createNotification({
              req,
              user: resolveRelationId(doc.user),
              type: 'loan',
              title: 'لم تُسجَّل عملية استلام الكتاب',
              message: `انتهت مهلة استلام «${book.title}» دون تسجيل، فأُعيد الكتاب إلى الرفوف وتم ترتيب قائمة الانتظار.`,
              link: '/user/my-loans',
              email: true,
              emailTemplate: {
                kind: 'no-show-warning',
                bookTitle: book.title,
                // The sentence reads "انتهت المهلة بتاريخ X", so X is when the
                // window closed, not the slot the member asked for. Guaranteed
                // non-null: the sweep only reaches this branch through its
                // `pickupWindowExpiresAt: { exists: true }` filter.
                pickupDate: String(doc.pickupWindowExpiresAt),
                reason: PICKUP_WINDOW_EXPIRY_REASON,
              },
            })
          } else {
            await createNotification({
              req,
              user: resolveRelationId(doc.user),
              type: 'loan',
              title: 'تم رفض طلب الإعارة',
              message: `تم رفض طلب استعارة «${book.title}». السبب: ${doc.refusalReason ?? ''}.`,
              link: '/user/my-loans',
              email: true,
            })
          }
        }

        const promotedUserId = req.context[PROMOTED_USER_ID]
        delete req.context[PROMOTED_USER_ID]
        if (typeof promotedUserId === 'number') {
          const book = await req.payload.findByID({
            collection: 'books',
            id: bookId,
            req,
            overrideAccess: true,
            depth: 0,
          })
          await createNotification({
            req,
            user: promotedUserId,
            type: 'waitlist',
            title: 'الكتاب متاح الآن لاستعارتك',
            message: `جاء دورك لاستعارة «${book.title}»: سُجّل طلبك بانتظار موافقة الإدارة.`,
            link: '/user/my-loans',
            email: true,
          })
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
        // D6 (#153): the member's own withdrawal, distinct from `refused` so
        // the desk can tell an administration decision from a member decision.
        { label: 'ملغى', value: 'cancelled' },
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
    // D1 (#153): the deadline for collecting an accepted Loan, stamped from the
    // Settings window at accept time and refreshed by an admin reschedule.
    // A lapsed window is what makes the sweep refuse the loan as a no-show.
    { name: 'pickupWindowExpiresAt', type: 'date', index: true },
    { name: 'refusalReason', type: 'text' },
    { name: 'returnDate', type: 'date' },
    // Overdue is derived from `dueDate`; this flag makes the notification fire
    // exactly once (lazy check on read, not a scheduled job).
    { name: 'overdueNotified', type: 'checkbox', defaultValue: false },
  ],
}
