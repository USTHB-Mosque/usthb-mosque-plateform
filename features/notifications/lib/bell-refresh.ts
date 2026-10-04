/**
 * A tiny window event that lets the inbox page tell the navbar bell to
 * refetch immediately after a mark-read, instead of waiting up to 30s for
 * the next SSE tick. Both sides import through the feature barrel.
 */

const BELL_REFRESH_EVENT = 'mosque:bell-refresh'

export function notifyBellRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BELL_REFRESH_EVENT))
  }
}

/** Subscribes to bell refresh nudges; returns the unsubscribe function. */
export function onBellRefresh(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(BELL_REFRESH_EVENT, handler)
  return () => window.removeEventListener(BELL_REFRESH_EVENT, handler)
}
