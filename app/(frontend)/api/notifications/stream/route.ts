import { countUnreadNotifications } from '@/features/notifications'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { subscribeToNotifications } from '@/features/notifications/server/notification-bus'

// Never cached or statically rendered: the stream is keyed to the session
// cookie and must not survive into a shared cache (#17).
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 30_000
// A nested Notification create hook runs before its parent's transaction
// commits. An immediate client refetch may see the old rows and then never
// receive another push. Retry only that new row, not every idle connection.
const COMMIT_RETRY_MS = [100, 200, 400, 800, 1_600, 3_200, 6_400, 12_800]

/**
 * Server-Sent Events stream for the signed-in user's notification badge.
 *
 * The Notification create hook pushes to connected sessions as soon as the
 * new row is visible outside the writer's transaction.
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
      const retries = new Set<ReturnType<typeof setTimeout>>()

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(timer)
        for (const retry of retries) clearTimeout(retry)
        retries.clear()
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

      const publishWhenCommitted = async (notificationId: number, attempt = 0): Promise<void> => {
        if (closed) return
        try {
          await payload.findByID({
            collection: 'notifications',
            id: notificationId,
            req,
            overrideAccess: false,
            depth: 0,
          })
          send('unread', {})
        } catch {
          // A NotFound here normally means the writer has not committed yet.
          // A rolled-back create never becomes visible and needs no event.
          if (closed || attempt === COMMIT_RETRY_MS.length) return
          const retry = setTimeout(() => {
            retries.delete(retry)
            void publishWhenCommitted(notificationId, attempt + 1)
          }, COMMIT_RETRY_MS[attempt])
          retries.add(retry)
        }
      }

      const timer = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS)
      // Subscribe before the initial count so a create during connection
      // setup cannot slip between the snapshot and subscription.
      unsubscribe = subscribeToNotifications(user.id, (id) => void publishWhenCommitted(id))
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
