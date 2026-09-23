import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ getPayloadWithUser: vi.fn() }))

import { GET } from './route'
import { getPayloadWithUser } from '@/shared/lib/auth'

const mockGetPayloadWithUser = vi.mocked(getPayloadWithUser)

const STREAM_URL = 'http://localhost/api/notifications/stream'

describe('notifications SSE stream route (#17)', () => {
  afterEach(() => {
    mockGetPayloadWithUser.mockReset()
  })

  it('refuses anonymous callers with 401', async () => {
    mockGetPayloadWithUser.mockResolvedValue(null)

    const response = await GET(new Request(STREAM_URL))

    expect(response.status).toBe(401)
  })

  it('sends the proxy-safe headers and the initial unread count', async () => {
    mockGetPayloadWithUser.mockResolvedValue({
      payload: { count: vi.fn().mockResolvedValue({ totalDocs: 7 }) },
      user: { id: 5 },
      req: {},
    } as never)

    const controller = new AbortController()
    const response = await GET(new Request(STREAM_URL, { signal: controller.signal }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    expect(response.headers.get('x-accel-buffering')).toBe('no')

    const reader = response.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    expect(first).toContain('event: unread')
    expect(first).toContain('"count":7')

    controller.abort()
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
  })

  it('heartbeats when the count is unchanged and survives a transient database error', async () => {
    const countMock = vi
      .fn<() => Promise<{ totalDocs: number }>>()
      .mockResolvedValueOnce({ totalDocs: 3 }) // connect: changed → data event
      .mockResolvedValueOnce({ totalDocs: 3 }) // first tick: unchanged → ping
      .mockRejectedValueOnce(new Error('db hiccup')) // second tick: error → ping
      .mockResolvedValueOnce({ totalDocs: 9 }) // third tick: changed again → unread
    mockGetPayloadWithUser.mockResolvedValue({
      payload: { count: countMock },
      user: { id: 5 },
      req: {},
    } as never)

    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const response = await GET(new Request(STREAM_URL, { signal: controller.signal }))
      const reader = response.body!.getReader()

      const first = new TextDecoder().decode((await reader.read()).value)
      expect(first).toContain('event: unread')
      expect(first).toContain('"count":3')

      await vi.advanceTimersByTimeAsync(30_000)
      const ping = new TextDecoder().decode((await reader.read()).value)
      expect(ping).toContain(': ping')

      await vi.advanceTimersByTimeAsync(30_000)
      const survived = new TextDecoder().decode((await reader.read()).value)
      expect(survived).toContain(': ping')

      await vi.advanceTimersByTimeAsync(30_000)
      const secondUnread = new TextDecoder().decode((await reader.read()).value)
      expect(secondUnread).toContain('event: unread')
      expect(secondUnread).toContain('"count":9')

      controller.abort()
      await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
    } finally {
      vi.useRealTimers()
    }
  })
})
