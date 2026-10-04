'use server'

import {
  createSessionForUser,
  getPayloadWithUser,
  revokeAllSessions,
  setPayloadTokenCookie,
} from '@/shared/lib/auth'
import {
  allowSessionIssuance,
  consumeSecurityChallenge,
  createSecurityChallenge,
  generateRecoveryCodes,
  hasRecentAuthentication,
  probePassword,
  readAccountSecurity,
  recordReauthentication,
  requireRecentAuthentication,
  withAccountLock,
  sessionId,
  recentAuthenticationExpiry,
  invalidateSecurityProofs,
} from '@/shared/lib/account-security'
import { markEmailVerified } from '@/shared/lib/account-emails'
import type { User } from '@/payload-types'
import { securityAudit } from './security-audit'
import { publicAccountError } from '@/shared/lib/account-error'

export async function getAdminReauthenticationStatus() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { recent: false, expiresAt: null }
  const expiresAt = await recentAuthenticationExpiry(ctx.payload, ctx.user)
  return { recent: Boolean(expiresAt), expiresAt: expiresAt ?? null }
}

export async function beginAdminReauthentication(password: string) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    await probePassword(ctx.payload, ctx.user.email, password)
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }
  const security = await readAccountSecurity(ctx.payload, ctx.user.id)
  if (security?.emailTwoFactorEnabled) {
    if (await hasRecentAuthentication(ctx.payload, ctx.user)) return { ok: true as const }
    try {
      return {
        ok: true as const,
        ...(await createSecurityChallenge(ctx.payload, ctx.user, 'reauth', ctx.user.email)),
      }
    } catch (error) {
      return {
        ok: false as const,
        error: publicAccountError(error, 'تعذر إرسال الرمز'),
      }
    }
  }
  const expiresAt = await recordReauthentication(ctx.payload, ctx.user)
  return { ok: true as const, expiresAt }
}

export async function completeAdminReauthentication(challenge: string, code: string) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const result = await consumeSecurityChallenge(
    ctx.payload,
    challenge,
    code,
    'reauth',
    ctx.user,
    async (_user, _security, req) => recordReauthentication(ctx.payload, ctx.user, req),
  )
  if (!result.ok) return result
  return { ok: true as const, expiresAt: result.value }
}

export async function getAdminTwoFactorSettings() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return null
  const security = await readAccountSecurity(ctx.payload, ctx.user.id)
  return {
    enabled: security?.emailTwoFactorEnabled ?? false,
    recoveryCodesRemaining: (security?.recoveryCodeHashes as string[] | undefined)?.length ?? 0,
  }
}

export async function beginAdminTwoFactorEnrollment() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    await requireRecentAuthentication(ctx.payload, ctx.user)
    const challenge = await createSecurityChallenge(ctx.payload, ctx.user, 'enroll', ctx.user.email)
    return { ok: true as const, ...challenge }
  } catch (error) {
    return {
      ok: false as const,
      error: publicAccountError(error, 'تعذر إرسال الرمز'),
    }
  }
}

export async function confirmAdminTwoFactorEnrollment(challenge: string, code: string) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const result = await consumeSecurityChallenge(
    ctx.payload,
    challenge,
    code,
    'enroll',
    ctx.user,
    async (user, security, req) => {
      await requireRecentAuthentication(ctx.payload, ctx.user, req)
      await markEmailVerified(ctx.payload, user.id, user.email, req)
      const recovery = generateRecoveryCodes(ctx.payload, user.id)
      await revokeAllSessions(ctx.payload, user, req)
      await invalidateSecurityProofs(
        ctx.payload,
        security,
        { emailTwoFactorEnabled: true, recoveryCodeHashes: recovery.hashes },
        req,
      )
      allowSessionIssuance(req)
      const session = await createSessionForUser(ctx.payload, user, { req })
      await recordReauthentication(ctx.payload, req.user as User, req)
      await securityAudit(
        ctx.payload,
        ctx.user,
        'two_factor_enabled',
        'فعّل المصادقة الثنائية لحسابه',
        req,
      )
      return { ...session, recoveryCodes: recovery.codes }
    },
  )
  if (!result.ok) return result
  await setPayloadTokenCookie(result.value.token, result.value.exp)
  return { ok: true as const, recoveryCodes: result.value.recoveryCodes }
}

export async function regenerateAdminRecoveryCodes() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    const result = await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const security = await readAccountSecurity(ctx.payload, ctx.user.id, req)
        if (!security?.emailTwoFactorEnabled) throw new Error('المصادقة الثنائية غير مفعلة')
        const recovery = generateRecoveryCodes(ctx.payload, ctx.user.id)
        const expiresAt = (security.reauthenticatedSessions as Record<string, string>)[
          sessionId(ctx.user)!
        ]
        await revokeAllSessions(ctx.payload, ctx.user, req)
        await invalidateSecurityProofs(
          ctx.payload,
          security,
          { recoveryCodeHashes: recovery.hashes },
          req,
        )
        allowSessionIssuance(req)
        const session = await createSessionForUser(ctx.payload, ctx.user, { req })
        await recordReauthentication(ctx.payload, req.user as User, req, expiresAt)
        await securityAudit(
          ctx.payload,
          ctx.user,
          'recovery_codes_regenerated',
          'استبدل رموز استرداد حسابه',
          req,
        )
        return { ...session, recoveryCodes: recovery.codes }
      },
      ctx.req,
    )
    await setPayloadTokenCookie(result.token, result.exp)
    return { ok: true as const, recoveryCodes: result.recoveryCodes }
  } catch (error) {
    return {
      ok: false as const,
      error: publicAccountError(error, 'تعذر إنشاء رموز الاسترداد'),
    }
  }
}

export async function disableAdminTwoFactor() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  try {
    const result = await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        const security = await readAccountSecurity(ctx.payload, ctx.user.id, req)
        if (!security?.emailTwoFactorEnabled) throw new Error('المصادقة الثنائية غير مفعلة')
        await revokeAllSessions(ctx.payload, ctx.user, req)
        await invalidateSecurityProofs(
          ctx.payload,
          security,
          { emailTwoFactorEnabled: false, recoveryCodeHashes: [] },
          req,
        )
        const session = await createSessionForUser(ctx.payload, ctx.user, { req })
        await securityAudit(
          ctx.payload,
          ctx.user,
          'two_factor_disabled',
          'عطّل المصادقة الثنائية لحسابه',
          req,
        )
        return session
      },
      ctx.req,
    )
    await setPayloadTokenCookie(result.token, result.exp)
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: publicAccountError(error, 'تعذر تعطيل المصادقة الثنائية'),
    }
  }
}
