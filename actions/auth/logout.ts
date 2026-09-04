'use server'
import { cookies as nextCookies } from 'next/headers'
import { logoutOperation } from 'payload'
import { getPayloadWithUser } from '@/lib/auth'

export const logout = async (opts?: { allSessions?: boolean }) => {
  const ctx = await getPayloadWithUser({ allowAdmin: true })

  if (ctx) {
    await logoutOperation({
      allSessions: opts?.allSessions ?? false,
      collection: ctx.payload.collections['users'],
      req: ctx.req,
    })
  }

  const cookies = await nextCookies()
  cookies.delete('payload-token')

  return { ok: true }
}
