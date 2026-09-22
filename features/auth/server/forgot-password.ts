'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import type { PayloadRequest } from 'payload'

export interface RequestPasswordResetResult {
  ok: boolean
}

export const requestPasswordReset = async (email: string): Promise<RequestPasswordResetResult> => {
  try {
    const payload = await getPayload({ config })
    // Forward the real request headers so the reset email can derive its
    // link origin (x-forwarded-host) — without them Payload fabricates a
    // headerless request and the emailed link loses its host.
    const headerList = await headers()
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
