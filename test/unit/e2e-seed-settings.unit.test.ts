import { describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'

import { DEFAULT_BORROW_LIMIT } from '@/utils/constants/loans'
import { E2E_BORROW_LIMIT, seedE2eSettings } from '@/utils/seed/e2e-fixtures'

describe('seedE2eSettings', () => {
  it('raises the e2e borrow limit through an administrative Settings upsert', async () => {
    const updateGlobal = vi.fn(async () => ({}))

    await seedE2eSettings({ updateGlobal } as unknown as Payload)

    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'settings',
        data: { borrowLimit: E2E_BORROW_LIMIT },
        overrideAccess: true,
      }),
    )
  })

  it('leaves budget above the shipped limit, which the seeded journeys exhaust', () => {
    // The loan and notification journeys borrow one more book on top of
    // member1's seeded active loans, which already fill the shipped default.
    // Lowering the e2e constant back to that default re-disables the borrow
    // dialog and recreates the failure this fixture exists to prevent.
    expect(E2E_BORROW_LIMIT).toBeGreaterThan(DEFAULT_BORROW_LIMIT)
  })
})
