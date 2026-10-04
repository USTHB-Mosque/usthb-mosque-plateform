import type { Payload, PayloadRequest } from 'payload'
import type { LibraryCard } from '@/payload-types'

export function generateCardId(userId: number | string): string {
  return `M-${String(userId).padStart(5, '0')}`
}

/**
 * Issues a library card for a verified user and surfaces its id on the user
 * row. No-op when a card already exists, so it is safe to call on every
 * verification transition. `req` keeps the write on the caller's transaction.
 */
export async function ensureLibraryCard(
  payload: Payload,
  userId: number | string,
  req?: PayloadRequest,
): Promise<LibraryCard> {
  const existing = await payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  if (existing.totalDocs > 0) {
    return existing.docs[0] as LibraryCard
  }

  const cardId = generateCardId(userId)

  const card = (await payload.create({
    collection: 'library-cards',
    data: { cardId, user: Number(userId), status: 'active', issueDate: new Date().toISOString() },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })) as LibraryCard

  await payload.update({
    collection: 'users',
    id: userId,
    data: { cardId },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  return card
}
