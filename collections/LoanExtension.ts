import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { MAX_EXTENSION_DAYS } from '@/utils/constants/loans'
import { addDays } from '@/shared/lib/dates'

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
