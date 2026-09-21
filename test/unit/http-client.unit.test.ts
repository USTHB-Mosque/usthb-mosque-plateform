import { afterEach, describe, expect, it, vi } from 'vitest'

process.env.NEXT_PUBLIC_API_URL = 'http://api.test'

import { httpClient } from '@/shared/lib/http-client'

interface StubResponse {
  ok?: boolean
  status?: number
  statusText?: string
  json?: unknown
}

function stubFetch(response: StubResponse = {}) {
  const fetchMock = vi.fn(
    () =>
      Promise.resolve({
        ok: response.ok ?? true,
        status: response.status ?? 200,
        statusText: response.statusText ?? 'OK',
        json: () => Promise.resolve(response.json ?? { ok: true }),
      } as unknown as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('httpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('get builds the api URL from NEXT_PUBLIC_API_URL', async () => {
    const fetchMock = stubFetch({ json: { data: 1 } })

    const result = await httpClient.get<{ data: number }>('/books')

    expect(result).toEqual({ data: 1 })
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/books', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: undefined,
    })
  })

  it('normalizes a path without a leading slash and passes absolute URLs through', async () => {
    const fetchMock = stubFetch()

    await httpClient.get('books')
    await httpClient.get('http://other.test/absolute')

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.test/api/books', expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://other.test/absolute', expect.anything())
  })

  it('throws on a non-ok response', async () => {
    stubFetch({ ok: false, status: 500, statusText: 'Internal Server Error' })

    await expect(httpClient.get('/books')).rejects.toThrow('HTTP 500: Internal Server Error')
  })

  it('post serializes the body as JSON', async () => {
    const fetchMock = stubFetch({ json: { created: true } })

    const result = await httpClient.post('/loans', { bookId: 1 })

    expect(result).toEqual({ created: true })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ bookId: 1 }))
  })

  it('put serializes the body as JSON', async () => {
    const fetchMock = stubFetch()

    await httpClient.put('/users/1', { fullName: 'x' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ fullName: 'x' }))
  })

  it('delete sends no body', async () => {
    const fetchMock = stubFetch()

    await httpClient.delete('/book-favorites/1')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/api/book-favorites/1')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('redirects to login on a 401 when useAuth is enabled', async () => {
    stubFetch({ ok: false, status: 401 })
    const replace = vi.fn()
    vi.stubGlobal('window', { location: { pathname: '/user', replace } })

    await expect(httpClient.get('/loans', { useAuth: true })).rejects.toThrow('HTTP 401')

    expect(replace).toHaveBeenCalledWith('/auth/login?redirect=%2Fuser')
  })

  it('does not redirect on a 401 when useAuth is not enabled', async () => {
    stubFetch({ ok: false, status: 401 })
    const replace = vi.fn()
    vi.stubGlobal('window', { location: { pathname: '/user', replace } })

    await expect(httpClient.get('/loans')).rejects.toThrow('HTTP 401')

    expect(replace).not.toHaveBeenCalled()
  })

  it('falls back to a relative path when NEXT_PUBLIC_API_URL is unset', async () => {
    const original = process.env.NEXT_PUBLIC_API_URL
    delete process.env.NEXT_PUBLIC_API_URL
    try {
      const fetchMock = stubFetch()

      await httpClient.get('/books')

      expect(fetchMock).toHaveBeenCalledWith('/api/books', expect.anything())
    } finally {
      process.env.NEXT_PUBLIC_API_URL = original
    }
  })

  it('throws on a non-ok post', async () => {
    stubFetch({ ok: false, status: 400, statusText: 'Bad Request' })

    await expect(httpClient.post('/loans', {})).rejects.toThrow('HTTP 400: Bad Request')
  })

  it('throws on a non-ok put', async () => {
    stubFetch({ ok: false, status: 403, statusText: 'Forbidden' })

    await expect(httpClient.put('/users/1', {})).rejects.toThrow('HTTP 403: Forbidden')
  })

  it('throws on a non-ok delete', async () => {
    stubFetch({ ok: false, status: 404, statusText: 'Not Found' })

    await expect(httpClient.delete('/book-favorites/1')).rejects.toThrow('HTTP 404: Not Found')
  })

  it('merges custom headers', async () => {
    const fetchMock = stubFetch()

    await httpClient.get('/loans', { headers: { 'X-Custom': 'yes' } })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Custom': 'yes',
    })
  })
})
