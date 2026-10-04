import type { PayloadRequest } from 'payload'

import { resolveRelationId } from './relations'
import {
  EMPTY_RATING_AGGREGATE,
  REVIEW_TARGETS,
  RATING_AGGREGATE_PRECISION,
  SKIP_REVIEW_AGGREGATE,
  type ReviewTargetCollection,
  type ReviewTargetField,
} from '@/utils/constants/reviews'

/** The shape a review row has to offer: the one target it names, if any. */
export interface ReviewTarget {
  book?: unknown
  article?: unknown
}

export interface ResolvedReviewTarget {
  /** The relationship field the review filled in, e.g. `book`. */
  field: ReviewTargetField
  /** The collection that relationship points at, e.g. `books`. */
  collection: ReviewTargetCollection
  id: number
}

const sameTarget = (a: ResolvedReviewTarget, b: ResolvedReviewTarget) =>
  a.collection === b.collection && a.id === b.id

/**
 * The single target a review row names. `beforeValidate` already rejects a row
 * that names zero or two, so a null here means the row never went through that
 * gate (a raw write) and there is nothing to maintain.
 */
export function resolveReviewTarget(
  review: ReviewTarget | null | undefined,
): ResolvedReviewTarget | null {
  if (!review) return null

  for (const field of Object.keys(REVIEW_TARGETS) as ReviewTargetField[]) {
    const id = resolveRelationId(review[field])
    if (Number.isInteger(id)) return { field, collection: REVIEW_TARGETS[field], id }
  }

  return null
}

/**
 * Recomputes one target's `ratingCount` / `averageRating` from the review rows
 * that actually exist (#25). Derived, never incremented: the aggregate is a
 * function of the rows, so a create, an update and a delete all take the same
 * path and a lost write can only ever leave a stale value that the next change
 * repairs — never a drifted counter.
 *
 * The write goes through `req` so it joins the caller's transaction (a review
 * that rolls back must not leave its target updated) and deliberately bypasses
 * access control: this is system state derived from a review, while `books` and
 * `articles` are admin-only for direct edits.
 */
export async function recomputeTargetAggregate(
  req: PayloadRequest,
  target: ResolvedReviewTarget,
): Promise<void> {
  const { docs } = await req.payload.find({
    collection: 'reviews',
    where: { [target.field]: { equals: target.id } },
    req,
    overrideAccess: true,
    depth: 0,
    // Every row, not a page: the mean needs the whole set, and a capped read
    // would silently understate both the count and the average.
    limit: 0,
    select: { rating: true },
  })

  const total = docs.length
  const sum = docs.reduce((running, review) => running + (review.rating ?? 0), 0)
  const scale = 10 ** RATING_AGGREGATE_PRECISION
  const aggregate =
    total === 0
      ? EMPTY_RATING_AGGREGATE
      : {
          ratingCount: total,
          averageRating: Math.round((sum / total) * scale) / scale,
        }

  // Guard only this hook's own write-back, then clear it. `req.context`
  // outlives the operation, so a leaked guard would silently switch off the
  // recompute for every later review on the same request — hence `finally`,
  // so a failed write cannot leave the request permanently guarded.
  req.context[SKIP_REVIEW_AGGREGATE] = true
  try {
    await req.payload.update({
      collection: target.collection,
      id: target.id,
      data: aggregate,
      req,
      overrideAccess: true,
    })
  } finally {
    delete req.context[SKIP_REVIEW_AGGREGATE]
  }
}

/**
 * Maintains the aggregates of every target a review change touched — the single
 * entry point the `reviews` hooks call (#25).
 *
 * A rating edit touches one target. A *retarget* (a review re-pointed at another
 * book, or from a book to an article) touches two: the row stops counting for
 * the target it left, so recomputing only the new one would leave the old
 * target advertising a review it no longer has.
 */
export async function maintainReviewAggregates(
  req: PayloadRequest,
  change: { doc: ReviewTarget | null | undefined; previousDoc?: ReviewTarget | null },
): Promise<void> {
  const current = resolveReviewTarget(change.doc)
  if (current) await recomputeTargetAggregate(req, current)

  const previous = resolveReviewTarget(change.previousDoc)
  if (previous && (!current || !sameTarget(previous, current))) {
    await recomputeTargetAggregate(req, previous)
  }
}
