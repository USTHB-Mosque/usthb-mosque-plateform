import { describe, expect, it } from 'vitest'

import { PICKUP_TIME_SLOTS, pickupDayOptions } from './pickup-days'

// September/October 2026: Sun 4 Oct is a plain weekday, Fri 2 Oct and
// Thu 1 Oct bracket the closed day, and the whole span is in one month so
// the date arithmetic below reads as calendar arithmetic.
const SUNDAY_9AM = new Date(2026, 9, 4, 9, 0)
const offsets = (from: Date) => pickupDayOptions(from).map((opt) => opt.offset)

describe('pickupDayOptions', () => {
  it('offers today alongside tomorrow and the day after', () => {
    const options = pickupDayOptions(SUNDAY_9AM)

    expect(options.map((opt) => opt.offset)).toEqual([0, 1, 2])
    expect(options.map((opt) => opt.date.getDate())).toEqual([4, 5, 6])
    // Both hours, all day — nothing has passed yet.
    expect(options.every((opt) => opt.slots.length === 2)).toBe(true)
  })

  it('never offers an hour that has already gone today', () => {
    // Noon: the 11:00 slot is behind us, 13:00 is not.
    const noon = pickupDayOptions(new Date(2026, 9, 4, 12, 0))
    expect(noon[0].offset).toBe(0)
    expect(noon[0].slots).toEqual(['13:00'])
  })

  it('drops today entirely once its hours are gone, and keeps the rest', () => {
    const evening = pickupDayOptions(new Date(2026, 9, 4, 14, 0))

    expect(evening.map((opt) => opt.offset)).toEqual([1, 2])
    expect(evening.every((opt) => opt.slots.length === 2)).toBe(true)
  })

  it('steps over Friday', () => {
    // Thursday 1 Oct: tomorrow is Friday, so Saturday takes its place.
    expect(offsets(new Date(2026, 9, 1, 9, 0))).toEqual([0, 2])
    // Wednesday 30 Sep: Friday is two days out, so there is no third option.
    expect(offsets(new Date(2026, 8, 30, 9, 0))).toEqual([0, 1])
    // Friday itself: today is closed and cannot be offered at all.
    expect(offsets(new Date(2026, 9, 2, 9, 0))).toEqual([1, 2])
  })

  it('offers every hour of a future day, whatever the hour', () => {
    const [, tomorrow] = pickupDayOptions(SUNDAY_9AM)

    expect([...tomorrow.slots]).toEqual([...PICKUP_TIME_SLOTS])
  })

  it('never runs out of days, at any hour of any day', () => {
    for (let day = 0; day <= 20; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const options = pickupDayOptions(new Date(2026, 9, 1 + day, hour, 30))
        expect(options.length).toBeGreaterThan(0)
      }
    }
  })

  it('stops at the day after tomorrow — D1’s window in calendar terms', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(offsets(new Date(2026, 9, 4, hour, 0)).every((offset) => offset <= 2)).toBe(true)
    }
  })
})
