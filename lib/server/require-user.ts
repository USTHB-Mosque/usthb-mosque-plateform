import { redirect } from 'next/navigation'
import { getPayloadWithUser } from './payload-auth'

export async function requireUser(redirectTo = '/auth') {
  const ctx = await getPayloadWithUser()
  if (!ctx) redirect(redirectTo)
  return ctx
}