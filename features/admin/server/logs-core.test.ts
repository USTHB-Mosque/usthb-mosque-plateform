import { describe, expect, it } from 'vitest'
import { groupLogsByDay } from './logs-core'

describe('groupLogsByDay', () => {
  it('groups same-day entries and starts a new group on a different day', () => {
    const first = new Date(2026, 0, 3, 10).toISOString()
    const same = new Date(2026, 0, 3, 9).toISOString()
    const previous = new Date(2026, 0, 2, 12).toISOString()
    const grouped = groupLogsByDay([
      { timestamp: first },
      { timestamp: same },
      { timestamp: previous },
    ])
    expect(grouped).toHaveLength(2)
    expect(grouped[0].items).toHaveLength(2)
    expect(grouped[1].items).toHaveLength(1)
    expect(grouped.every((group) => !group.isToday)).toBe(true)
  })

  it('returns no groups for an empty list', () => {
    expect(groupLogsByDay([])).toEqual([])
  })
})
