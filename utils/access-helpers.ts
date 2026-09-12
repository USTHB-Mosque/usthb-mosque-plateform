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
