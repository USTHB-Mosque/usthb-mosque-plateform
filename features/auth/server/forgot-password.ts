'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import type { PayloadRequest } from 'payload'

import { checkRateLimit } from '@/shared/lib/rate-limit'
import {
  FORGOT_PASSWORD_LIMIT,
  FORGOT_PASSWORD_WINDOW_MS,
} from '@/features/auth/password-reset-constants'

export interface RequestPasswordResetResult {
  ok: boolean
}

/**
 * The buckets this request counts against. A request has to stay inside every
 * one of them, so either dimension alone is enough to stop it.
 *
 * The address is the load-bearing key: it is the one thing the caller cannot
 * forge. `x-forwarded-for` is client-supplied and the Docker deployment
 * publishes the app directly with no proxy in front (ADR 0002), so keying on it
 * alone would let anyone rotate the header and get a fresh budget per request.
 * The client address is still counted because behind a real proxy it is the
 * dimension that stops one caller spraying many inboxes.
 */
const rateLimitKeys = (headerList: Headers | undefined, email: string): string[] => {
  const keys = [`email:${email.trim().toLowerCase()}`]

  const forwarded = headerList?.get('x-forwarded-for')
  const clientAddress = forwarded?.split(',')[0]?.trim() || headerList?.get('x-real-ip')?.trim()
  if (clientAddress) {
    keys.push(`ip:${clientAddress}`)
  }

  return keys
}

export const requestPasswordReset = async (email: string): Promise<RequestPasswordResetResult> => {
  // Read once: the same headers key the limiter and build Payload's request.
  let headerList: Headers | undefined
  try {
    headerList = await headers()
  } catch (error) {
    console.warn('forgot-password could not read request headers:', error)
  }

  const keys = rateLimitKeys(headerList, email)
  const blockedBy = keys
    .map((key) => ({
      key,
      verdict: checkRateLimit(key, {
        limit: FORGOT_PASSWORD_LIMIT,
        windowMs: FORGOT_PASSWORD_WINDOW_MS,
      }),
    }))
    .find(({ verdict }) => !verdict.allowed)

  if (blockedBy) {
    // The response is the same one a real send produces. Returning a throttle
    // error here would tell a prober which addresses are being hammered, and
    // would be a second, subtler enumeration channel.
    console.warn(
      `forgot-password rate limited (bucket ${blockedBy.key}); retry in ${blockedBy.verdict.retryAfterSeconds}s`,
    )
    return { ok: true }
  }

  try {
    const payload = await getPayload({ config })
    // Forward the real request headers so the reset email can derive its
    // link origin (x-forwarded-host) — without them Payload fabricates a
    // headerless request and the emailed link loses its host.
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
      req: { headers: headerList } as unknown as PayloadRequest,
    })
  } catch (error) {
    // The response is identical whether or not the email exists — a failed
    // send must not become an oracle for probing registered addresses.
    console.error('forgot-password request failed:', error)
  }

  return { ok: true }
}
