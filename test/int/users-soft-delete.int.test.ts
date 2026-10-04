import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { makeAuthHeaders, setNextHeaders, clearNextContext } from '../lib/next-stubs'
import { getAuthenticatedUser, getPayloadWithUser } from '@/shared/lib/auth'
import {
  ERASURE_GRACE_DAYS,
  softDeleteUserAccount,
  purgeDeletedAccounts,
} from '@/features/users/server/account-lifecycle'
import { ERASURE_QUEUE } from '@/features/users/server/jobs'

let payload: Payload

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})
afterAll(async () => {
  await payload.db.destroy?.()
})

async function attachVerificationDocument(user: User): Promise<number> {
  // Payload validates an upload against the file's real magic bytes, so the
  // fixture is a genuine PNG rather than an empty buffer.
  const bytes = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()

  const media = await payload.create({
    collection: 'media',
    data: { alt: 'وثيقة تحقق', isPrivate: true, owner: user.id },
    file: {
      data: Buffer.from(bytes),
      name: 'verification.png',
      mimetype: 'image/png',
      size: bytes.length,
    },
    overrideAccess: true,
  })
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { verificationDocument: media.id },
    overrideAccess: true,
  })
  return media.id
}

describe('account lifecycle: soft delete and the right to erasure (#152)', () => {
  it('stamps deletedAt, schedules the purge 30 days out and destroys the Verification Document immediately', async () => {
    const user = await createTestUser(payload)
    const mediaId = await attachVerificationDocument(user)

    const before = Date.now()
    await softDeleteUserAccount(payload, user.id, await boundReq(payload, user))

    const after = Date.now()
    const doc = (await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })) as User

    expect(doc.deletedAt).toBeTruthy()
    expect(new Date(doc.deletedAt as string).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(new Date(doc.deletedAt as string).getTime()).toBeLessThanOrEqual(after + 1000)

    // 30 days out, to the day.
    const scheduled = new Date(doc.deletionScheduledFor as string)
    const deleted = new Date(doc.deletedAt as string)
    expect(Math.round((scheduled.getTime() - deleted.getTime()) / 86_400_000)).toBe(30)

    // The document is gone at once, not at purge time.
    await expect(
      payload.findByID({ collection: 'media', id: mediaId, overrideAccess: true }),
    ).rejects.toThrow()
    expect(doc.verificationDocument).toBeFalsy()
  })

  it('revokes every session so a soft-deleted account cannot use its cookie', async () => {
    const user = await createTestUser(payload)
    const { token } = await loginToken(payload, {
      email: user.email,
      password: 'correct horse battery',
    })

    setNextHeaders(makeAuthHeaders(token))
    expect(await getAuthenticatedUser()).toBeTruthy()

    await softDeleteUserAccount(payload, user.id, await boundReq(payload, user))

    setNextHeaders(makeAuthHeaders(token))
    expect(await getAuthenticatedUser()).toBeUndefined()
    expect(await getPayloadWithUser()).toBeNull()
  })

  it('treats a still-valid token as unauthenticated once the row is soft-deleted', async () => {
    // The race the auth-helper guard defends: a token whose session is still
    // listed, but whose row has since been soft-deleted. Session revocation
    // alone would not cover it.
    const user = await createTestUser(payload)
    const { token } = await loginToken(payload, {
      email: user.email,
      password: 'correct horse battery',
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { deletedAt: new Date().toISOString() },
      overrideAccess: true,
    })

    setNextHeaders(makeAuthHeaders(token))
    expect(await getAuthenticatedUser()).toBeUndefined()
    expect(await getPayloadWithUser()).toBeNull()
  })

  it('refuses to sign a soft-deleted account in', async () => {
    const user = await createTestUser(payload)
    await softDeleteUserAccount(payload, user.id, await boundReq(payload, user))

    await expect(
      payload.login({
        collection: 'users',
        data: { email: user.email, password: 'correct horse battery' },
      }),
    ).rejects.toThrow()
  })

  it('purges accounts past the scheduled date and leaves the rest untouched', async () => {
    const due = await createTestUser(payload)
    const notDue = await createTestUser(payload)
    const undeleted = await createTestUser(payload)
    const notDeleted = await createTestUser(payload)

    const now = new Date('2026-10-01T00:00:00.000Z')
    const past = new Date('2026-09-30T00:00:00.000Z')
    const pastDue = new Date('2026-09-01T00:00:00.000Z')
    const farFuture = new Date('2026-11-01T00:00:00.000Z')

    await payload.update({
      collection: 'users',
      id: due.id,
      data: { deletedAt: past.toISOString(), deletionScheduledFor: pastDue.toISOString() },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: notDue.id,
      data: { deletedAt: past.toISOString(), deletionScheduledFor: farFuture.toISOString() },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: notDeleted.id,
      data: { deletionScheduledFor: pastDue.toISOString() },
      overrideAccess: true,
    })

    const purged = await purgeDeletedAccounts(payload, now)

    expect(purged).toBe(1)
    await expect(
      payload.findByID({ collection: 'users', id: due.id, overrideAccess: true }),
    ).rejects.toThrow()
    for (const id of [notDue.id, undeleted.id, notDeleted.id]) {
      expect(await payload.findByID({ collection: 'users', id, overrideAccess: true })).toBeTruthy()
    }
  })

  it('purges a batch larger than one page', async () => {
    const ids: number[] = []
    for (let i = 0; i < 3; i += 1) {
      const user = await createTestUser(payload)
      ids.push(user.id)
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          deletedAt: '2026-09-01T00:00:00.000Z',
          deletionScheduledFor: '2026-09-15T00:00:00.000Z',
        },
        overrideAccess: true,
      })
    }

    expect(await purgeDeletedAccounts(payload, new Date('2026-10-01T00:00:00.000Z'), 2)).toBe(3)
    for (const id of ids) {
      await expect(
        payload.findByID({ collection: 'users', id, overrideAccess: true }),
      ).rejects.toThrow()
    }
  })
})

describe('user collection constraints (#152)', () => {
  it('stamps consent and its timestamp on an admin-created account', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const created = (await payload.create({
      collection: 'users',
      data: {
        email: 'made-by-admin@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'user',
        consentGiven: true,
      },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })) as User

    expect(created.consentGiven).toBe(true)
    expect(created.consentTimestamp).toBeTruthy()
    expect(new Date(created.consentTimestamp as string).getTime()).toBeLessThanOrEqual(
      Date.now() + 1000,
    )
  })

  it('keeps the consent timestamp the caller supplied', async () => {
    const given = '2026-01-01T00:00:00.000Z'
    const created = (await payload.create({
      collection: 'users',
      data: {
        email: 'own-timestamp@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'user',
        consentGiven: true,
        consentTimestamp: given,
      },
      overrideAccess: true,
    })) as User

    expect(created.consentTimestamp).toBe(given)
  })

  it('refuses an external member registration with no Verification Document', async () => {
    const req = await boundReq(payload)
    req.payloadAPI = 'REST'

    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: 'no-document@usthb.dz',
          password: 'Str0ngPass!123',
          role: 'user',
          consentGiven: true,
        },
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    // The row was not created as a side effect of the rejection.
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: 'no-document@usthb.dz' } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(0)
  })

  it('lets an admin create staff through the same external surface', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const req = await boundReq(payload, admin)
    req.payloadAPI = 'REST'

    const created = await payload.create({
      collection: 'users',
      data: {
        email: 'new-librarian@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'librarian',
      } as never,
      req,
      overrideAccess: false,
    })

    expect(created.role).toBe('librarian')
    expect(created.consentGiven).toBe(true)
    expect(created.consentTimestamp).toBeTruthy()
  })
})

describe('the erasure job (#152)', () => {
  it('purges due accounts when run through the real jobs queue', async () => {
    const due = await createTestUser(payload)
    const survivor = await createTestUser(payload)

    await payload.update({
      collection: 'users',
      id: due.id,
      data: {
        deletedAt: '2026-09-01T00:00:00.000Z',
        deletionScheduledFor: '2026-09-15T00:00:00.000Z',
      },
      overrideAccess: true,
    })

    await payload.jobs.queue({
      queue: ERASURE_QUEUE,
      task: 'purgeDeletedAccounts',
      input: { now: '2026-10-01T00:00:00.000Z' },
    })
    const result = await payload.jobs.run({ queue: ERASURE_QUEUE, limit: 5 })

    expect(Object.keys(result.jobStatus ?? {})).toHaveLength(1)
    await expect(
      payload.findByID({ collection: 'users', id: due.id, overrideAccess: true }),
    ).rejects.toThrow()
    expect(
      await payload.findByID({ collection: 'users', id: survivor.id, overrideAccess: true }),
    ).toBeTruthy()
  })

  it('defaults to the current time when the job is given no input', async () => {
    const longGone = new Date()
    longGone.setDate(longGone.getDate() - ERASURE_GRACE_DAYS - 1)

    const due = await createTestUser(payload)
    await payload.update({
      collection: 'users',
      id: due.id,
      data: {
        deletedAt: longGone.toISOString(),
        deletionScheduledFor: longGone.toISOString(),
      },
      overrideAccess: true,
    })

    await payload.jobs.queue({ queue: ERASURE_QUEUE, task: 'purgeDeletedAccounts', input: {} })
    const result = await payload.jobs.run({ queue: ERASURE_QUEUE, limit: 5 })

    expect(Object.keys(result.jobStatus ?? {})).toHaveLength(1)
    await expect(
      payload.findByID({ collection: 'users', id: due.id, overrideAccess: true }),
    ).rejects.toThrow()
  })
})

describe('account lifecycle edge cases (#152)', () => {
  it('rejects a soft delete for an account that does not exist', async () => {
    await expect(softDeleteUserAccount(payload, 999_999)).rejects.toThrow(/not found/i)
  })

  it('soft deletes without a request bound to the caller', async () => {
    const user = await createTestUser(payload)

    const doc = await softDeleteUserAccount(payload, user.id)

    expect(doc.deletedAt).toBeTruthy()
    expect(doc.deletionScheduledFor).toBeTruthy()
  })
})

describe('consent stamping edge cases (#152)', () => {
  it('stamps the timestamp when consent is true but no timestamp was given', async () => {
    const created = (await payload.create({
      collection: 'users',
      data: {
        email: 'consent-no-timestamp@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'user',
        consentGiven: true,
      },
      overrideAccess: true,
    })) as User

    expect(created.consentGiven).toBe(true)
    expect(created.consentTimestamp).toBeTruthy()
  })
})

describe('consent enforcement on the external surface (#152)', () => {
  it.each([undefined, false])(
    'rejects an external create without explicit consent (%s)',
    async (consentGiven) => {
      const req = await boundReq(payload)
      req.payloadAPI = 'REST'
      const owner = await createTestUser(payload)
      const mediaId = await attachVerificationDocument(owner)

      // A raw HTTP body bypasses TypeScript's required field, so collection
      // validation must reject it rather than fabricating a consent record.
      await expect(
        payload.create({
          collection: 'users',
          data: {
            email: 'no-consent-field@usthb.dz',
            password: 'Str0ngPass!123',
            role: 'user',
            verificationDocument: mediaId,
            consentGiven,
          } as never,
          req,
          overrideAccess: false,
        }),
      ).rejects.toThrow()

      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'no-consent-field@usthb.dz' } },
        overrideAccess: true,
      })
      expect(found.totalDocs).toBe(0)
    },
  )

  it('stamps consent time when an external member explicitly consents', async () => {
    const req = await boundReq(payload)
    req.payloadAPI = 'GraphQL'
    const owner = await createTestUser(payload)
    const mediaId = await attachVerificationDocument(owner)
    const created = await payload.create({
      collection: 'users',
      data: {
        email: 'consented@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'user',
        verificationDocument: mediaId,
        consentGiven: true,
        consentTimestamp: '2000-01-01T00:00:00.000Z',
      },
      req,
      overrideAccess: false,
    })

    expect(created.consentGiven).toBe(true)
    expect(created.consentTimestamp).toBeTruthy()
    expect(created.consentTimestamp).not.toBe('2000-01-01T00:00:00.000Z')
  })

  it('stamps consent on a bare server-side create', async () => {
    const created = (await payload.create({
      collection: 'users',
      data: { email: 'bare-create@usthb.dz', password: 'Str0ngPass!123', role: 'user' } as never,
      overrideAccess: true,
    })) as User

    expect(created.consentGiven).toBe(true)
    expect(created.consentTimestamp).toBeTruthy()
  })
})

describe('purge loop edge cases (#152)', () => {
  it('returns zero and stops immediately when nothing is due', async () => {
    const survivor = await createTestUser(payload)
    expect(await purgeDeletedAccounts(payload, new Date('2026-10-01T00:00:00.000Z'))).toBe(0)
    expect(
      await payload.findByID({ collection: 'users', id: survivor.id, overrideAccess: true }),
    ).toBeTruthy()
  })

  it('destroys the Verification Document when no request is bound', async () => {
    const user = await createTestUser(payload)
    await attachVerificationDocument(user)

    const doc = await softDeleteUserAccount(payload, user.id)

    expect(doc.verificationDocument).toBeFalsy()
    expect(doc.deletedAt).toBeTruthy()
  })

  it('clears a profile picture alongside the verification document', async () => {
    const user = await createTestUser(payload)
    const bytes = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()
    const avatar = await payload.create({
      collection: 'media',
      data: { alt: 'صورة', owner: user.id },
      file: {
        data: Buffer.from(bytes),
        name: 'avatar.png',
        mimetype: 'image/png',
        size: bytes.length,
      },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { profilePicture: avatar.id },
      overrideAccess: true,
    })

    const doc = await softDeleteUserAccount(payload, user.id)

    expect(doc.profilePicture).toBeFalsy()
    await expect(
      payload.findByID({ collection: 'media', id: avatar.id, overrideAccess: true }),
    ).rejects.toThrow()
  })
})

describe('role defaulting (#152)', () => {
  it('treats a create with no role as a member', async () => {
    // A raw HTTP body can omit `role`; the hook must fall back to 'user' so the
    // document requirement still applies rather than being skipped.
    const owner = await createTestUser(payload)
    const mediaId = await attachVerificationDocument(owner)
    const req = await boundReq(payload)
    req.payloadAPI = 'REST'

    const created = (await payload.create({
      collection: 'users',
      data: {
        email: 'no-role@usthb.dz',
        password: 'Str0ngPass!123',
        verificationDocument: mediaId,
        consentGiven: true,
      } as never,
      req,
      overrideAccess: false,
    })) as User

    expect(created.role).toBe('user')
    expect(created.consentGiven).toBe(true)
  })
})

describe('role escalation on create (#152)', () => {
  it('does not let an anonymous write mint a staff account without a document', async () => {
    const req = await boundReq(payload)
    req.payloadAPI = 'REST'

    // `role` is only restricted on update, so a raw `POST /api/users` could
    // otherwise ask for `librarian` and slip past the document requirement.
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: 'wants-librarian@usthb.dz',
          password: 'Str0ngPass!123',
          role: 'librarian',
          consentGiven: true,
        } as never,
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: 'wants-librarian@usthb.dz' } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(0)
  })

  it('still lets an admin create a librarian, who needs no document', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const req = await boundReq(payload, admin)
    req.payloadAPI = 'REST'

    const created = (await payload.create({
      collection: 'users',
      data: {
        email: 'real-librarian@usthb.dz',
        password: 'Str0ngPass!123',
        role: 'librarian',
        consentGiven: true,
      },
      req,
      overrideAccess: false,
    })) as User

    expect(created.role).toBe('librarian')
  })
})
