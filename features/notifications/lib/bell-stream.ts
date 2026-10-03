import { notifyBellRefresh } from '@/features/notifications/lib/bell-refresh'

/**
 * One shared SSE connection per page for the unread badge (#164). The member
 * portal renders up to three bells — page header, mobile bar and drawer — and
 * one connection serves them all: the stream's `unread` tick goes through the
 * bell-refresh bus, so every mounted bell refetches in step. Refcounted, so
 * the stream closes with the last bell and reopens with the next one.
 */

let source: EventSource | null = null
let refCount = 0

/** Subscribes to the shared stream; returns the unsubscribe function. */
export function subscribeBellStream(): () => void {
  refCount += 1
  if (!source) {
    source = new EventSource('/api/notifications/stream')
    source.addEventListener('unread', notifyBellRefresh)
  }

  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    refCount -= 1
    if (refCount === 0 && source) {
      source.close()
      source = null
    }
  }
}
