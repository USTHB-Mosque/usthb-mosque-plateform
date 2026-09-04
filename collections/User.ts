import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { TOKEN_EXPIRATION_SECONDS } from '@/utils/auth-constants'

export const User: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => isAdmin(user),
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => isAdmin(user),
  },
  auth: {
    tokenExpiration: TOKEN_EXPIRATION_SECONDS,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'verificationStatus'],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'fullName',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'faculty',
      type: 'text',
    },
    {
      name: 'studyYear',
      type: 'select',
      options: ['1', '2', '3', '4', '5'],
    },
    {
      name: 'sub',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: ['admin', 'user'],
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'verificationDocument',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'verificationStatus',
      type: 'select',
      defaultValue: 'pending_verification',
      options: ['pending_verification', 'verified', 'rejected'],
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'verificationNote',
      type: 'text',
      admin: {
        condition: ({ siblingData }) =>
          siblingData?.verificationStatus === 'rejected',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'consentGiven',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: () => false,
      },
    },
    {
      name: 'consentTimestamp',
      type: 'date',
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'deletionScheduledFor',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: ({ siblingData }) => Boolean(siblingData?.deletedAt),
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
  ],
}
