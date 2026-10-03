import { describe, expect, it } from 'vitest'
import { PERIOD_OPTIONS, resolveFrom } from './periods'

// The selector used to ignore its own `months` argument and always return "now",
// which made the three- and six-month filters request a window containing
// nothing. `resolveFrom` is the whole contract of the selector, so it is tested
// against a fixed clock rather than against whatever "now" happens to be.
const NOW = new Date('2026-10-15T12:00:00.000Z')

describe('analytics period selector (#156)', () => {
  it('starts at the beginning of the year for the year-to-date option', () => {
    expect(resolveFrom(12, true, NOW).toISOString()).toBe(new Date(2026, 0, 1).toISOString())
  })

  it('subtracts exactly the months it was given', () => {
    expect(resolveFrom(6, false, NOW).toISOString()).toBe(
      new Date('2026-04-15T12:00:00.000Z').toISOString(),
    )
    expect(resolveFrom(3, false, NOW).toISOString()).toBe(
      new Date('2026-07-15T12:00:00.000Z').toISOString(),
    )
    expect(resolveFrom(1, false, NOW).toISOString()).toBe(
      new Date('2026-09-15T12:00:00.000Z').toISOString(),
    )
  })

  it('never returns the instant it was given, so every option narrows the range', () => {
    const windows = PERIOD_OPTIONS.filter((option) => !option.startOfYear).map((option) =>
      resolveFrom(option.months, option.startOfYear, NOW).getTime(),
    )
    expect(new Set(windows).size).toBe(PERIOD_OPTIONS.length - 1)
    for (const window of windows) {
      expect(window).toBeLessThan(NOW.getTime())
    }
  })

  it('rolls into the previous year for a month count that crosses January', () => {
    expect(resolveFrom(1, false, new Date('2026-01-10T00:00:00.000Z')).getFullYear()).toBe(2025)
  })
})
