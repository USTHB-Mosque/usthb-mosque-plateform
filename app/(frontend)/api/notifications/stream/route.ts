import { getPayloadWithUser } from '@/shared/lib/auth'

// Never cached or statically rendered: the stream is keyed to the session
// cookie and must not survive into a shared cache (#17).
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 30_000

/**
 * Server-Sent Events stream for the signed-in user's notification badge.
 *
 * Every 30 seconds the route emits either an `unread` event (when the unread
 * count changed since the last tick) or a heartbeat comment. The heartbeat is
 * what keeps proxies from reaping the idle connection; the data event is what
 * makes the bell go live without a websocket layer.
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

  const readUnreadCount = async () => {
    const result = await payload.count({
      collection: 'notifications',
      where: { user: { equals: user.id }, seen: { equals: false } },
      req,
      overrideAccess: false,
    })
    return result.totalDocs
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let lastCount = -1

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(timer)
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

      const heartbeat = () => write(': ping\n\n')

      const tick = async () => {
        if (closed) return
        try {
          const count = await readUnreadCount()
          if (count !== lastCount) {
            lastCount = count
            send('unread', { count })
          } else {
            heartbeat()
          }
        } catch {
          // A transient database hiccup must not kill the stream; keep the
          // heartbeat going so the connection stays alive.
          heartbeat()
        }
      }

      const timer = setInterval(() => void tick(), HEARTBEAT_MS)
      request.signal.addEventListener('abort', close)

      await tick()
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
