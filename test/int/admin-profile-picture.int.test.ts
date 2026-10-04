import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestBook, createTestMedia } from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  updateAdminProfilePicture,
  removeAdminProfilePicture,
} from '@/features/admin/server/profile-picture'
import { getAdminSettingsData } from '@/features/admin/server/account'
import { softDeleteUserAccount } from '@/features/users/server/account-lifecycle'

let payload: Payload
beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})
afterAll(async () => {
  await payload.db.destroy?.()
})

async function picture() {
  const bytes = await sharp({
    create: { width: 48, height: 48, channels: 3, background: '#0AAF92' },
  })
    .png()
    .toBuffer()
  const data = new FormData()
  data.set('picture', new File([new Uint8Array(bytes)], 'avatar.png', { type: 'image/png' }))
  return data
}

describe('admin profile picture', () => {
  it('rejects malformed or oversized uploads and cannot attach private or foreign media', async () => {
    expect(await updateAdminProfilePicture(await picture())).toMatchObject({ ok: false })
    expect(await removeAdminProfilePicture()).toMatchObject({ ok: false })
    const admin = await createTestUser(payload, { role: 'admin' })
    const token = (
      await loginToken(payload, { email: admin.email, password: 'correct horse battery' })
    ).token
    setNextHeaders(makeAuthHeaders(token))
    expect(await updateAdminProfilePicture(new FormData())).toMatchObject({ ok: false })
    const invalid = new FormData()
    invalid.set('picture', new File(['not an image'], 'spoof.png', { type: 'image/png' }))
    expect(await updateAdminProfilePicture(invalid)).toMatchObject({ ok: false })
    const oversized = new FormData()
    oversized.set(
      'picture',
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' }),
    )
    expect(await updateAdminProfilePicture(oversized)).toMatchObject({ ok: false })
    const privateFile = await createTestMedia(payload, { owner: admin.id, isPrivate: true })
    const other = await createTestUser(payload)
    const foreign = await createTestMedia(payload, { owner: other.id })
    const { user } = await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })
    for (const media of [privateFile, foreign]) {
      await expect(
        payload.update({
          collection: 'users',
          id: admin.id,
          data: { profilePicture: media.id },
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow('يملكها')
    }
    expect((await getAdminSettingsData())?.user.profilePicture).toBeNull()
  })
  it('persists an owned image, replaces it safely, and returns to the fallback on removal', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await updateAdminProfilePicture(await picture())).toMatchObject({ ok: true })
    const first = (await getAdminSettingsData())!.user.profilePicture
    expect(first).toMatchObject({
      owner: expect.objectContaining({ id: admin.id }),
      isPrivate: false,
      mimeType: 'image/webp',
    })
    expect(await updateAdminProfilePicture(await picture())).toMatchObject({ ok: true })
    const second = (await getAdminSettingsData())!.user.profilePicture
    expect(second).not.toMatchObject({ id: typeof first === 'object' ? first?.id : first })
    expect(await removeAdminProfilePicture()).toMatchObject({ ok: true })
    expect((await getAdminSettingsData())!.user.profilePicture).toBeNull()
    expect((await payload.find({ collection: 'media', overrideAccess: true })).totalDocs).toBe(0)
  })

  it('never erases another account’s media through a legacy profile-picture reference', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const owner = await createTestUser(payload)
    const media = await createTestMedia(payload, { owner: owner.id })
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { profilePicture: media.id },
      overrideAccess: true,
    })
    await softDeleteUserAccount(payload, admin.id, await boundReq(payload, admin))
    expect(
      (await payload.findByID({ collection: 'media', id: media.id, overrideAccess: true })).id,
    ).toBe(media.id)
  })

  it('preserves an owned picture still published in a book gallery', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    await updateAdminProfilePicture(await picture())
    const photo = (await getAdminSettingsData())!.user.profilePicture
    if (!photo || typeof photo !== 'object') throw new Error('Missing photo')
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { gallery: [{ image: photo.id }] },
      overrideAccess: true,
    })
    expect(await removeAdminProfilePicture()).toMatchObject({ ok: true })
    expect(
      (await payload.findByID({ collection: 'media', id: photo.id, overrideAccess: true })).id,
    ).toBe(photo.id)
  })

  it('compensates an upload if the account disappears before attachment', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: admin.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await removeAdminProfilePicture()).toMatchObject({ ok: true })
    const config = payload.collections.media.config
    const hooks = config.hooks.afterChange
    config.hooks.afterChange = [
      ...hooks,
      async ({ operation, req, doc }) => {
        if (operation === 'create')
          await payload.delete({ collection: 'users', id: admin.id, req, overrideAccess: true })
        return doc
      },
    ]
    try {
      expect(await updateAdminProfilePicture(await picture())).toMatchObject({ ok: false })
      expect((await payload.find({ collection: 'media', overrideAccess: true })).totalDocs).toBe(0)
    } finally {
      config.hooks.afterChange = hooks
    }
  })
})
