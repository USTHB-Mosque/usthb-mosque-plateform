import { describe, expect, it } from 'vitest'

import { generateCardId } from './library-cards'

describe('generateCardId', () => {
  it('pads the member id to five digits with an M- prefix', () => {
    expect(generateCardId(1)).toBe('M-00001')
    expect(generateCardId(42)).toBe('M-00042')
    expect(generateCardId(99999)).toBe('M-99999')
  })

  it('keeps ids above five digits untouched', () => {
    expect(generateCardId(123456)).toBe('M-123456')
  })
})
