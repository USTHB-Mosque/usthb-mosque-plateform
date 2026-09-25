import { describe, expect, it } from 'vitest'

import { gregorianToHijri } from './CalendarWidget'

describe('gregorianToHijri', () => {
  it('converts 1 Muharram 1446 (8 July 2024)', () => {
    expect(gregorianToHijri(new Date(2024, 6, 8))).toEqual({ year: 1446, month: 0, day: 1 })
  })

  it('matches the dashboard caption example: 18 شعبان 1446 (17 February 2025)', () => {
    expect(gregorianToHijri(new Date(2025, 1, 17))).toEqual({ year: 1446, month: 7, day: 18 })
  })

  it('converts the current month (25 September 2026) and the gregorian new year', () => {
    expect(gregorianToHijri(new Date(2026, 8, 25))).toEqual({ year: 1448, month: 3, day: 12 })
    expect(gregorianToHijri(new Date(2026, 0, 1))).toEqual({ year: 1447, month: 6, day: 12 })
  })

  it('never produces a day outside the tabular month range (1..30)', () => {
    let date = new Date(2026, 0, 1)
    for (let i = 0; i < 500; i++) {
      const hijri = gregorianToHijri(date)
      expect(hijri.day).toBeGreaterThanOrEqual(1)
      expect(hijri.day).toBeLessThanOrEqual(30)
      expect(hijri.month).toBeGreaterThanOrEqual(0)
      expect(hijri.month).toBeLessThanOrEqual(11)
      date.setDate(date.getDate() + 1)
    }
  })
})
