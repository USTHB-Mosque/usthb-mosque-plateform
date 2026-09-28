import { countUnreadNotifications } from '@/features/notifications'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { subscribeToNotifications } from '@/features/notifications/server/notification-bus'

// Never cached or statically rendered: the stream is keyed to the session
// cookie and must not survive into a shared cache (#17).
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 30_000

/**
 * Server-Sent Events stream for the signed-in user's notification badge.
 *
 * The Notification create hook pushes to connected sessions immediately.
 * Heartbeats keep proxies from reaping idle connections without running
 * a database count for every open stream on every interval.
 *
 * Two headers are load-bearing in production:
 * - `X-Accel-Buffering: no` — Nginx buffers `text/event-stream` by default,
 *   which would hold every event in its buffer until it fills.
 * - `Cache-Control: no-cache` — nothing here may be cached.
 */
export async function GET(request: Request) {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  const { payload, user, req } = ctx
  const encoder = new TextEncoder()

  const readUnreadCount = () => countUnreadNotifications({ payload, user, req } as typeof ctx)

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let unsubscribe = () => {}

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(timer)
        unsubscribe()
        request.signal.removeEventListener('abort', close)
        try {
          controller.close()
        } catch {
          // The controller was already closed by the consumer.
        }
      }

      const write = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          close()
        }
      }

      const send = (event: string, data: unknown) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

      const timer = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS)
      // Subscribe before the initial count so a create during connection
      // setup cannot slip between the snapshot and subscription.
      unsubscribe = subscribeToNotifications(user.id, () => send('unread', {}))
      request.signal.addEventListener('abort', close)
      try {
        send('unread', { count: await readUnreadCount() })
      } catch {
        // Transient read failures do not drop the stream: the next create
        // will still push a refresh to the Bell.
        write(': ping\n\n')
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
