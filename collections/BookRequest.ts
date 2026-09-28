import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { resolveRelationId } from '@/shared/lib/relations'
import { createNotification } from '@/features/notifications/server/create-notification'

/** A suggestion for a book not currently in the catalog (#152). */
export const BookRequest: CollectionConfig = {
  slug: 'book-requests',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'user', 'status', 'createdAt'] },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) =>
      !req.user ? false : isAdmin(req.user) ? true : { user: { equals: req.user.id } },
    update: ({ req }) => isAdmin(req.user),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && !isAdmin(req.user)) {
          data.user = req.user.id
          data.status = 'pending'
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || doc.status === previousDoc?.status) return doc
        if (doc.status !== 'approved' && doc.status !== 'rejected') return doc
        const approved = doc.status === 'approved'
        const note = doc.adminNote ? ` ملاحظة الإدارة: ${doc.adminNote}.` : ''
        await createNotification({
          req,
          user: resolveRelationId(doc.user),
          type: 'request',
          title: approved ? 'تمت الموافقة على طلب الكتاب' : 'تم رفض طلب الكتاب',
          message: `${approved ? 'تمت الموافقة على' : 'تم رفض'} طلب كتاب «${doc.title}».${note}`,
          link: '/library/book-requests',
          email: true,
        })
        return doc
      },
    ],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'author', type: 'text' },
    { name: 'description', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      index: true,
      options: [
        { label: 'قيد المراجعة', value: 'pending' },
        { label: 'مقبول', value: 'approved' },
        { label: 'مرفوض', value: 'rejected' },
      ],
    },
    { name: 'adminNote', type: 'textarea' },
  ],
}
