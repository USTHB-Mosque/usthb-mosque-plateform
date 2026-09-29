import type { Field } from 'payload'

/**
 * Review vocabulary (#25). A review row targets exactly one collection (#103),
 * and both targets carry the same pair of aggregate fields, so everything that
 * maintains a rating aggregate is written against the *target* rather than
 * against books.
 */
export const REVIEW_TARGETS = {
  book: 'books',
  article: 'articles',
} as const

export type ReviewTargetField = keyof typeof REVIEW_TARGETS

export type ReviewTargetCollection = (typeof REVIEW_TARGETS)[ReviewTargetField]

/**
 * Opts a review write out of the aggregate recompute (#25), and is set by the
 * recompute itself around its own write-back to the target.
 *
 * Callers set it to batch: a flow that rewrites many reviews and wants one
 * recompute at the end passes it on those writes instead of paying for a full
 * re-read of the rows per row. The hook sets it so a target-side hook that
 * ever writes a review cannot ping-pong against the recompute.
 *
 * The hook clears it in a `finally`: `req.context` outlives the operation, so a
 * leaked flag would silently switch the recompute off for every later review on
 * the same request.
 */
export const SKIP_REVIEW_AGGREGATE = 'skipReviewAggregate'

/**
 * A target with no reviews left reports `0` rather than null (#25).
 *
 * The two are indistinguishable to the one consumer, which already coerces
 * (`BookPreview` renders `averageRating || 0`), so this is not about display:
 * `0` is what the field's own `min`/`defaultValue` and the column default
 * already say, and it is what the regression test written red in #96 asserts.
 * A null would add a second spelling of "no reviews yet" for no gain.
 */
export const EMPTY_RATING_AGGREGATE = { ratingCount: 0, averageRating: 0 } as const

/** Aggregates are stored on a `numeric` column; two decimals is display precision. */
export const RATING_AGGREGATE_PRECISION = 2

/**
 * The aggregate pair every review target carries, so a book and an article
 * cannot drift apart (#25). Returned from a factory rather than shared as a
 * constant: Payload mutates field objects while it builds a collection config,
 * and each collection must get its own.
 *
 * `update: () => false` is what makes these *derived* rather than merely
 * recomputed — an admin typing an average by hand is the same bug as the seed
 * fiction, so the field refuses a direct write and only the `reviews` hooks
 * (which run with `overrideAccess: true`) may set it.
 */
export function ratingAggregateFields(): Field[] {
  return [
    {
      name: 'ratingCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      access: { update: () => false },
    },
    {
      name: 'averageRating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      access: { update: () => false },
    },
  ]
}
