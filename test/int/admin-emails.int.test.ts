import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  clearNextContext,
  getLastSetCookieOptions,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'
import { beginAdminReauthentication } from '@/features/admin/server/security'
import { getAdminSecurityData } from '@/features/admin/server/account'
import {
  getAdminEmailSettings,
  requestAdminEmailVerification,
  confirmAdminEmail,
  setAdminPrimaryEmail,
  removeAdminEmail,
} from '@/features/admin/server/emails'

let payload: Payload
beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await payload.db.destroy?.()
})

describe('admin verified email addresses', () => {
  it('renews its own expired reservation before sending a fresh mailbox challenge', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const other = await createTestUser(payload, { role: 'admin' })
    const ownerToken = (
      await loginToken(payload, { email: admin.email, password: 'correct horse battery' })
    ).token
    setNextHeaders(makeAuthHeaders(ownerToken))
    await beginAdminReauthentication('correct horse battery')
    const address = 'renewed-claim@usthb.dz'
    await payload.create({
      collection: 'account-emails',
      data: { user: admin.id, address, pendingUntil: new Date(Date.now() - 1).toISOString() },
      overrideAccess: true,
    })
    const mail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const pending = await requestAdminEmailVerification(address)
    if (!pending.ok) throw new Error('Missing renewed challenge')
    const code = String(mail.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: other.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    await beginAdminReauthentication('correct horse battery')

    expect(await requestAdminEmailVerification(address)).toMatchObject({ ok: false })
    setNextHeaders(makeAuthHeaders(ownerToken))
    expect(await confirmAdminEmail(pending.challenge, code)).toMatchObject({ ok: true })
    expect((await getAdminEmailSettings())?.addresses).toContainEqual(
      expect.objectContaining({ address, verified: true }),
    )
  })

  it('makes an existing owned pending claim permanent when a trusted primary transition uses it', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const address = 'trusted-primary@usthb.dz'
    await payload.create({
      collection: 'account-emails',
      data: { user: admin.id, address, pendingUntil: new Date(Date.now() - 1).toISOString() },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { email: address },
      overrideAccess: true,
    })
    const registered = await payload.find({
      collection: 'account-emails',
      where: { address: { equals: address } },
      overrideAccess: true,
    })
    expect(registered.docs[0].pendingUntil).toBeNull()
    expect(registered.docs[0].verifiedAt).toBeNull()
  })
  it('limits contact claims, handles malformed input, and reclaims expired pending reservations', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const other = await createTestUser(payload)
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    await beginAdminReauthentication('correct horse battery')
    expect(await requestAdminEmailVerification(null as unknown as string)).toMatchObject({
      ok: false,
    })
    const mail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    await payload.create({
      collection: 'account-emails',
      data: {
        user: other.id,
        address: 'expired@usthb.dz',
        pendingUntil: new Date(Date.now() - 1).toISOString(),
      },
      overrideAccess: true,
    })
    expect(await requestAdminEmailVerification('expired@usthb.dz')).toMatchObject({ ok: true })
    for (let index = 0; index < 3; index++)
      await payload.create({
        collection: 'account-emails',
        data: { user: admin.id, address: `extra${index}@usthb.dz` },
        overrideAccess: true,
      })
    expect(await requestAdminEmailVerification('sixth@usthb.dz')).toMatchObject({ ok: false })
    expect(await requestAdminEmailVerification(admin.email)).toMatchObject({ ok: false })
    const own = await payload.find({
      collection: 'account-emails',
      where: { address: { equals: admin.email } },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'account-emails',
      id: own.docs[0].id,
      data: { verifiedAt: new Date().toISOString() },
      overrideAccess: true,
    })
    expect(await requestAdminEmailVerification(admin.email)).toMatchObject({ ok: false })
    expect(await setAdminPrimaryEmail(own.docs[0].id)).toMatchObject({ ok: false })
    expect(mail).toHaveBeenCalled()
  })
  it('denies unauthorized management and reserves addresses across all accounts', async () => {
    expect(await getAdminEmailSettings()).toBeNull()
    expect(await requestAdminEmailVerification('no@usthb.dz')).toMatchObject({ ok: false })
    expect(await confirmAdminEmail('invalid', '000000')).toMatchObject({ ok: false })
    expect(await setAdminPrimaryEmail(1)).toMatchObject({ ok: false })
    expect(await removeAdminEmail(1)).toMatchObject({ ok: false })
    const admin = await createTestUser(payload, { role: 'admin' })
    const other = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await requestAdminEmailVerification('valid@usthb.dz')).toMatchObject({ ok: false })
    expect(await requestAdminEmailVerification('not-an-email')).toMatchObject({ ok: false })
    await beginAdminReauthentication('correct horse battery')
    expect(await requestAdminEmailVerification(other.email)).toMatchObject({ ok: false })
    const foreign = await payload.find({
      collection: 'account-emails',
      where: { user: { equals: other.id } },
      overrideAccess: true,
    })
    expect(await setAdminPrimaryEmail(foreign.docs[0].id)).toMatchObject({ ok: false })
    expect(await removeAdminEmail(foreign.docs[0].id)).toMatchObject({ ok: false })
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const pending = await requestAdminEmailVerification('reserved@usthb.dz')
    if (!pending.ok) throw new Error('Missing challenge')
    await expect(createTestUser(payload, { email: 'reserved@usthb.dz' })).rejects.toThrow(
      'غير متاح',
    )
    const address = (await getAdminEmailSettings())!.addresses.find(
      (entry) => entry.address === 'reserved@usthb.dz',
    )!
    await removeAdminEmail(address.id)
    expect(
      await confirmAdminEmail(
        pending.challenge,
        String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1],
      ),
    ).toMatchObject({ ok: false })
  })
  it('preserves the primary login and counts only mailboxes actually verified', async () => {
    const admin = await createTestUser(payload, { role: 'admin', email: 'primary@emails.usthb.dz' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await getAdminEmailSettings()).toMatchObject({
      verifiedCount: 0,
      addresses: [
        expect.objectContaining({ address: admin.email, primary: true, verified: false }),
      ],
    })
    await beginAdminReauthentication('correct horse battery')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const pending = await requestAdminEmailVerification('  SECONDARY@emails.usthb.dz  ')
    expect(pending).toMatchObject({ ok: true, challenge: expect.any(String) })
    expect(send.mock.calls.at(-1)?.[0].to).toBe('secondary@emails.usthb.dz')
    expect((await getAdminEmailSettings())?.verifiedCount).toBe(0)
    if (!pending.ok) throw new Error('Missing verification challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    expect(await confirmAdminEmail(pending.challenge, code)).toMatchObject({ ok: true })
    expect((await getAdminSecurityData())?.accountLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'account_security_updated',
          metadata: { event: 'email_verified' },
          targetId: String(admin.id),
        }),
      ]),
    )
    expect(await getAdminEmailSettings()).toMatchObject({
      verifiedCount: 1,
      addresses: expect.arrayContaining([
        expect.objectContaining({
          address: 'secondary@emails.usthb.dz',
          primary: false,
          verified: true,
        }),
      ]),
    })
    expect(await confirmAdminEmail(pending.challenge, code)).toMatchObject({ ok: false })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: 'secondary@emails.usthb.dz', password: 'correct horse battery' },
      }),
    ).rejects.toThrow()
    expect(
      (
        await payload.login({
          collection: 'users',
          data: { email: admin.email, password: 'correct horse battery' },
        })
      ).token,
    ).toBeTruthy()
  })

  it('promotes a verified address with fresh proof, rotates sessions, and preserves a primary address', async () => {
    const admin = await createTestUser(payload, { role: 'admin', email: 'primary@emails.usthb.dz' })
    const old = await loginToken(payload, { email: admin.email, password: 'correct horse battery' })
    const staleReset = await payload.forgotPassword({
      collection: 'users',
      data: { email: admin.email },
      disableEmail: true,
    })
    setNextHeaders(makeAuthHeaders(old.token))
    await beginAdminReauthentication('correct horse battery')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const pending = await requestAdminEmailVerification('new-primary@emails.usthb.dz')
    if (!pending.ok) throw new Error('Missing challenge')
    const entry = (await getAdminEmailSettings())!.addresses.find((email) => !email.primary)!
    expect(await setAdminPrimaryEmail(entry.id)).toMatchObject({ ok: false })
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    await confirmAdminEmail(pending.challenge, code)
    expect(await setAdminPrimaryEmail(entry.id)).toMatchObject({ ok: true })
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token: staleReset!, password: 'using-former-primary' },
      }),
    ).rejects.toThrow()
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(old.token)) })).user,
    ).toBeNull()
    setNextHeaders(makeAuthHeaders(String(getLastSetCookieOptions('payload-token')?.value)))
    expect(await getAdminEmailSettings()).toMatchObject({
      addresses: expect.arrayContaining([expect.objectContaining({ id: entry.id, primary: true })]),
    })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: admin.email, password: 'correct horse battery' },
      }),
    ).rejects.toThrow()
    expect(
      (
        await payload.login({
          collection: 'users',
          data: { email: entry.address, password: 'correct horse battery' },
        })
      ).token,
    ).toBeTruthy()
    await beginAdminReauthentication('correct horse battery')
    expect(await removeAdminEmail(entry.id)).toMatchObject({ ok: false })
    const former = (await getAdminEmailSettings())!.addresses.find(
      (email) => email.address === admin.email,
    )!
    expect(await removeAdminEmail(former.id)).toMatchObject({ ok: true })
    expect((await getAdminEmailSettings())!.addresses).toHaveLength(1)
  })

  it('cannot confirm a mailbox after the originating identity proof expires', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    const proof = await beginAdminReauthentication('correct horse battery')
    if (!proof.ok || !proof.expiresAt) throw new Error('Missing proof')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(proof.expiresAt) - 1_000)
    const pending = await requestAdminEmailVerification('late-proof@usthb.dz')
    if (!pending.ok) throw new Error('Missing challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(proof.expiresAt) + 1)
    expect(await confirmAdminEmail(pending.challenge, code)).toMatchObject({ ok: false })
    expect((await getAdminEmailSettings())?.verifiedCount).toBe(0)
  })
})
