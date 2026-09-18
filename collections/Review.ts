import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

export const Review: CollectionConfig = {
  slug: 'reviews',
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req }) => {
      if (isAdmin(req.user)) return true
      return false
    },
    delete: ({ req }) => {
      if (isAdmin(req.user)) return true
      return false
    },
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'book', type: 'relationship', relationTo: 'books', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5, required: true },
    { name: 'comment', type: 'textarea' },
  ],
}
