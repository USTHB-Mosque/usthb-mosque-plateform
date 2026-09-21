import type { Access, CollectionConfig } from 'payload'
import type { User } from '@/payload-types'

export function getUserRole(user: unknown): string | undefined {
  if (user && typeof user === 'object' && 'role' in user) {
    return (user as { role?: string }).role
  }
  return undefined
}

export function isAdmin(user: unknown): boolean {
  return getUserRole(user) === 'admin'
}

/** Shared admin-only write triple for public-read collections. */
export function adminWriteAccess(): Pick<
  Required<CollectionConfig>['access'],
  'create' | 'update' | 'delete'
> {
  const adminOnly: Access = ({ req: { user } }) => isAdmin(user)
  return { create: adminOnly, update: adminOnly, delete: adminOnly }
}
