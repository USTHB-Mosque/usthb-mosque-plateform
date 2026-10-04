import { describe, expect, it } from 'vitest'

import { buildMonthGrid, FIVE_ROW_CELLS, gregorianToHijri } from './CalendarWidget'

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

describe('buildMonthGrid', () => {
  it('returns 5 rows (35 cells) for a month that fits, padding the next month', () => {
    // March 2026: starts Sunday (firstDay 1), 31 days -> 32 real cells.
    const grid = buildMonthGrid(1, 31, 28)

    expect(grid).toHaveLength(FIVE_ROW_CELLS)
    expect(grid[0]).toEqual({ day: 28, prevMonth: true })
    expect(grid[1]).toEqual({ day: 1 })
    expect(grid[31]).toEqual({ day: 31 })
    expect(grid[32]).toEqual({ day: 1, nextMonth: true })
    expect(grid[34]).toEqual({ day: 3, nextMonth: true })
  })

  it('returns 5 rows for a month that fills exactly 35 cells', () => {
    // July 2026: starts Wednesday (firstDay 4), 31 days -> exactly 35 cells.
    const grid = buildMonthGrid(4, 31, 30)

    expect(grid).toHaveLength(FIVE_ROW_CELLS)
    expect(grid.filter((cell) => cell.nextMonth)).toHaveLength(0)
  })

  it('returns 6 rows only when the month overflows 35 cells', () => {
    // May 2026: starts Friday (firstDay 6), 31 days -> 37 real cells.
    const grid = buildMonthGrid(6, 31, 30)

    expect(grid).toHaveLength(42)
    expect(grid[36]).toEqual({ day: 31 })
    expect(grid.filter((cell) => cell.nextMonth)).toHaveLength(5)
    expect(grid[37]).toEqual({ day: 1, nextMonth: true })
    expect(grid[41]).toEqual({ day: 5, nextMonth: true })
  })

  it('never emits a partial week', () => {
    for (let firstDay = 0; firstDay <= 6; firstDay++) {
      for (const daysInMonth of [28, 29, 30, 31]) {
        const grid = buildMonthGrid(firstDay, daysInMonth, 30)
        expect(grid.length % 7).toBe(0)
        expect(grid.length === 35 || grid.length === 42).toBe(true)
      }
    }
  })

  it('labels leading days backwards from the end of the previous month', () => {
    // Starts Friday: the six leading cells are the last 6 days of April.
    const grid = buildMonthGrid(6, 31, 30)

    expect(grid.slice(0, 6).map((cell) => cell.day)).toEqual([25, 26, 27, 28, 29, 30])
    expect(grid.slice(0, 6).every((cell) => cell.prevMonth)).toBe(true)
  })
})
