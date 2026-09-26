import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

/**
 * One review model covering books and articles (#103): a row targets exactly
 * one of the two, enforced in `beforeValidate` because Payload cannot express
 * a peer-to-peer relationship.
 */
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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const hasBook = data.book != null
        const hasArticle = data.article != null
        if (hasBook === hasArticle) {
          throw new Error('يجب أن يستهدف التقييم كتاباً أو مقالاً واحداً بالضبط')
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'book', type: 'relationship', relationTo: 'books' },
    { name: 'article', type: 'relationship', relationTo: 'articles' },
    { name: 'rating', type: 'number', min: 1, max: 5, required: true },
    { name: 'comment', type: 'textarea' },
  ],
}
