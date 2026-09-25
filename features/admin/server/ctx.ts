'use server'

import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { getPayloadWithUser } from '@/shared/lib/auth'

export type AdminCtx = {
  payload: Payload
  user: User
  req: PayloadRequest
}

export async function getAdminCtx(): Promise<AdminCtx> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx || ctx.user.role !== 'admin') throw new Error('Unauthorized')
  return ctx
}

export async function getStaffCtx(): Promise<AdminCtx> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx || (ctx.user.role !== 'admin' && ctx.user.role !== 'librarian'))
    throw new Error('Unauthorized')
  return ctx
}
