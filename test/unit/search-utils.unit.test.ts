import { describe, expect, it } from 'vitest'

import {
  defaultSerializers,
  detectType,
  parseSearchParams,
  serializeSearchParams,
} from '@/shared/lib/search-utils'

describe('detectType', () => {
  it('detects every primitive kind', () => {
    expect(detectType(new Date())).toBe('date')
    expect(detectType(['a'])).toBe('array')
    expect(detectType(true)).toBe('boolean')
    expect(detectType(3)).toBe('number')
    expect(detectType('str')).toBe('string')
    expect(detectType(null)).toBe('enum')
    expect(detectType(undefined)).toBe('enum')
  })
})

describe('parsers', () => {
  it('numbers parse to a number or undefined when invalid', () => {
    const defaults = { count: 0 }
    expect(parseSearchParams({ count: '5' }, defaults).count).toBe(5)
    expect(parseSearchParams({ count: 'not-a-number' }, defaults).count).toBe(0)
  })

  it('booleans only accept true and 1', () => {
    const defaults = { active: false }
    expect(parseSearchParams({ active: 'true' }, defaults).active).toBe(true)
    expect(parseSearchParams({ active: '1' }, defaults).active).toBe(true)
    expect(parseSearchParams({ active: 'yes' }, defaults).active).toBe(false)
  })

  it('dates parse yyyy-MM-dd when the default is a date, else fall back', () => {
    const defaults = { from: new Date(2025, 0, 1) }
    expect(parseSearchParams({ from: '2026-03-05' }, defaults).from).toEqual(
      new Date(2026, 2, 5),
    )
    expect(parseSearchParams({ from: 'not-a-date' }, defaults).from).toEqual(
      new Date(2025, 0, 1),
    )
  })

  it('keeps raw strings for enum-typed defaults', () => {
    const defaults = { status: null as string | null }
    expect(parseSearchParams({ status: 'open' }, defaults).status).toBe('open')
  })

  it('falls back to the default value when the stored entry is missing', () => {
    expect(parseSearchParams({}, { count: 5, q: '' }).count).toBe(5)
    expect(parseSearchParams({}, { count: 5, q: '' }).q).toBe('')
  })

  it('arrays split on commas', () => {
    const defaults = { tags: [] as string[] }
    expect(parseSearchParams({ tags: 'a,b,c' }, defaults).tags).toEqual(['a', 'b', 'c'])
  })
})

describe('serializeSearchParams', () => {
  it('drops values equal to the initial value, null and empty strings', () => {
    const initialValues = { q: 'all', page: 1, archived: false, from: null }
    const values = { q: 'all', page: 1, archived: false, from: null }
    expect(serializeSearchParams(values, initialValues)).toEqual({})
  })

  it('serializes a changed false boolean', () => {
    const initialValues = { archived: true }
    expect(serializeSearchParams({ archived: false }, initialValues)).toEqual({ archived: 'false' })
  })

  it('serializes changed values by type', () => {
    const initialValues = { q: 'all', page: 1, archived: false, tags: [] as string[] }
    const values = {
      q: 'tafsir',
      page: 3,
      archived: true,
      tags: ['hadith', 'fiqh'],
    }
    expect(serializeSearchParams(values, initialValues)).toEqual({
      q: 'tafsir',
      page: '3',
      archived: 'true',
      tags: 'hadith,fiqh',
    })
  })

  it('round trips through parse', () => {
    const initialValues = {
      q: '',
      page: 1,
      from: new Date(2025, 5, 1),
    }
    const values = { q: 'search', page: 2, from: new Date(2026, 0, 15) }

    const serialized = serializeSearchParams(values, initialValues)
    const parsed = parseSearchParams(serialized, initialValues)

    expect(parsed).toEqual(values)
  })

  it('serializes invalid dates to an empty string', () => {
    expect(
      serializeSearchParams(
        { from: new Date('not-a-date') },
        { from: new Date(2025, 0, 1) },
      ),
    ).toEqual({ from: '' })
  })

  it('serializes enum and null values defensively', () => {
    expect(defaultSerializers.enum(null)).toBe('')
    expect(defaultSerializers.enum('open' as unknown)).toBe('open')
    expect(defaultSerializers.date(new Date('not-a-date'))).toBe('')
    expect(defaultSerializers.array('not-an-array' as unknown)).toBe('')
  })

  it('honors a keyNameFn for both directions', () => {
    const keyNameFn = (key: string) => `f_${key}`
    const initialValues = { q: '' }
    const serialized = serializeSearchParams({ q: 'x' }, initialValues, undefined, keyNameFn)
    expect(serialized).toEqual({ f_q: 'x' })

    const parsed = parseSearchParams(serialized, initialValues, undefined, keyNameFn)
    expect(parsed.q).toBe('x')
  })

  it('uses a field override when provided', () => {
    const initialValues = { year: 2025 }
    const fieldsConfig = { year: { parse: (v: string) => Number(v) + 1 } }
    expect(parseSearchParams({ year: '2026' }, initialValues, fieldsConfig).year).toBe(2027)

    const serializeConfig = {
      year: { serialize: (v: number) => `y${v}` },
    }
    expect(
      serializeSearchParams({ year: 2027 }, initialValues, serializeConfig).year,
    ).toBe('y2027')
  })
})
