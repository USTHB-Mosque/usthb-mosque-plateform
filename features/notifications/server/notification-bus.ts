/** In-process fan-out for the single-instance Docker deployment (ADR 0002). */
type Listener = () => void
type Bus = Map<number, Set<Listener>>

// Route handlers and Payload hooks can be compiled into different module
// graphs by Next; they still share one process-global registry.
const key = Symbol.for('usthb.notifications.listeners')
const scope = globalThis as typeof globalThis & { [key]?: Bus }
const listeners = (scope[key] ??= new Map())

export function subscribeToNotifications(userId: number, listener: Listener): () => void {
  const group = listeners.get(userId) ?? new Set<Listener>()
  group.add(listener)
  listeners.set(userId, group)
  return () => {
    group.delete(listener)
    if (group.size === 0) listeners.delete(userId)
  }
}

export function publishNotificationCreated(userId: number): void {
  for (const listener of listeners.get(userId) ?? []) {
    try {
      listener()
    } catch {
      // A disconnected SSE consumer must never roll back the row being written.
    }
  }
}
