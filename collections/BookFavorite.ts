import { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { resolveRelationId } from '@/shared/lib/relations'
import { MemberEventAction } from '@/collections/MemberEvent'
import { memberEventOnCreate } from '@/features/profile/server/member-events'

export const BookFavorite: CollectionConfig = {
  slug: 'book-favorites',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'book', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المستخدم',
    },
    {
      name: 'book',
      type: 'relationship',
      relationTo: 'books',
      required: true,
      label: 'الكتاب',
    },
  ],
  hooks: {
    afterChange: [
      // The favorite row is deletable by design; the record that the member
      // once added the book is not (#178).
      memberEventOnCreate(MemberEventAction.BookFavorited, (doc) => ({
        type: 'book',
        id: resolveRelationId(doc.book),
      })),
    ],
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data?.book) return
        const userId = data.user ?? req.user?.id
        if (!userId) return
        const dup = await req.payload.find({
          collection: 'book-favorites',
          where: {
            and: [{ user: { equals: userId } }, { book: { equals: data.book } }],
          },
          limit: 1,
          req,
          // The row is always the creator's own (`beforeChange` below stamps
          // `req.user.id`), and that is exactly the row scoping the read
          // access applies here — so the duplicate check runs under the same
          // access rules as every other read (#152).
          overrideAccess: false,
        })
        if (dup.totalDocs > 0) {
          throw new APIError('هذا الكتاب موجود بالفعل في المفضلة', 400)
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.user = req.user.id
        }
      },
    ],
  },
}
