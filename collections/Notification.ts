import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { NOTIFICATION_TYPES } from '@/utils/notifications'

/**
 * Server-side notification row (#17): written only through
 * `features/notifications/server/create-notification.ts` with
 * `overrideAccess: true`, read by the owner and admins, updated by the owner
 * and limited to `seen`, deleted never.
 *
 * Update is a where-constraint rather than a boolean: Payload's update
 * access receives `{ id, data, req }` without the document, so row scoping
 * has to come from the query itself.
 */
export const Notification: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['user', 'type', 'title', 'seen', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: () => false,
    update: ({ req: { user } }) => {
      if (!user) return false
      return { user: { equals: user.id } }
    },
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: () => false },
    },
    {
      name: 'type',
      type: 'select',
      options: [...NOTIFICATION_TYPES],
      defaultValue: 'system',
      access: { update: () => false },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      access: { update: () => false },
    },
    {
      name: 'message',
      type: 'text',
      required: true,
      access: { update: () => false },
    },
    {
      name: 'link',
      type: 'text',
      access: { update: () => false },
    },
    {
      name: 'seen',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'emailSent',
      type: 'checkbox',
      defaultValue: false,
      access: { update: () => false },
    },
  ],
}
