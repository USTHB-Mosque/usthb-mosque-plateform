import { bookCategoriesConfigArray, bookTypesConfigArray } from '@/utils/constants/books'
import { languagesConfigArray } from '@/utils/constants/data'
import { CollectionConfig } from 'payload'

export const Book: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'author',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: bookTypesConfigArray,
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      options: bookCategoriesConfigArray,
      defaultValue: 'religious',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true,
    },
    {
      name: 'longDescription',
      type: 'richText',
    },

    {
      name: 'ratingCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'averageRating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
    },
    {
      name: 'publisher',
      type: 'text',
    },
    {
      name: 'language',
      type: 'select',
      options: languagesConfigArray,
    },
    {
      name: 'pageCount',
      type: 'number',
    },
    {
      name: 'isbn',
      type: 'text',
      unique: true,
    },
    {
      name: 'editionNumber',
      type: 'text',
    },
    {
      name: 'publishDate',
      type: 'date',
    },
    {
      name: 'availableBooks',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'totalBooks',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
