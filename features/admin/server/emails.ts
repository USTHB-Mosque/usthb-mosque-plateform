'use server'

import { createSessionForUser, getPayloadWithUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import {
  allowSessionIssuance,
  consumeSecurityChallenge,
  createSecurityChallenge,
  requireRecentAuthentication,
  withAccountLock,
} from '@/shared/lib/account-security'
import {
  allowPrimaryEmailChange,
  lockAccountEmail,
  markEmailVerified,
  reserveAccountEmail,
} from '@/shared/lib/account-emails'
import { revalidatePath } from 'next/cache'
import { securityAudit } from './security-audit'
import { publicAccountError } from '@/shared/lib/account-error'

export async function getAdminEmailSettings() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return null
  const result = await ctx.payload.find({
    collection: 'account-emails',
    depth: 0,
    limit: 0,
    sort: 'createdAt',
    req: ctx.req,
    overrideAccess: false,
  })
  return {
    verifiedCount: result.docs.filter((email) => email.verifiedAt).length,
    addresses: result.docs.map((email) => ({
      id: email.id,
      address: email.address,
      verified: Boolean(email.verifiedAt),
      primary: email.address === ctx.user.email,
    })),
  }
}

export async function requestAdminEmailVerification(value: string) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const address = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    return { ok: false as const, error: 'البريد الإلكتروني غير صالح' }
  try {
    await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const own = await ctx.payload.find({
          collection: 'account-emails',
          where: { user: { equals: ctx.user.id } },
          limit: 0,
          depth: 0,
          req,
        })
        if (own.totalDocs >= 5 && !own.docs.some((email) => email.address === address))
          throw new Error('يمكن إضافة خمسة عناوين كحد أقصى')
        const entry = await reserveAccountEmail(ctx.payload, ctx.user.id, address, req, true)
        if (entry.verifiedAt) throw new Error('البريد موثّق بالفعل')
      },
      ctx.req,
    )
    const challenge = await createSecurityChallenge(ctx.payload, ctx.user, 'email', address)
    revalidatePath('/admin-panel/settings/security/email')
    return { ok: true as const, ...challenge }
  } catch (error) {
    return {
      ok: false as const,
      error: publicAccountError(error, 'تعذر إرسال رمز التوثيق'),
    }
  }
}

export async function confirmAdminEmail(challenge: string, code: string) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    const result = await consumeSecurityChallenge(
      ctx.payload,
      challenge,
      code,
      'email',
      ctx.user,
      async (user, _security, req, attempt) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const email = await markEmailVerified(ctx.payload, user.id, attempt.email, req)
        await securityAudit(
          ctx.payload,
          ctx.user,
          'email_verified',
          'وثّق بريداً إلكترونياً في حسابه',
          req,
        )
        return email
      },
    )
    if (!result.ok) return result
    revalidatePath('/admin-panel/settings/security/email')
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'تعذر توثيق البريد' }
  }
}

export async function setAdminPrimaryEmail(id: number) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    const result = await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const candidate = await ctx.payload.findByID({
          collection: 'account-emails',
          id,
          depth: 0,
          req,
          overrideAccess: false,
        })
        await lockAccountEmail(ctx.payload, candidate.address, req)
        const email = await ctx.payload.findByID({
          collection: 'account-emails',
          id,
          depth: 0,
          req,
          overrideAccess: false,
        })
        if (!email.verifiedAt) throw new Error('وثّق البريد أولاً')
        if (email.address === ctx.user.email) throw new Error('هذا هو البريد الرئيسي بالفعل')
        allowPrimaryEmailChange(req)
        allowSessionIssuance(req)
        await ctx.payload.update({
          collection: 'users',
          id: ctx.user.id,
          data: { email: email.address },
          req,
          overrideAccess: false,
        })
        const session = await createSessionForUser(ctx.payload, ctx.user, { req })
        await securityAudit(
          ctx.payload,
          ctx.user,
          'primary_email_changed',
          'غيّر البريد الإلكتروني الرئيسي لحسابه',
          req,
        )
        return session
      },
      ctx.req,
    )
    await setPayloadTokenCookie(result.token, result.exp)
    revalidatePath('/admin-panel/settings', 'layout')
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: publicAccountError(error, 'تعذر تغيير البريد الرئيسي'),
    }
  }
}

export async function removeAdminEmail(id: number) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const candidate = await ctx.payload.findByID({
          collection: 'account-emails',
          id,
          depth: 0,
          req,
          overrideAccess: false,
        })
        await lockAccountEmail(ctx.payload, candidate.address, req)
        const email = await ctx.payload.findByID({
          collection: 'account-emails',
          id,
          depth: 0,
          req,
          overrideAccess: false,
        })
        if (email.address === ctx.user.email)
          throw new Error('عيّن بريداً موثّقاً آخر رئيسياً قبل حذف هذا العنوان')
        await ctx.payload.update({
          collection: 'auth-challenges',
          where: {
            and: [
              { user: { equals: ctx.user.id } },
              { email: { equals: email.address } },
              { purpose: { equals: 'email' } },
            ],
          },
          data: { consumedAt: new Date().toISOString() },
          req,
        })
        await ctx.payload.delete({ collection: 'account-emails', id: email.id, req })
        await securityAudit(
          ctx.payload,
          ctx.user,
          'email_removed',
          'أزال بريداً إلكترونياً من حسابه',
          req,
        )
      },
      ctx.req,
    )
    revalidatePath('/admin-panel/settings/security/email')
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: publicAccountError(error, 'تعذر حذف البريد') }
  }
}
