import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { addDays } from '@/shared/lib/dates'
import { resolveRelationId } from '@/shared/lib/relations'

/** The grace period a soft-deleted account survives before the purge. */
export const ERASURE_GRACE_DAYS = 30

/**
 * Soft-deletes an account: stamps the deletion timestamps, destroys the
 * Verification Document at once, and revokes every session so the cookie the
 * member is holding stops working immediately.
 *
 * The Verification Document goes now rather than at purge time because it is
 * the piece of personal data Law 18-07 requires us to stop holding as soon as
 * the member asks; the rest of the row is kept for the 30-day grace window so
 * the deletion can still be reversed.
 */
export async function softDeleteUserAccount(
  payload: Payload,
  userId: number | string,
  req?: PayloadRequest,
): Promise<User> {
  // `findByID` throws NotFound for an unknown id, so a missing account needs no
  // guard here; the caller sees the same failure either way.
  await payload.findByID({
    collection: 'users',
    id: Number(userId),
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  const deletedAt = new Date()
  const user = (await payload.update({
    collection: 'users',
    id: Number(userId),
    data: {
      deletedAt: deletedAt.toISOString(),
      deletionScheduledFor: addDays(deletedAt, ERASURE_GRACE_DAYS).toISOString(),
    },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })) as User

  // Each step returns the row as it stands afterwards, so the value handed
  // back to the caller is the settled state — the media pointers must read as
  // cleared, not as they were before erasure ran.
  const withoutMedia = await destroyVerificationDocument(payload, user, req)
  const withoutSessions = await revokeUserSessions(payload, withoutMedia, req)

  return withoutSessions
}

/** Destroys the Verification Document and any profile picture the member owns. */
async function destroyVerificationDocument(
  payload: Payload,
  user: User,
  req?: PayloadRequest,
): Promise<User> {
  const mediaIds = [user.verificationDocument, user.profilePicture]
    .map(resolveRelationId)
    .filter((id) => Number.isInteger(id))

  if (mediaIds.length === 0) return user

  const updated = (await payload.update({
    collection: 'users',
    id: user.id,
    data: { verificationDocument: null, profilePicture: null },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })) as User

  for (const id of mediaIds) {
    // A member's own uploads are not theirs to keep past erasure, so the
    // deletion runs with the access override the admin panel would otherwise
    // gate behind `isAdmin`.
    await payload.delete({
      collection: 'media',
      id,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })
  }

  return updated
}

/**
 * Drops every session so any JWT already issued stops validating. Payload
 * checks the token's `sid` against the stored session on each `me`/refresh, so
 * clearing the array revokes the cookie without a token blacklist.
 */
async function revokeUserSessions(
  payload: Payload,
  user: User,
  req?: PayloadRequest,
): Promise<User> {
  return (await payload.update({
    collection: 'users',
    id: user.id,
    data: { sessions: [] },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })) as User
}

/**
 * Permanently deletes every account whose grace window has elapsed. Accounts
 * that are merely soft-deleted but not yet due — and accounts that were never
 * soft-deleted at all — are left alone.
 *
 * Returns how many accounts were purged.
 */
export async function purgeDeletedAccounts(
  payload: Payload,
  now: Date = new Date(),
  batchSize = 100,
): Promise<number> {
  let purged = 0

  for (;;) {
    const due = await payload.find({
      collection: 'users',
      where: {
        and: [
          { deletedAt: { exists: true } },
          { deletionScheduledFor: { less_than_equal: now.toISOString() } },
        ],
      },
      limit: batchSize,
      depth: 0,
      overrideAccess: true,
    })

    if (due.docs.length === 0) break

    for (const doc of due.docs) {
      await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true })
      purged += 1
    }

    // A batch smaller than the limit means the queue is drained; without this
    // the loop would spin forever once the last page is short.
    if (due.docs.length < batchSize) break
  }

  return purged
}
