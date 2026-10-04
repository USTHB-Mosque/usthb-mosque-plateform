import { describe, expect, it } from 'vitest'

import { buildQuery } from '@/shared/lib/build-query'

describe('buildQuery', () => {
  it('maps arrays to an `in` clause', () => {
    expect(buildQuery({ status: ['pending', 'approved'] })).toEqual({
      and: [{ status: { in: ['pending', 'approved'] } }],
    })
  })

  it('maps strings to a `contains` clause', () => {
    expect(buildQuery({ title: 'tafsir' })).toEqual({
      and: [{ title: { contains: 'tafsir' } }],
    })
  })

  it('maps numbers and booleans to an `equals` clause', () => {
    expect(buildQuery({ ratingCount: 5, archived: true })).toEqual({
      and: [{ ratingCount: { equals: 5 } }, { archived: { equals: true } }],
    })
  })

  it('drops undefined, null and empty-string filters', () => {
    expect(
      buildQuery({
        title: undefined,
        category: null as unknown as string,
        author: '',
      }),
    ).toEqual({})
  })

  it('combines the remaining filters with and', () => {
    const where = buildQuery({ title: 'fiqh', pageCount: 100, tags: ['a', 'b'] })
    expect(where).toEqual({
      and: [
        { title: { contains: 'fiqh' } },
        { pageCount: { equals: 100 } },
        { tags: { in: ['a', 'b'] } },
      ],
    })
  })

  it('returns an empty where clause when nothing survives', () => {
    expect(buildQuery({})).toEqual({})
  })
})
