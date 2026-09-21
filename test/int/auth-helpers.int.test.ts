import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  clearNextContext,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'

import type { Payload } from 'payload'
import { getAuthenticatedUser, getPayloadWithUser, isAdmin, requireUser } from '@/shared/lib/auth'
import type { User } from '@/payload-types'

let payload: Payload
let member: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'helper-member@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function signIn(user: Pick<User, 'email'> & { email: string }): Promise<void> {
  const { token } = await loginToken(payload, { email: user.email, password: 'correct horse battery' })
  setNextHeaders(makeAuthHeaders(token))
}

describe('getAuthenticatedUser', () => {
  it('returns undefined for anonymous callers', async () => {
    expect(await getAuthenticatedUser()).toBeUndefined()
  })

  it('returns the member for a valid cookie', async () => {
    await signIn(member)
    expect((await getAuthenticatedUser())?.id).toBe(member.id)
  })

  it('rejects admins unless allowAdmin is passed', async () => {
    await signIn(admin)
    expect(await getAuthenticatedUser()).toBeUndefined()
    expect((await getAuthenticatedUser({ allowAdmin: true }))?.id).toBe(admin.id)
  })
})

describe('getPayloadWithUser', () => {
  it('returns null for anonymous callers', async () => {
    expect(await getPayloadWithUser()).toBeNull()
  })

  it('returns a bound request for a member', async () => {
    await signIn(member)
    const ctx = await getPayloadWithUser()
    expect(ctx?.user.id).toBe(member.id)
    expect(ctx?.req).toBeTruthy()
  })

  it('rejects admins unless allowAdmin is passed', async () => {
    await signIn(admin)
    expect(await getPayloadWithUser()).toBeNull()
    expect((await getPayloadWithUser({ allowAdmin: true }))?.user.id).toBe(admin.id)
  })
})

describe('requireUser', () => {
  it('redirects anonymous callers', async () => {
    await expect(requireUser('/auth/login')).rejects.toThrow()
  })

  it('returns the context for a signed-in member', async () => {
    await signIn(member)
    const ctx = await requireUser()
    expect(ctx.user.id).toBe(member.id)
  })
})

describe('isAdmin', () => {
  it('discriminates roles', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(member)).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})
