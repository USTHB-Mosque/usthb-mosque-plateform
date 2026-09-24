'use server'

import { getStaffCtx } from './ctx'
import type { Where } from 'payload'

export async function getAdminLibraryStats() {
  const { payload, user } = await getStaffCtx()

  const [totalBooks, borrowedBooks] = await Promise.all([
    payload.find({
      collection: 'books',
      where: { deletedAt: { exists: false } } satisfies Where,
      depth: 0,
      limit: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'loans',
      where: {
        status: { in: ['accepted', 'picked_up'] },
      },
      depth: 0,
      limit: 0,
      overrideAccess: false,
      user,
    }),
  ])

  const total = totalBooks.totalDocs
  const borrowed = borrowedBooks.totalDocs
  const available = Math.max(0, total - borrowed)
  const lost = 0

  return {
    stats: {
      totalBooks: total,
      borrowedBooks: borrowed,
      availableBooks: available,
      lostBooks: lost,
    },
  }
}
