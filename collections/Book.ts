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
      options: [
        { label: 'عقيدة', value: 'aqidah' },
        { label: 'فقه', value: 'fiqh' },
        { label: 'حديث', value: 'hadith' },
        { label: 'تفسير', value: 'tafsir' },
        { label: 'سيرة', value: 'sirah' },
        { label: 'علوم القرآن', value: 'quranic-sciences' },
        { label: 'دعوة', value: 'dawah' },
        { label: 'تاريخ', value: 'history' },
        { label: 'فلسفة', value: 'philosophy' },
        { label: 'منطق', value: 'logic' },
        { label: 'رياضيات', value: 'mathematics' },
        { label: 'فيزياء', value: 'physics' },
        { label: 'كيمياء', value: 'chemistry' },
        { label: 'أحياء', value: 'biology' },
        { label: 'هندسة', value: 'engineering' },
        { label: 'طب', value: 'medicine' },
        { label: 'اقتصاد', value: 'economics' },
        { label: 'سياسة', value: 'politics' },
        { label: 'اجتماع', value: 'sociology' },
        { label: 'علم نفس', value: 'psychology' },
        { label: 'لغة', value: 'language' },
        { label: 'أدب', value: 'literature' },
        { label: 'فنون', value: 'arts' },
        { label: 'أخرى', value: 'other' },
      ],
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'علمي', value: 'scientific' },
        { label: 'ديني', value: 'religious' },
      ],
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
