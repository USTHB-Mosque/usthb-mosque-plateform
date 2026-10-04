import type { CollectionConfig } from 'payload'

/** Opaque, short-lived server-owned verification attempts. */
export const AuthChallenge: CollectionConfig = {
  slug: 'auth-challenges',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      options: ['enroll', 'login', 'reauth', 'email'],
      index: true,
    },
    { name: 'nonceHash', type: 'text', required: true, unique: true },
    { name: 'codeHash', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'sessionId', type: 'text' },
    { name: 'revision', type: 'number', required: true },
    { name: 'attempts', type: 'number', required: true, defaultValue: 0 },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'consumedAt', type: 'date' },
  ],
}
