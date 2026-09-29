import { articleTypesConfigArray } from '@/utils/constants/articles'
import { ratingAggregateFields } from '@/utils/constants/reviews'
import { adminWriteAccess } from '@/utils/access-helpers'
import { CollectionConfig } from 'payload'
import { notifyMembers } from '@/features/notifications/server/audiences'

export const Article: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishDate'],
  },
  access: {
    read: () => true,
    ...adminWriteAccess(),
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          await notifyMembers(req, {
            type: 'article',
            title: 'مقال جديد',
            message: `نُشر المقال «${doc.title}».`,
            link: `/user/articles/${doc.id}`,
            eventKey: `bulk:article:${doc.id}`,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'publishDate',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
      defaultValue: () => new Date(),
    },
    {
      name: 'type',
      type: 'select',
      options: articleTypesConfigArray,
      required: true,
    },
    {
      name: 'author',
      type: 'text',
      required: true,
    },
    {
      name: 'tags',
      type: 'array',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Short Summary',
      maxLength: 200,
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
    },
    // Derived from the `reviews` rows targeting this article (#25), the same
    // pair `books` carries.
    ...ratingAggregateFields(),
  ],
}
