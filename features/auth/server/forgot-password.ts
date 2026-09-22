'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'

export interface RequestPasswordResetResult {
  ok: boolean
}

export const requestPasswordReset = async (email: string): Promise<RequestPasswordResetResult> => {
  try {
    const payload = await getPayload({ config })
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
    })
  } catch (error) {
    // The response is identical whether or not the email exists — a failed
    // send must not become an oracle for probing registered addresses.
    console.error('forgot-password request failed:', error)
  }

  return { ok: true }
}
