import { describe, expect, it } from 'vitest'
import { resolveRelationId } from './relations'

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
