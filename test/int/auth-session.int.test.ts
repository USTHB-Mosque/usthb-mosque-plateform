import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import {
  clearNextContext,
  getLastSetCookieOptions,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'
import { createTestUser, loginToken } from '../lib/seed'

import type { Payload } from 'payload'
import { login } from '@/features/auth/server/login'
import { logout } from '@/features/auth/server/logout'
import { createSessionForUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import type { User } from '@/payload-types'

// One shared instance for the whole file; destroyed exactly once at the very
// end — destroying it per describe would strand every later operation.
let payload: Payload

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('login', () => {
  it('rejects a wrong password', async () => {
    const user = await createTestUser(payload, { email: 'login@usthb.dz', password: 'correct-pass' })
    const { user: logged } = await login('login@usthb.dz', 'wrong-pass')
    expect(logged).toBeUndefined()
    expect(String(user.id)).toBeTruthy()
  })

  it('rejects an unknown email', async () => {
    await createTestUser(payload, { email: 'known@usthb.dz', password: 'correct-pass' })
    const { user: logged } = await login('nobody@usthb.dz', 'correct-pass')
    expect(logged).toBeUndefined()
  })

  it('accepts the correct password and sets the cookie', async () => {
    const user = await createTestUser(payload, { email: 'accept@usthb.dz', password: 'correct-pass' })
    const { user: logged } = await login('accept@usthb.dz', 'correct-pass')

    expect(logged?.id).toBe(user.id)
    const cookie = getLastSetCookieOptions('payload-token')
    expect(cookie?.value).toBeTruthy()
  })

  it('locks the account after 5 failed attempts', async () => {
    await createTestUser(payload, { email: 'lock@usthb.dz', password: 'correct-pass' })

    for (let i = 0; i < 5; i += 1) {
      const result = await login('lock@usthb.dz', 'wrong-pass')
      expect(result.user).toBeUndefined()
    }

    // Auth-only columns are hidden from docs; check the row directly.
    const rows = await payload.db.pool.query(
      `SELECT id FROM users WHERE email = 'lock@usthb.dz' AND login_attempts = '5' AND lock_until IS NOT NULL`,
    )
    expect(rows.rowCount).toBe(1)

    // Even the correct password must be refused while locked.
    const { user: logged } = await login('lock@usthb.dz', 'correct-pass')
    expect(logged).toBeUndefined()
  })
})

describe('logout', () => {
  it('removes the users_sessions row and refuses the old token afterwards', async () => {
    const user = await createTestUser(payload, { email: 'out@usthb.dz', password: 'correct-pass' })
    const { token } = await loginToken(payload, { email: user.email!, password: 'correct-pass' })

    const before = await payload.db.pool.query(
      `SELECT count(*)::int AS n FROM users_sessions WHERE _parent_id = $1`,
      [user.id],
    )
    expect(before.rows[0].n).toBe(1)

    setNextHeaders(makeAuthHeaders(token))
    await logout()

    const after = await payload.db.pool.query(
      `SELECT count(*)::int AS n FROM users_sessions WHERE _parent_id = $1`,
      [user.id],
    )
    expect(after.rows[0].n).toBe(0)

    const refused = await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })
    expect(refused.user).toBeNull()
  })

  it('does nothing for an anonymous caller', async () => {
    const result = await logout()
    expect(result).toEqual({ ok: true })
  })
})

describe('payload.auth cookie hardening', () => {
  it('refuses a cookie without Origin or Sec-Fetch-Site', async () => {
    const user = await createTestUser(payload, { email: 'origin@usthb.dz', password: 'correct-pass' })
    const { token } = await loginToken(payload, { email: user.email!, password: 'correct-pass' })

    const response = await payload.auth({
      headers: new Headers({ cookie: `payload-token=${token}` }),
    })
    expect(response.user).toBeNull()
  })

  it('accepts the cookie with a same-origin Origin header', async () => {
    const user = await createTestUser(payload, { email: 'origin2@usthb.dz', password: 'correct-pass' })
    const { token } = await loginToken(payload, { email: user.email!, password: 'correct-pass' })

    const response = await payload.auth({
      headers: new Headers(makeAuthHeaders(token)),
    })
    expect(response.user?.id).toBe(user.id)
  })
})

describe('createSessionForUser', () => {
  it('mints a token payload.auth accepts, appends exactly one session and drops expired ones', async () => {
    const user = await createTestUser(payload, { email: 'oauth@usthb.dz', password: 'correct-pass' })
    const now = new Date()

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        sessions: [
          {
            id: 'expired-session',
            createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'live-session',
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      overrideAccess: true,
    })

    const refreshed = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })
    const { token } = await createSessionForUser(payload, refreshed as User)

    const auth = await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })
    expect(auth.user?.id).toBe(user.id)

    const after = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })
    expect(after.sessions).toHaveLength(2)
    const sessionIds = (after.sessions ?? []).map((s) => s.id)
    expect(sessionIds).toContain('live-session')
    expect(sessionIds).not.toContain('expired-session')
  })

  it('works for a user with no sessions at all', async () => {
    const fresh = await createTestUser(payload, { email: 'oauth-fresh@usthb.dz', password: 'correct-pass' })
    const { token } = await createSessionForUser(payload, fresh)

    const auth = await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })
    expect(auth.user?.id).toBe(fresh.id)
  })
})

describe('setPayloadTokenCookie', () => {
  it('derives maxAge from exp and sets the httpOnly / sameSite / secure flags', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600

    await setPayloadTokenCookie('some-token', exp)

    const cookie = getLastSetCookieOptions('payload-token')
    expect(cookie?.value).toBe('some-token')
    const options = cookie?.options as {
      httpOnly: boolean
      sameSite: string
      secure: boolean
      path: string
      maxAge: number
    }
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    expect(options.secure).toBe(true)
    expect(options.path).toBe('/')
    // exp is in the future, so the cookie outlives "now" by ~1h minus elapsed.
    expect(options.maxAge).toBeGreaterThan(3500)
    expect(options.maxAge).toBeLessThanOrEqual(3600)
  })

  it('falls back to the shared token expiration when exp is missing', async () => {
    await setPayloadTokenCookie('some-token')

    const cookie = getLastSetCookieOptions('payload-token')
    expect((cookie?.options as { maxAge: number }).maxAge).toBe(60 * 60 * 24 * 7)
  })
})
