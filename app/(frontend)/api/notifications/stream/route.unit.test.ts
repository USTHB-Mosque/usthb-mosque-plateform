import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ getPayloadWithUser: vi.fn() }))

import { GET } from './route'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { publishNotificationCreated } from '@/features/notifications/server/notification-bus'

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

  it('pushes only to the recipient immediately and heartbeats without querying', async () => {
    const countMock = vi.fn().mockResolvedValue({ totalDocs: 3 })
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
      expect(countMock).toHaveBeenCalledTimes(1)

      publishNotificationCreated(99)
      publishNotificationCreated(5)
      const pushed = new TextDecoder().decode((await reader.read()).value)
      expect(pushed).toContain('event: unread')
      expect(countMock).toHaveBeenCalledTimes(1)

      controller.abort()
      await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
    } finally {
      vi.useRealTimers()
    }
  })

  it('survives an initial count error and accepts a later push', async () => {
    mockGetPayloadWithUser.mockResolvedValue({
      payload: { count: vi.fn().mockRejectedValue(new Error('db hiccup')) },
      user: { id: 5 },
      req: {},
    } as never)
    const controller = new AbortController()
    const response = await GET(new Request(STREAM_URL, { signal: controller.signal }))
    const reader = response.body!.getReader()
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(': ping')
    publishNotificationCreated(5)
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: unread')
    controller.abort()
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
