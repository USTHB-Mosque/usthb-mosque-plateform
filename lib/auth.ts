import { createLocalReq, getPayload } from 'payload'
import type { Payload, PayloadRequest } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@/payload-types'
import { TOKEN_EXPIRATION_SECONDS } from '@/utils/auth-constants'

export interface AuthOptions {
  allowAdmin?: boolean
}

export async function getAuthenticatedUser(
  opts?: AuthOptions,
): Promise<User | undefined> {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const response = await payload.auth({ headers })

  if (!response.user) return undefined

  const user = response.user as User

  if (!opts?.allowAdmin && user.role === 'admin') return undefined

  return user
}

export async function getPayloadWithUser(
  opts?: AuthOptions,
): Promise<{
  payload: Payload
  user: User
  req: PayloadRequest
} | null> {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const auth = await payload.auth({ headers })

  if (!auth.user) return null

  const user = auth.user as User

  if (!opts?.allowAdmin && user.role === 'admin') return null

  const req = await createLocalReq({ user }, payload)
  return { payload, user, req }
}

export async function requireUser(redirectTo = '/auth', opts?: AuthOptions) {
  const ctx = await getPayloadWithUser(opts)
  if (!ctx) redirect(redirectTo)
  return ctx
}

export async function setPayloadTokenCookie(token: string, exp?: number) {
  const cookieStore = await nextCookies()
  const maxAge = exp
    ? Math.max(0, exp - Math.floor(Date.now() / 1000))
    : TOKEN_EXPIRATION_SECONDS

  cookieStore.set('payload-token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge,
  })
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin'
}
