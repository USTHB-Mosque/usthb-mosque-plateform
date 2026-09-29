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
 * A target with no reviews left reports `0` rather than null: the aggregate
 * columns are `min: 0` with a `0` default, and the rating widgets render the
 * number directly — a null would draw an empty star row and a bare
 * `() تقييم`.
 */
export const EMPTY_RATING_AGGREGATE = { ratingCount: 0, averageRating: 0 } as const

/** Aggregates are stored on a `numeric` column; two decimals is display precision. */
export const RATING_AGGREGATE_PRECISION = 2
