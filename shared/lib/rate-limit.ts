/**
 * Fixed-window rate limiter, in process memory.
 *
 * Scope: this covers the unauthenticated email-triggering endpoints, where an
 * open route lets anyone use the mosque's SMTP as a mail cannon. It is
 * deliberately per-process — under the Docker deployment (ADR 0002) there is one
 * instance, and adding a Redis-backed store is a premature dependency. The
 * trade-off is real and worth stating: counters reset on deploy, and a
 * multi-instance deployment would need a shared store before this is load-bearing.
 */
export interface RateLimitVerdict {
  allowed: boolean
  /** Seconds until the key may try again. Meaningless when `allowed` is true. */
  retryAfterSeconds: number
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
  /** Injectable clock, so the window can be tested without sleeping. */
  now?: number
  /**
   * Table size at which expired keys are swept. Bounds memory against a spray of
   * unique keys; defaults high enough that sweeping is rare in normal traffic.
   */
  maxKeys?: number
}

interface Bucket {
  count: number
  /** Epoch ms at which the window ends and the count resets. */
  resetAt: number
}

const DEFAULT_MAX_KEYS = 5000

const buckets = new Map<string, Bucket>()

/** Drops every key whose window has elapsed. Returns how many were removed. */
export const pruneRateLimits = (now: number = Date.now()): number => {
  let removed = 0
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
      removed += 1
    }
  }
  return removed
}

/**
 * Records an attempt against `key` and reports whether it may proceed.
 *
 * A blocked request does not extend the window: otherwise a client that retries
 * in a loop stays blocked forever, and the limiter becomes a way to lock a
 * legitimate member out of their own password reset.
 */
export const checkRateLimit = (key: string, options: RateLimitOptions): RateLimitVerdict => {
  const { limit, windowMs, maxKeys = DEFAULT_MAX_KEYS } = options
  const now = options.now ?? Date.now()

  if (buckets.size >= maxKeys) {
    pruneRateLimits(now)
  }

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) }
}

/**
 * Empties the table. The buckets are module state shared across a test worker,
 * so integration setup clears them between tests to stop one test's exhausted
 * budget leaking into the next.
 */
export const resetRateLimits = (): void => {
  buckets.clear()
}
