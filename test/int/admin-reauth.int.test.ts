import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  beginAdminReauthentication,
  getAdminReauthenticationStatus,
} from '@/features/admin/server/security'
import { updateAdminPassword, getAdminSettingsData } from '@/features/admin/server/account'

let payload: Payload

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

afterEach(() => vi.restoreAllMocks())

describe('admin re-authentication', () => {
  it('denies visitors and members, rejects wrong proof, and expires at five minutes', async () => {
    expect(await beginAdminReauthentication('wrong')).toMatchObject({ ok: false })
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: false })
    const member = await createTestUser(payload)
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: member.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await beginAdminReauthentication('correct horse battery')).toMatchObject({ ok: false })
    const admin = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await beginAdminReauthentication('wrong')).toMatchObject({ ok: false })
    const result = await beginAdminReauthentication('correct horse battery')
    if (!result.ok || !('expiresAt' in result) || !result.expiresAt) throw new Error('No proof')
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(result.expiresAt))
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: false })
    expect(await updateAdminPassword('not-with-expired-proof')).toMatchObject({ ok: false })
  })
  it('confirms the password for only the current device without issuing another session', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const current = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    const other = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(current.token))

    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: false })
    expect(await beginAdminReauthentication('correct horse battery')).toMatchObject({ ok: true })
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: true })
    setNextHeaders(makeAuthHeaders(other.token))
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: false })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.sessions).toHaveLength(2)
    for (const { token } of [current, other]) {
      expect((await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })).user?.id).toBe(
        admin.id,
      )
    }
  })

  it('blocks credential edits until the current admin session is re-authenticated', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const current = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(current.token))
    const { user } = await payload.auth({ headers: new Headers(makeAuthHeaders(current.token)) })
    await expect(
      payload.update({
        collection: 'users',
        id: admin.id,
        data: { password: 'stolen-session-password' },
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow('أعد تأكيد هويتك')
  })

  it('invalidates old tokens even when a recently confirmed password is changed through Payload directly', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const current = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(current.token))
    await beginAdminReauthentication('correct horse battery')
    const { user } = await payload.auth({ headers: new Headers(makeAuthHeaders(current.token)) })
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { password: 'direct-verified-password' },
      user,
      overrideAccess: false,
    })
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(current.token)) })).user,
    ).toBeNull()
  })

  it('reads the rotated cookie during the same server-action render', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const current = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(current.token))
    await beginAdminReauthentication('correct horse battery')
    expect(await updateAdminPassword('rotated-during-render')).toMatchObject({ ok: true })
    expect((await getAdminSettingsData())?.user.id).toBe(admin.id)
  })
})
