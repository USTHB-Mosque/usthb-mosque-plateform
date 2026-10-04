import { describe, expect, it } from 'vitest'
import { resolveDocument, resolveRelationId } from './relations'

describe('resolveRelationId', () => {
  it('passes a raw id straight through', () => {
    expect(resolveRelationId(7)).toBe(7)
  })

  it('unwraps a populated relationship document', () => {
    expect(resolveRelationId({ id: 7, title: 'كتاب' })).toBe(7)
  })

  it('yields NaN for an absent or unusable value', () => {
    expect(resolveRelationId(null)).toBeNaN()
    expect(resolveRelationId(undefined)).toBeNaN()
    expect(resolveRelationId('nope')).toBeNaN()
    expect(resolveRelationId({})).toBeNaN()
  })
})

describe('resolveDocument', () => {
  it('returns the populated relationship document', () => {
    const book = { id: 3, title: 'صحيح مسلم' }
    expect(resolveDocument<{ id: number; title: string }>(book)).toBe(book)
  })

  it('returns null when the relation is a bare id or missing', () => {
    expect(resolveDocument(3)).toBeNull()
    expect(resolveDocument(null)).toBeNull()
    expect(resolveDocument(undefined)).toBeNull()
    expect(resolveDocument({})).toBeNull()
  })
})
