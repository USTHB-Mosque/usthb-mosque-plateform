import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { MAX_EXTENSION_DAYS } from '@/utils/constants/loans'
import { addDays } from '@/shared/lib/dates'
import { resolveRelationId } from '@/shared/lib/relations'
import { formatArabicDate } from '@/shared/lib/dates'
import { createNotification } from '@/features/notifications/server/create-notification'

/**
 * Loan extension requests (#19). A member requests an extension on a loan they
 * hold; the row is stamped entirely from the server (the borrower from the
 * loan, both due dates from the loan's current due date plus `days`), so a
 * hostile client cannot grant itself years. Approval always happens through
 * the admin transition.
 */
export const LoanExtension: CollectionConfig = {
  slug: 'loan-extensions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['loan', 'user', 'status', 'originalDueDate', 'newDueDate'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        const loanId = data.loan as number
        if (!loanId) return data

        const loan = await req.payload.findByID({
          collection: 'loans',
          id: loanId,
          req,
          overrideAccess: true,
          depth: 0,
        })
        if (!loan || loan.status !== 'picked_up') {
          throw new Error('يمكن طلب التمديد للكتب التي تم أخذها فقط')
        }

        const pending = await req.payload.count({
          collection: 'loan-extensions',
          where: {
            and: [{ loan: { equals: loanId } }, { status: { equals: 'pending' } }],
          },
          req,
          overrideAccess: true,
        })
        if (pending.totalDocs > 0) {
          throw new Error('لديك بالفعل طلب تمديد قيد المراجعة لهذه الإعارة')
        }

        const days = data.days
        if (
          typeof days !== 'number' ||
          !Number.isInteger(days) ||
          days < 1 ||
          days > MAX_EXTENSION_DAYS
        ) {
          throw new Error(`يمكن التمديد من يوم واحد إلى ${MAX_EXTENSION_DAYS} يوماً`)
        }

        const originalDueDate = loan.dueDate ? new Date(loan.dueDate) : new Date()

        return {
          ...data,
          // The borrower of the loan, never a client-supplied user.
          user: loan.user,
          status: 'pending',
          originalDueDate: originalDueDate.toISOString(),
          newDueDate: addDays(originalDueDate, days).toISOString(),
        }
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc || doc.status === previousDoc.status) return doc
        if (doc.status !== 'approved' && doc.status !== 'refused') return doc

        const loanId = resolveRelationId(doc.loan)
        const loan = await req.payload.findByID({
          collection: 'loans',
          id: loanId,
          req,
          overrideAccess: true,
          depth: 0,
        })
        const bookId = resolveRelationId(loan.book)
        const book = await req.payload.findByID({
          collection: 'books',
          id: bookId,
          req,
          overrideAccess: true,
          depth: 0,
        })
        const response = doc.adminResponse
        if (doc.status === 'approved') {
          // The admin's direct Payload edit must move the due date too.
          await req.payload.update({
            collection: 'loans',
            id: loanId,
            data: { dueDate: doc.newDueDate },
            req,
            overrideAccess: true,
          })
        }
        const approved = doc.status === 'approved'
        const message = approved
          ? `تم تمديد إعارة «${book.title}» حتى ${formatArabicDate(doc.newDueDate)}.${response ? ` ملاحظة الإدارة: ${response}.` : ''}`
          : `تم رفض طلب تمديد إعارة «${book.title}».${response ? ` السبب: ${response}.` : ''}`
        await createNotification({
          req,
          user: resolveRelationId(doc.user),
          type: 'extension',
          title: approved ? 'تمت الموافقة على التمديد' : 'تم رفض طلب التمديد',
          message,
          link: '/user/my-loans',
          email: true,
          emailTemplate: approved
            ? {
                kind: 'extension-approved',
                bookTitle: book.title,
                newDueDate: String(doc.newDueDate),
                response,
              }
            : { kind: 'extension-rejected', bookTitle: book.title, reason: response },
        })
        return doc
      },
    ],
  },
  fields: [
    { name: 'loan', type: 'relationship', relationTo: 'loans', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'قيد المراجعة', value: 'pending' },
        { label: 'مقبول', value: 'approved' },
        { label: 'مرفوض', value: 'refused' },
      ],
    },
    { name: 'days', type: 'number', required: true, min: 1 },
    { name: 'reason', type: 'text' },
    { name: 'adminResponse', type: 'text' },
    { name: 'originalDueDate', type: 'date' },
    { name: 'newDueDate', type: 'date' },
  ],
}
