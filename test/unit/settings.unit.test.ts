import { describe, expect, it, vi } from 'vitest'

import { getLoanSettings } from '@/shared/lib/settings'
import {
  DEFAULT_BORROW_LIMIT,
  DEFAULT_LOAN_DURATION_DAYS,
  DEFAULT_PICKUP_WINDOW_HOURS,
} from '@/utils/constants/loans'

function fakePayloadWith(globalData: unknown) {
  return {
    findGlobal: vi.fn(async () => globalData),
  } as unknown as Parameters<typeof getLoanSettings>[0]
}

describe('getLoanSettings', () => {
  it('returns the stored settings when the row exists', async () => {
    const settings = await getLoanSettings(
      fakePayloadWith({ defaultLoanDurationDays: 7, borrowLimit: 3, pickupWindowHours: 24 }),
    )
    expect(settings).toEqual({
      defaultLoanDurationDays: 7,
      borrowLimit: 3,
      pickupWindowHours: 24,
    })
  })

  it('falls back to the platform defaults when the row is missing', async () => {
    const settings = await getLoanSettings(fakePayloadWith(null))
    expect(settings).toEqual({
      defaultLoanDurationDays: DEFAULT_LOAN_DURATION_DAYS,
      borrowLimit: DEFAULT_BORROW_LIMIT,
      pickupWindowHours: DEFAULT_PICKUP_WINDOW_HOURS,
    })
  })

  it('falls back per-field when a value is not a positive integer', async () => {
    const settings = await getLoanSettings(
      fakePayloadWith({ defaultLoanDurationDays: 0, borrowLimit: 'five', pickupWindowHours: -3 }),
    )
    expect(settings).toEqual({
      defaultLoanDurationDays: DEFAULT_LOAN_DURATION_DAYS,
      borrowLimit: DEFAULT_BORROW_LIMIT,
      pickupWindowHours: DEFAULT_PICKUP_WINDOW_HOURS,
    })
  })

  it('honours a stored pickup window so the sweep and the accept stamp agree (#153, D1)', async () => {
    const settings = await getLoanSettings(
      fakePayloadWith({ defaultLoanDurationDays: 14, borrowLimit: 3, pickupWindowHours: 6 }),
    )
    expect(settings.pickupWindowHours).toBe(6)
  })
})
