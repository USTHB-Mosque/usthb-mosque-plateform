import { CollectionConfig } from 'payload'

export const Review: CollectionConfig = {
  slug: 'reviews',
  access: {
    read: () => true,
    create: () => true,
    update: ({ req }) => {
      if (req.user?.collection === 'admins') return true
      return false
    },
    delete: ({ req }) => {
      if (req.user?.collection === 'admins') return true
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
