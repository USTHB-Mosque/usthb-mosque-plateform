import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

/**
 * FIFO waitlist for a book (#19). Rows are only ever written through the loan
 * request transition and the post-return promotion: `position` is stamped
 * server-side (end of the queue) and queue rows are admin-managed, so members
 * get row-scoped reads and nothing else.
 */
export const WaitlistEntry: CollectionConfig = {
  slug: 'waitlist-entries',
  admin: { useAsTitle: 'id', defaultColumns: ['book', 'user', 'position', 'createdAt'] },
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

        const bookId = data.book as number
        if (!bookId) return data

        // The duplicate guard is a member-facing invariant; admins and seed
        // scripts (no user attached) queue rows directly.
        if (req.user && !isAdmin(req.user)) {
          const existing = await req.payload.count({
            collection: 'waitlist-entries',
            where: {
              and: [{ book: { equals: bookId } }, { user: { equals: req.user.id } }],
            },
            req,
            overrideAccess: true,
          })
          if (existing.totalDocs > 0) {
            throw new Error('أنت بالفعل في قائمة الانتظار لهذا الكتاب')
          }
        }

        // The queue position is always computed here, never trusted from the
        // client: a new joiner goes to the end of their book's FIFO queue.
        const tail = await req.payload.find({
          collection: 'waitlist-entries',
          where: { book: { equals: bookId } },
          sort: '-position',
          limit: 1,
          req,
          overrideAccess: true,
          depth: 0,
        })
        const currentMax = tail.docs[0]?.position ?? 0

        return { ...data, position: currentMax + 1 }
      },
    ],
  },
  fields: [
    { name: 'book', type: 'relationship', relationTo: 'books', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'position', type: 'number', required: true },
  ],
}
