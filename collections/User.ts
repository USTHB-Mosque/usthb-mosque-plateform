import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { TOKEN_EXPIRATION_SECONDS } from '@/utils/auth-constants'
import { logActivity } from '@/utils/activity-log'

export const User: CollectionConfig = {
  slug: 'users',
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        if (operation === 'create') {
          await logActivity(req.payload, doc.id, 'account_created', undefined, req)
        }
        // `previousDoc` is the row as it was before this update, so the
        // verified transition is detected without a nested read that could
        // only ever see the post-update state.
        if (
          operation === 'update' &&
          doc.verificationStatus === 'verified' &&
          previousDoc.verificationStatus !== 'verified'
        ) {
          await logActivity(req.payload, doc.id, 'account_verified', undefined, req)
        }
        return doc
      },
    ],
  },
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
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
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
    {
      name: 'notificationPreferences',
      type: 'group',
      label: 'Notification Preferences',
      fields: [
        {
          name: 'loanRequests',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Requests',
        },
        {
          name: 'activityRegistrations',
          type: 'checkbox',
          defaultValue: true,
          label: 'Activity Registrations',
        },
        {
          name: 'loanExtensions',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Extensions',
        },
        {
          name: 'loanReturnReminder',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Return Reminder',
        },
      ],
    },
    {
      name: 'activityLog',
      type: 'array',
      maxRows: 50,
      admin: { disabled: true },
      access: {
        read: ({ req: { user }, doc }) => user?.id === doc?.id,
        create: () => false,
        update: () => false,
      },
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          options: [
            { label: 'Login', value: 'login' },
            { label: 'Password Changed', value: 'password_changed' },
            { label: 'Profile Updated', value: 'profile_updated' },
            { label: 'Account Verified', value: 'account_verified' },
            { label: 'Account Created', value: 'account_created' },
          ],
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'metadata',
          type: 'text',
        },
      ],
    },
  ],
}
