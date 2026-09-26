import { describe, expect, it } from 'vitest'
import { LibraryCard } from './LibraryCard'

describe('LibraryCard config', () => {
  it('defaults issueDate to now', () => {
    const field = LibraryCard.fields?.find((item) => 'name' in item && item.name === 'issueDate')
    expect(field).toBeDefined()
    const value = field && 'defaultValue' in field ? field.defaultValue : undefined
    expect(typeof value).toBe('function')
    const result = typeof value === 'function' ? value() : null
    expect(result).toBeInstanceOf(Date)
  })
})
