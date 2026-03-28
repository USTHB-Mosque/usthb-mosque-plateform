import { CollectionConfig } from 'payload'

export const Review: CollectionConfig = {
  slug: 'reviews',
  access: {
    read: () => true,
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'book', type: 'relationship', relationTo: 'books', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5, required: true },
    { name: 'comment', type: 'textarea' },
  ],
}
