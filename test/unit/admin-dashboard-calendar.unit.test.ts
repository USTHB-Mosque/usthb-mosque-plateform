import { describe, expect, it } from 'vitest'

import type { Book, Loan } from '@/payload-types'
import {
  buildCalendarEvents,
  buildCalendarEventsForLoans,
  buildCalendarEventsForPickups,
} from '@/components/admin-views/dashboard/calendar-events'

function loan(overrides: Partial<Loan>): Loan {
  return {
    id: 1,
    book: { id: 1, title: 'الفوائد' } as Book,
    user: 2,
    status: 'accepted',
    ...overrides,
  } as Loan
}

describe('buildCalendarEventsForPickups', () => {
  it('marks the pickup date and labels it as a pickup', () => {
    const events = buildCalendarEventsForPickups([
      loan({ id: 1, pickupDate: '2026-09-30T09:00:00.000Z' }),
    ])

    expect(events).toEqual([
      { date: '2026-09-30T09:00:00.000Z', label: 'استلام: الفوائد', kind: 'pickup' },
    ])
  })

  it('skips a loan with no pickup date', () => {
    expect(buildCalendarEventsForPickups([loan({ id: 1 })])).toEqual([])
  })

  it('falls back to a generic label when the book relation is not populated', () => {
    const events = buildCalendarEventsForPickups([
      loan({ id: 1, book: undefined, pickupDate: '2026-09-30T09:00:00.000Z' }),
    ])

    expect(events[0].label).toBe('استلام: كتاب')
  })
})

describe('buildCalendarEventsForLoans', () => {
  it('marks the due date and labels it as a return', () => {
    const events = buildCalendarEventsForLoans([
      loan({ id: 1, status: 'picked_up', dueDate: '2026-10-14T09:00:00.000Z' }),
    ])

    expect(events).toEqual([
      { date: '2026-10-14T09:00:00.000Z', label: 'إرجاع: الفوائد', kind: 'return' },
    ])
  })

  it('skips a loan with no due date', () => {
    expect(buildCalendarEventsForLoans([loan({ id: 1 })])).toEqual([])
  })
})

describe('buildCalendarEvents', () => {
  it('lists pickups before returns so the hover popover leads with collection', () => {
    const events = buildCalendarEvents(
      [loan({ id: 1, pickupDate: '2026-09-30T09:00:00.000Z' })],
      [loan({ id: 2, status: 'picked_up', dueDate: '2026-10-14T09:00:00.000Z' })],
    )

    expect(events.map((event) => event.kind)).toEqual(['pickup', 'return'])
  })

  it('returns an empty list when there is nothing to mark', () => {
    expect(buildCalendarEvents([], [])).toEqual([])
  })

  it('tolerates a missing list rather than throwing', () => {
    // A server/client shape drift must not white-screen the whole dashboard.
    expect(buildCalendarEvents()).toEqual([])
    expect(buildCalendarEventsForPickups()).toEqual([])
    expect(buildCalendarEventsForLoans()).toEqual([])
  })
})
