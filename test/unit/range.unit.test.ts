import { describe, expect, it } from 'vitest'

import { range } from '@/shared/lib/range'

describe('range', () => {
  it('builds an inclusive integer range', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('builds a single-element range', () => {
    expect(range(3, 3)).toEqual([3])
  })

  it('returns empty for a start greater than the end', () => {
    expect(range(3, 1)).toEqual([])
  })

  it('builds a range starting at zero', () => {
    expect(range(0, 2)).toEqual([0, 1, 2])
  })
})
