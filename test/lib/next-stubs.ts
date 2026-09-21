import { vi } from 'vitest'

interface StoredCookie {
  value: string
  options?: Record<string, unknown>
}

/**
 * Mutable "request context" that the `next/headers` mock reads from. Server
 * actions called outside a Next request need this to resolve `headers()` and
 * `cookies()`; `payload.auth()` itself is called for real against the cookie
 * header set here.
 */
export const nextContext = {
  headers: {} as Record<string, string>,
  cookies: new Map<string, StoredCookie>(),
}

export function setNextHeaders(headers: Record<string, string>): void {
  nextContext.headers = headers
}

export function setNextCookie(name: string, value: string): void {
  nextContext.cookies.set(name, { value })
}

export function clearNextContext(): void {
  nextContext.headers = {}
  nextContext.cookies.clear()
}

export function getLastSetCookieOptions(name: string): StoredCookie | undefined {
  return nextContext.cookies.get(name)
}

export function makeAuthHeaders(token: string, origin?: string): Record<string, string> {
  // payload.auth refuses a cookie unless `Origin` or `Sec-Fetch-Site` proves
  // the request came from our own origin.
  return {
    cookie: `payload-token=${token}`,
    origin: origin ?? (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  }
}

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve(new Headers(nextContext.headers as Record<string, string>)),
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const stored = nextContext.cookies.get(name)
        return stored ? { name, value: stored.value } : undefined
      },
      getAll: () =>
        [...nextContext.cookies.entries()].map(([name, stored]) => ({
          name,
          value: stored.value,
        })),
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        nextContext.cookies.set(name, { value, options })
      },
      delete: (name: string) => {
        nextContext.cookies.delete(name)
      },
    }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}))
