import { CollectionConfig } from 'payload'

export const Admins: CollectionConfig = {
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
