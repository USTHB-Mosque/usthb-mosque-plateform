import { describe, expect, it } from 'vitest'

import { resolveDatabaseConnectionString } from '@/shared/lib/database-url'

describe('resolveDatabaseConnectionString', () => {
  it('keeps the host-facing URL untouched outside compose', () => {
    const url = 'postgresql://postgres:postgres@127.0.0.1:5432/usthb_mosque'
    expect(resolveDatabaseConnectionString(url, undefined)).toBe(url)
  })

  it('points containers at the compose host', () => {
    expect(
      resolveDatabaseConnectionString('postgresql://postgres:postgres@127.0.0.1:5432/mosque', 'db'),
    ).toBe('postgresql://postgres:postgres@db:5432/mosque')
  })

  it('preserves percent-encoded credentials', () => {
    expect(
      resolveDatabaseConnectionString('postgresql://postgres:p%23%2F@127.0.0.1:5432/mosque', 'db'),
    ).toBe('postgresql://postgres:p%23%2F@db:5432/mosque')
  })

  it('returns the URL unchanged when it is missing or unparseable', () => {
    expect(resolveDatabaseConnectionString('', 'db')).toBe('')
    expect(resolveDatabaseConnectionString(undefined, 'db')).toBe('')
    expect(resolveDatabaseConnectionString('not-a-url', 'db')).toBe('not-a-url')
  })
})
