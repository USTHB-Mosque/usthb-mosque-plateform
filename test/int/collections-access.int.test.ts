import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor } from '../lib/seed'
import {
  createTestActivity,
  createTestArticle,
  createTestBook,
  createTestMedia,
} from '../lib/factories'
import { clearNextContext } from '../lib/next-stubs'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import sharp from 'sharp'
import type { CollectionSlug } from 'payload'

let payload: Payload
let owner: User
let otherMember: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  owner = await createTestUser(payload, { email: 'owner@usthb.dz', verified: true })
  otherMember = await createTestUser(payload, { email: 'other@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

// Helpers over the Local API with `overrideAccess: false`, bound to a request
// identity — exactly what access control sees from the app.
async function canReadAs(
  user: User | undefined,
  collection: CollectionSlug,
  id: number | string,
): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.findByID({ collection, id, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

async function canWriteAs(
  user: User | undefined,
  collection: CollectionSlug,
  id: number | string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.update({ collection, id, data, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

async function canCreateAs(user: any, collection: any, data: any): Promise<boolean> {
  try {
    await createAs(user, collection, data)
    return true
  } catch {
    return false
  }
}

// Creates through a bound request; media uploads get a tiny real PNG because
// upload collections demand a file.
async function createAs(user: any, collection: any, data: any): Promise<any> {
  const req = user ? await boundReq(payload, user) : await boundReq(payload)
  if (collection === 'media') {
    return payload.create({
      collection,
      data,
      file: {
        data: await sharp({
          create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
        })
          .png()
          .toBuffer(),
        name: `pixel-${Math.random().toString(36).slice(2, 8)}.png`,
        mimetype: 'image/png',
        size: 8,
      },
      req,
      overrideAccess: false,
    })
  }
  return payload.create({ collection, data, req, overrideAccess: false })
}

async function canDeleteAs(
  user: User | undefined,
  collection: CollectionSlug,
  id: number | string,
): Promise<boolean> {
  try {
    const req = await boundReq(payload, user)
    await payload.delete({ collection, id, req, overrideAccess: false })
    return true
  } catch {
    return false
  }
}

describe('media access (regression cover for #90)', () => {
  it('keeps private documents readable only by owner and admin', async () => {
    const media = await createTestMedia(payload, { isPrivate: true, owner: owner.id })

    expect(await canReadAs(undefined, 'media', media.id)).toBe(false)
    expect(await canReadAs(owner, 'media', media.id)).toBe(true)
    expect(await canReadAs(otherMember, 'media', media.id)).toBe(false)
    expect(await canReadAs(admin, 'media', media.id)).toBe(true)
  })

  it('lets everyone read public media', async () => {
    const media = await createTestMedia(payload, { isPrivate: false })

    expect(await canReadAs(undefined, 'media', media.id)).toBe(true)
    expect(await canReadAs(owner, 'media', media.id)).toBe(true)
    expect(await canReadAs(otherMember, 'media', media.id)).toBe(true)
    expect(await canReadAs(admin, 'media', media.id)).toBe(true)
  })

  it('allows any authenticated user to create media but only admin to update or delete', async () => {
    const media = await createTestMedia(payload, { isPrivate: false, owner: owner.id })

    await expect(createAs(undefined, 'media', { alt: 'anon', isPrivate: true })).rejects.toThrow(
      'not allowed',
    )
    const created = await createAs(owner, 'media', { alt: 'member upload' })
    expect(created.alt).toBe('member upload')

    expect(await canWriteAs(owner, 'media', media.id, { alt: 'hijacked' })).toBe(false)
    expect(await canWriteAs(admin, 'media', media.id, { alt: 'admin alt' })).toBe(true)

    expect(await canDeleteAs(owner, 'media', media.id)).toBe(false)
  })

  it('prevents a member from flipping isPrivate or owner on their own media', async () => {
    const media = await createTestMedia(payload, { isPrivate: false, owner: owner.id })

    // The member cannot make their own upload private — that would let a
    // pending user hide a document they later use to attack verification.
    expect(await canWriteAs(owner, 'media', media.id, { isPrivate: true })).toBe(false)

    const after = await payload.findByID({
      collection: 'media',
      id: media.id,
      overrideAccess: true,
    })
    expect(after.isPrivate).toBe(false)
  })

  it('hides private media from an anonymous listing', async () => {
    await createTestMedia(payload, { isPrivate: true, owner: owner.id })
    await createTestMedia(payload, { isPrivate: false })

    // Local API bypasses access unless overrideAccess is false — the exact
    // #90 class of bug.
    const anonymousList = await payload.find({
      collection: 'media',
      where: {},
      depth: 0,
      overrideAccess: false,
    })
    expect(anonymousList.totalDocs).toBe(1)
    expect(anonymousList.docs[0].isPrivate).toBe(false)
  })
})

describe('users access', () => {
  it('scopes a member to their own row for reads and updates', async () => {
    expect(await canReadAs(undefined, 'users', owner.id)).toBe(false)
    expect(await canReadAs(owner, 'users', owner.id)).toBe(true)
    expect(await canReadAs(otherMember, 'users', owner.id)).toBe(false)
    expect(await canReadAs(admin, 'users', owner.id)).toBe(true)

    expect(await canWriteAs(owner, 'users', owner.id, { fullName: 'Me' })).toBe(true)
    expect(await canWriteAs(otherMember, 'users', owner.id, { fullName: 'Not Mine' })).toBe(false)
    expect(await canWriteAs(admin, 'users', owner.id, { fullName: 'Admin Touch' })).toBe(true)
    expect(await canDeleteAs(owner, 'users', owner.id)).toBe(false)
    expect(await canDeleteAs(admin, 'users', owner.id)).toBe(true)
  })

  it('prevents a member from escalating role, verification or consent fields', async () => {
    // A pending member tries to verify and promote themselves.
    const pending = await createTestUser(payload, { email: 'pending@usthb.dz', verified: false })

    await payload.update({
      collection: 'users',
      id: pending.id,
      data: {
        role: 'admin',
        verificationStatus: 'verified',
        consentGiven: false,
        consentTimestamp: null,
        fullName: 'Escalated',
      },
      req: await boundReq(payload, pending),
      overrideAccess: false,
    })

    const after = await payload.findByID({
      collection: 'users',
      id: pending.id,
      overrideAccess: true,
    })
    expect(after.role).toBe('user')
    expect(after.verificationStatus).toBe('pending_verification')
    expect(after.consentGiven).toBe(true)
    expect(after.consentTimestamp).toBeTruthy()
  })

  it('lets the admin verification transition log once', async () => {
    const pending = await createTestUser(payload, { email: 'to-verify@usthb.dz', verified: false })
    await payload.update({
      collection: 'users',
      id: pending.id,
      data: { verificationStatus: 'verified' },
      overrideAccess: true,
    })

    const after = await payload.findByID({
      collection: 'users',
      id: pending.id,
      overrideAccess: true,
    })
    const actions = (after.activityLog ?? []).map((entry: any) => entry.action)
    expect(actions).toContain('account_verified')
    expect(actions).toContain('account_created')
  })
})

describe('row-scoped collections: loans, book-favorites, activity-registrations, reviews', () => {
  it.each([
    [
      'loans',
      async () => {
        const book = await createTestBook(payload)
        return payload.create({
          collection: 'loans',
          data: {
            book: book.id,
            user: owner.id,
            loanDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
          },
          overrideAccess: true,
        })
      },
    ],
    [
      'book-favorites',
      async () => {
        const book = await createTestBook(payload)
        return payload.create({
          collection: 'book-favorites',
          data: { user: owner.id, book: book.id },
          req: await boundReq(payload, owner),
          overrideAccess: false,
        })
      },
    ],
    [
      'activity-registrations',
      async () => {
        const activity = await createTestActivity(payload)
        return payload.create({
          collection: 'activity-registrations',
          data: { user: owner.id, activity: activity.id },
          overrideAccess: true,
        })
      },
    ],
    [
      'article-favorites',
      async () => {
        const article = await createTestArticle(payload)
        return payload.create({
          collection: 'article-favorites',
          data: { user: owner.id, article: article.id },
          req: await boundReq(payload, owner),
          overrideAccess: false,
        })
      },
    ],
  ])('%s row scoping', async (rawCollection, make) => {
    const collection = rawCollection as CollectionSlug
    const doc = await make()
    const id = (doc as { id: number }).id

    expect(await canReadAs(undefined, collection, id)).toBe(false)
    expect(await canReadAs(owner, collection, id)).toBe(true)
    expect(await canReadAs(otherMember, collection, id)).toBe(false)
    expect(await canReadAs(admin, collection, id)).toBe(true)

    // Owner may modify and delete their own row, others may not; admin may.
    expect(await canWriteAs(otherMember, collection, id, {})).toBe(false)
    expect(await canWriteAs(admin, collection, id, {})).toBe(true)
    expect(await canDeleteAs(otherMember, collection, id)).toBe(false)
    expect(await canDeleteAs(admin, collection, id)).toBe(true)
  })

  it('keeps reviews publicly readable and admin-only writable', async () => {
    const book = await createTestBook(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: { user: owner.id, book: book.id, rating: 2, comment: 'meh' },
      overrideAccess: true,
    })

    expect(await canReadAs(undefined, 'reviews', review.id)).toBe(true)
    expect(await canReadAs(otherMember, 'reviews', review.id)).toBe(true)

    expect(
      await canCreateAs(otherMember, 'reviews', {
        user: otherMember.id,
        book: book.id,
        rating: 5,
        comment: 'fine',
      }),
    ).toBe(true)
    expect(
      await canCreateAs(undefined, 'reviews', {
        user: null,
        book: book.id,
        rating: 5,
        comment: 'anon',
      }),
    ).toBe(false)

    // Even the review owner cannot edit or delete: admin-only.
    expect(await canWriteAs(owner, 'reviews', review.id, { rating: 5 })).toBe(false)
    expect(await canDeleteAs(owner, 'reviews', review.id)).toBe(false)
    expect(await canWriteAs(admin, 'reviews', review.id, { rating: 4 })).toBe(true)
  })
})

describe('loan defaults', () => {
  it('defaults loanDate to now when not provided', async () => {
    const book = await createTestBook(payload)
    const loan = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: owner.id,
        loanDate: undefined as unknown as string,
        dueDate: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    expect(loan.loanDate).toBeTruthy()
  })
})

describe('books, articles and activities are public read, admin write', () => {
  it('books', async () => {
    const book = await createTestBook(payload)

    expect(await canReadAs(undefined, 'books', book.id)).toBe(true)

    expect(
      await canCreateAs(undefined, 'books', {
        title: 'anon',
        author: 'x',
        type: 'other',
        shortDescription: 'x',
      }),
    ).toBe(false)
    expect(
      await canCreateAs(otherMember, 'books', {
        title: 'member',
        author: 'x',
        type: 'other',
        shortDescription: 'x',
      }),
    ).toBe(false)
    expect(
      await canCreateAs(admin, 'books', {
        title: 'admin',
        author: 'x',
        type: 'other',
        shortDescription: 'x',
      }),
    ).toBe(true)

    expect(await canWriteAs(otherMember, 'books', book.id, { title: 'hijacked' })).toBe(false)
    expect(await canWriteAs(admin, 'books', book.id, { title: 'admin edit' })).toBe(true)
    expect(await canDeleteAs(otherMember, 'books', book.id)).toBe(false)
  })

  it('articles', async () => {
    const article = await createTestArticle(payload)

    expect(await canReadAs(undefined, 'articles', article.id)).toBe(true)

    expect(
      await canCreateAs(otherMember, 'articles', {
        title: 'member',
        author: 'x',
        type: 'other',
        description: 'x',
        image: article.image,
      }),
    ).toBe(false)
    expect(await canWriteAs(otherMember, 'articles', article.id, { title: 'hijacked' })).toBe(false)
    expect(await canWriteAs(admin, 'articles', article.id, { title: 'admin edit' })).toBe(true)
  })

  it('activities', async () => {
    const activity = await createTestActivity(payload)

    expect(await canReadAs(undefined, 'activities', activity.id)).toBe(true)

    expect(await canWriteAs(otherMember, 'activities', activity.id, { title: 'hijacked' })).toBe(
      false,
    )
    expect(await canWriteAs(admin, 'activities', activity.id, { title: 'admin edit' })).toBe(true)
    expect(await canDeleteAs(otherMember, 'activities', activity.id)).toBe(false)
  })
})
