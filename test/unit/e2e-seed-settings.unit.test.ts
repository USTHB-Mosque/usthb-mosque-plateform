import { describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'

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
})
