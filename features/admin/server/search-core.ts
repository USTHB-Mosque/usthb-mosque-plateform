import type { Payload } from 'payload'
import type { User } from '@/payload-types'

/**
 * Payload cannot `contains` through relationship fields, so a free-text search
 * first resolves matching users/books to ids, then filters rows on those ids.
 *
 * A plain module, not a `'use server'` file: it is the query helper the admin
 * listings share (loans, and since #144 the waitlist), not an action anyone
 * should be able to reach from the client.
 */
export async function resolveSearchMatches(
  payload: Payload,
  user: User,
  search: string,
): Promise<{ userIds: number[]; bookIds: number[] }> {
  const [users, books] = await Promise.all([
    payload.find({
      collection: 'users',
      where: {
        or: [
          { email: { contains: search } },
          { fullName: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      },
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'books',
      where: {
        or: [
          { title: { contains: search } },
          { code: { contains: search } },
          { author: { contains: search } },
        ],
      },
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ])

  return {
    userIds: users.docs.map((doc) => doc.id),
    bookIds: books.docs.map((doc) => doc.id),
  }
}
