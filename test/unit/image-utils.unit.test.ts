import { describe, expect, it } from 'vitest'

import { getImageUrl, getProtectedMediaUrl } from '@/shared/lib/image-utils'

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

  it('uses locally served Payload media instead of the fallback', () => {
    const url = 'http://localhost:3000/api/media/file/book-cover.png'
    expect(getImageUrl(url)).toBe(url)
  })

  it('passes through a real remote URL', () => {
    const url = 'https://media.example.com/media/x.png'
    expect(getImageUrl(url, '/static/images/fallback.png')).toBe(url)
  })
})

describe('getProtectedMediaUrl', () => {
  it('keeps a same-origin Payload media path', () => {
    const url = '/api/media/file/certificate.png'
    expect(getProtectedMediaUrl(url)).toBe(url)
  })

  it('rebuilds an absolute Payload media URL as a same-origin path', () => {
    expect(getProtectedMediaUrl('https://mosque.example.dz/api/media/file/cert.png')).toBe(
      '/api/media/file/cert.png',
    )
  })

  it('refuses a storage bucket URL', () => {
    expect(getProtectedMediaUrl('http://127.0.0.1:9000/media/media/cert.png')).toBeNull()
    expect(getProtectedMediaUrl('https://s3.example.com/bucket/media/cert.png')).toBeNull()
  })

  it('refuses a missing or malformed URL', () => {
    expect(getProtectedMediaUrl(undefined)).toBeNull()
    expect(getProtectedMediaUrl(null)).toBeNull()
    expect(getProtectedMediaUrl('')).toBeNull()
    expect(getProtectedMediaUrl('undefined')).toBeNull()
    expect(getProtectedMediaUrl('/uploads/cert.png')).toBeNull()
  })

  it('refuses an absolute URL it cannot even parse', () => {
    expect(getProtectedMediaUrl('http://')).toBeNull()
  })
})
