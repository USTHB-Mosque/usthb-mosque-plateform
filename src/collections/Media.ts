import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['id', 'alt', 'url', 'filename'],
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'public/static/media/file',
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
