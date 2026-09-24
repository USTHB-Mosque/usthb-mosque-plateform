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
export const DEFAULT_BORROW_LIMIT = 5
export const MAX_EXTENSION_DAYS = 21

/** Set on `req.context` / an operation's `context` to keep the loans lifecycle
 * hook from re-entering itself when it writes back to `loans` (#19). Cleared
 * right after the guarded write: req.context outlives the operation. */
export const SKIP_LOAN_LIFECYCLE = 'skipLoanLifecycle'
/** Marks a loan create as a waitlist promotion, bypassing the request gates. */
export const IS_WAITLIST_PROMOTION = 'isWaitlistPromotion'
/** Written by the lifecycle hook so the caller knows who was promoted. */
export const PROMOTED_USER_ID = 'promotedUserId'
