import { articleTypesConfigArray } from '@/utils/constants/articles'
import { CollectionConfig } from 'payload'

export const Article: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishDate'],
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
  ],
}
