import type { Payload, PayloadRequest } from 'payload'

import {
  DEFAULT_BORROW_LIMIT,
  DEFAULT_LOAN_DURATION_DAYS,
  DEFAULT_PICKUP_WINDOW_HOURS,
} from '@/utils/constants/loans'

export interface LoanSettings {
  defaultLoanDurationDays: number
  borrowLimit: number
  /** D1 (#153): hours an accepted Loan waits for collection. */
  pickupWindowHours: number
}

function positiveInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * Reads the Settings global (#19): the per-platform loan duration fallback and
 * the per-borrower borrow limit. The migration seeds the single row, so real
 * values are expected; the named constants below are the last-resort fallback
 * for a row read as empty, not loan logic constants.
 */
export async function getLoanSettings(
  payload: Payload,
  req?: PayloadRequest,
): Promise<LoanSettings> {
  const settings = (await payload.findGlobal({
    slug: 'settings',
    ...(req ? { req } : {}),
    overrideAccess: true,
    depth: 0,
  })) as {
    defaultLoanDurationDays?: unknown
    borrowLimit?: unknown
    pickupWindowHours?: unknown
  } | null

  const defaultLoanDurationDays =
    positiveInt(settings?.defaultLoanDurationDays) ?? DEFAULT_LOAN_DURATION_DAYS
  const borrowLimit = positiveInt(settings?.borrowLimit) ?? DEFAULT_BORROW_LIMIT
  const pickupWindowHours = positiveInt(settings?.pickupWindowHours) ?? DEFAULT_PICKUP_WINDOW_HOURS

  return { defaultLoanDurationDays, borrowLimit, pickupWindowHours }
}
