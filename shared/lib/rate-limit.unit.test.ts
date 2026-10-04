import { describe, expect, it, beforeEach } from 'vitest'

import { checkRateLimit, pruneRateLimits, resetRateLimits } from './rate-limit'

const T0 = 1_700_000_000_000
const at = (offsetMs: number) => ({ limit: 3, windowMs: 60_000, now: T0 + offsetMs })

describe('shared/lib/rate-limit.ts', () => {
  beforeEach(() => {
    resetRateLimits()
  })

  it('allows requests up to the limit and then blocks', () => {
    expect(checkRateLimit('ip', at(0))).toEqual({ allowed: true, retryAfterSeconds: 60 })
    expect(checkRateLimit('ip', at(0)).allowed).toBe(true)
    expect(checkRateLimit('ip', at(0)).allowed).toBe(true)

    const blocked = checkRateLimit('ip', at(0))
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(60)
  })

  it('keeps counting down the retry hint as the window drains', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip', at(0))

    const at30s = checkRateLimit('ip', at(30_000))
    expect(at30s.allowed).toBe(false)
    expect(at30s.retryAfterSeconds).toBe(30)
  })

  it('starts a fresh window once it elapses', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip', at(0))
    expect(checkRateLimit('ip', at(0)).allowed).toBe(false)

    const later = checkRateLimit('ip', at(60_001))
    expect(later.allowed).toBe(true)
    expect(later.retryAfterSeconds).toBe(60)
  })

  it('gives each key its own budget', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip-a', at(0))

    expect(checkRateLimit('ip-a', at(0)).allowed).toBe(false)
    expect(checkRateLimit('ip-b', at(0)).allowed).toBe(true)
  })

  it('does not extend the window when a blocked request retries', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip', at(0))

    // Hammering while blocked must not push the reset time out, or a client
    // that retries in a loop locks a legitimate member out of their own reset.
    checkRateLimit('ip', at(50_000))
    expect(checkRateLimit('ip', at(60_001)).allowed).toBe(true)
  })

  it('never reports a zero-second retry hint', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip', at(0))

    // One millisecond before the window ends, still in the same window.
    const nearly = checkRateLimit('ip', at(59_999))
    expect(nearly.allowed).toBe(false)
    expect(nearly.retryAfterSeconds).toBe(1)
  })

  it('prunes expired keys and reports how many went', () => {
    checkRateLimit('ip-a', at(0))
    checkRateLimit('ip-b', at(0))
    expect(pruneRateLimits(T0 + 30_000)).toBe(0)
    expect(pruneRateLimits(T0 + 60_001)).toBe(2)
    expect(pruneRateLimits(T0 + 60_001)).toBe(0)
  })

  it('sweeps expired keys when the table exceeds its cap, keeping live ones', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit(`ip-${i}`, { ...at(0), maxKeys: 3 })
    }

    // ip-0..2 went stale relative to the sweep at T0+30_000; ip-3 and ip-4 are
    // still live, so the cap sweep must not have cleared the table wholesale.
    checkRateLimit('ip-4', { ...at(30_000), maxKeys: 3 })
    expect(checkRateLimit('ip-4', { ...at(30_000), maxKeys: 3 }).allowed).toBe(true)

    // The stale keys were evicted, so they start over rather than staying blocked.
    expect(checkRateLimit('ip-0', { ...at(30_000), maxKeys: 3 }).allowed).toBe(true)
  })
})
