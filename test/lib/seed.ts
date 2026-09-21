import { createLocalReq } from 'payload'
import type { Payload, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

interface TestUserOptions {
  email?: string
  password?: string
  fullName?: string
  role?: 'admin' | 'user'
  verified?: boolean
}

let counter = 0

export async function createTestUser(
  payload: Payload,
  opts: TestUserOptions = {},
): Promise<User> {
  counter += 1
  const email = opts.email ?? `member${counter}@test.usthb.dz`
  const password = opts.password ?? 'correct horse battery'
  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      fullName: opts.fullName ?? `Test Member ${counter}`,
      role: opts.role ?? 'user',
      verificationStatus: opts.verified ? 'verified' : 'pending_verification',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })
  return user as User
}

export interface ActionCtx {
  payload: Payload
  user: User
  req: PayloadRequest
}

/** The `{ payload, user, req }` context server actions pass around. */
export async function ctxFor(payload: Payload, user: User): Promise<ActionCtx> {
  const req = await createLocalReq({ user }, payload)
  return { payload, user, req }
}

export async function loginToken(
  payload: Payload,
  user: { email: string; password: string },
): Promise<{ token: string; exp?: number }> {
  const { token, exp } = await payload.login({
    collection: 'users',
    data: { email: user.email, password: user.password },
  })
  return { token: token as string, exp }
}
