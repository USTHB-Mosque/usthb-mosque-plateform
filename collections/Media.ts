import type { Access, CollectionConfig, Where } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

const readAccess: Access = ({ req: { user } }) => {
  if (isAdmin(user)) return true

  const notPrivate: Where = { isPrivate: { not_equals: true } }
  if (!user) return notPrivate

  const ownedByViewer: Where = { owner: { equals: user.id } }
  return { or: [notPrivate, ownedByViewer] }
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['id', 'alt', 'url', 'filename', 'isPrivate'],
  },
  access: {
    read: readAccess,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'isPrivate',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'وثائق التحقق من الهوية فقط. لا يمكن لغير المالك أو الإدارة الوصول إليها.',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        position: 'sidebar',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
  ],
}
