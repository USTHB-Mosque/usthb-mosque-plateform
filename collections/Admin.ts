import { CollectionConfig } from 'payload'

export const Admin: CollectionConfig = {
  slug: 'admins',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'email',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
}
