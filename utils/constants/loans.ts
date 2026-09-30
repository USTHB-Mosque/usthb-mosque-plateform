/**
 * Loan lifecycle vocabulary (#19, Figma Borrowings). The five stored states of
 * the `loans` collection. Overdue is deliberately NOT one of them: it is
 * derived from `dueDate` (see `getEffectiveLoanStatus`), decided as a lazy
 * check on read rather than a scheduled job.
 */
export const LOAN_STATUSES = ['pending', 'accepted', 'picked_up', 'returned', 'refused'] as const

export type LoanStatus = (typeof LOAN_STATUSES)[number]

/** Statuses that still hold a place in the borrower's active-loan budget. */
export const ACTIVE_LOAN_STATUSES: readonly LoanStatus[] = ['pending', 'accepted', 'picked_up']

/** Where a loan currently holds (or may hold) a physical copy. */
export const RESERVED_LOAN_STATUSES: readonly LoanStatus[] = ['accepted', 'picked_up']

/** Platform-wide fallbacks; also the `defaultValue`s of `globals/Settings.ts`. */
export const DEFAULT_LOAN_DURATION_DAYS = 14
/** D7: three concurrent books at a 14-day duration, configurable in Settings. */
export const DEFAULT_BORROW_LIMIT = 3
export const MAX_EXTENSION_DAYS = 21

/**
 * D1: how long an accepted Loan holds its reserved copy for collection,
 * measured from acceptance. Configurable per platform in Settings.
 */
export const DEFAULT_PICKUP_WINDOW_HOURS = 48

/**
 * D2: no-shows tolerated before borrowing is blocked. The block lasts until an
 * admin lifts it — `borrowingBlockedAt` carries the state, never a fixed term.
 */
export const NO_SHOW_LIMIT = 2

/** The recorded reason when a Pickup Window lapses (D1), surfaced to the admin. */
export const PICKUP_WINDOW_EXPIRY_REASON = 'انتهت مدة الاستلام'

/** Set on `req.context` / an operation's `context` to keep the loans lifecycle
 * hook from re-entering itself when it writes back to `loans` (#19). Cleared
 * right after the guarded write: req.context outlives the operation. */
export const SKIP_LOAN_LIFECYCLE = 'skipLoanLifecycle'
/** Marks a loan create as a waitlist promotion, bypassing the request gates. */
export const IS_WAITLIST_PROMOTION = 'isWaitlistPromotion'
/** Written by the lifecycle hook so the caller knows who was promoted. */
export const PROMOTED_USER_ID = 'promotedUserId'
/**
 * Set when the Pickup Window sweep refuses a loan (#153, D1) so the lifecycle
 * hook tells the borrower the no-show story instead of the generic refusal.
 * Deliberately not cleared: unlike `SKIP_LOAN_LIFECYCLE` it is a property of
 * this transition, and a later transition writes its own context.
 */
export const PICKUP_WINDOW_EXPIRED = 'pickupWindowExpired'
