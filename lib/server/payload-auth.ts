import { createLocalReq, getPayload } from 'payload'
import type { Payload } from 'payload'
import type { PayloadRequest } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders } from 'next/headers'
import type { User } from '@/payload-types'

export async function getPayloadWithUser(): Promise<{
  payload: Payload
  user: User
  req: PayloadRequest
} | null> {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const auth = await payload.auth({ headers })
  if (!auth.user) return null
  const user = auth.user as User
  if (user.role === 'admin') return null
  const req = await createLocalReq({ user }, payload)
  return { payload, user, req }
}
