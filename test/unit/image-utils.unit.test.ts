import { describe, expect, it } from 'vitest'

import { getImageUrl } from '@/shared/lib/image-utils'

describe('getImageUrl', () => {
  it('returns the fallback for undefined and null', () => {
    const fallback = '/static/images/ramadan.png'
    expect(getImageUrl(undefined, fallback)).toBe(fallback)
    expect(getImageUrl(null, fallback)).toBe(fallback)
  })

  it('returns the default fallback when none is given', () => {
    expect(getImageUrl(undefined)).toBe('/static/images/ramadan.png')
  })

  it('returns the fallback for localhost and 127.0.0.1 URLs', () => {
    const fallback = '/static/images/fallback.png'
    expect(
      getImageUrl('http://localhost:54321/storage/v1/object/public/media/x.png', fallback),
    ).toBe(fallback)
    expect(
      getImageUrl('http://127.0.0.1:54321/storage/v1/object/public/media/x.png', fallback),
    ).toBe(fallback)
  })

  it('passes through a real remote URL', () => {
    const url = 'https://media.example.com/media/x.png'
    expect(getImageUrl(url, '/static/images/fallback.png')).toBe(url)
  })
})
