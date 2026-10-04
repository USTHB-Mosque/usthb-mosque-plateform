import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { Loan } from '@/payload-types'

// The barrel drags in server actions, and those reach `payload.config`, which
// needs storage credentials the jsdom project does not have. The view under
// test only needs the palette, so the module is replaced with a sentinel one.
//
// The sentinel is the point: the assertion is that the tag reads its colours
// from the shared vocabulary. Handing the test the real `statusConfig` would
// only prove the two files agree today; handing it a value nothing else uses
// proves the tag is *wired* to the vocabulary — spell the hex out again and
// this fails.
// `vi.mock` is hoisted above ordinary declarations, so the sentinels have to be
// hoisted with it to be visible inside the factory.
const { SENTINEL_PENDING, SENTINEL_COLLECTED } = vi.hoisted(() => ({
  SENTINEL_PENDING: 'sentinel-pending-bed',
  SENTINEL_COLLECTED: 'sentinel-collected-bed',
}))

vi.mock('@/features/library', () => ({
  statusConfig: {
    pending: { label: 'قيد الانتظار', className: SENTINEL_PENDING, dotClassName: '' },
    picked_up: { label: 'تم الأخذ', className: SENTINEL_COLLECTED, dotClassName: '' },
  },
}))

import PickupWindowTag from './PickupWindowTag'

const loan = (over: Partial<Loan>): Loan =>
  ({
    id: 1,
    status: 'accepted',
    ...over,
  }) as Loan

describe('PickupWindowTag', () => {
  it('takes the uncollected colour from the shared loan vocabulary (#65)', () => {
    render(<PickupWindowTag loan={loan({ status: 'accepted' })} />)

    expect(screen.getByText('لم يُسجَّل الاستلام')).toHaveClass(SENTINEL_PENDING)
  })

  it('takes the collected colour from the shared loan vocabulary (#65)', () => {
    render(<PickupWindowTag loan={loan({ status: 'picked_up' })} />)

    expect(screen.getByText('تم تسجيل الاستلام')).toHaveClass(SENTINEL_COLLECTED)
  })

  it('shows the pickup deadline when one is set', () => {
    render(<PickupWindowTag loan={loan({ pickupWindowExpiresAt: '2026-03-14T10:30:00.000Z' })} />)

    expect(screen.getByText(/نافذة الاستلام حتى/)).toBeInTheDocument()
  })

  it('says the deadline is unset rather than rendering an empty date', () => {
    render(<PickupWindowTag loan={loan({ pickupWindowExpiresAt: null })} />)

    expect(screen.getByText('نافذة الاستلام غير محددة')).toBeInTheDocument()
  })
})
