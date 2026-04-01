import { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const BookFavorite: CollectionConfig = {
  slug: 'book-favorites',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'book', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
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
          overrideAccess: true,
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
