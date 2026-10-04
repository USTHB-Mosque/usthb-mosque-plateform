import type { CollectionConfig } from 'payload'

/** Server-owned proof, never editable through the CMS, REST or GraphQL. */
export const AccountSecurity: CollectionConfig = {
  slug: 'account-security',
  admin: { hidden: true },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'reauthenticatedSessions', type: 'json', required: true, defaultValue: {} },
    { name: 'emailTwoFactorEnabled', type: 'checkbox', required: true, defaultValue: false },
    { name: 'revision', type: 'number', required: true, defaultValue: 0 },
    { name: 'recoveryCodeHashes', type: 'json', required: true, defaultValue: [] },
    { name: 'assuredSessions', type: 'json', required: true, defaultValue: {} },
  ],
}
