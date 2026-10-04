import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser } from '../lib/seed'
import {
  createTestActivity,
  createTestArticle,
  createTestBook,
  createTestLoan,
} from '../lib/factories'

import type { Payload } from 'payload'
import { MemberEventAction } from '@/collections/MemberEvent'
import { recordMemberEvent } from '@/features/profile/server/member-events'
import type { User } from '@/payload-types'

let payload: Payload
let member: User
let other: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  member = await createTestUser(payload, { email: 'events@usthb.dz', verified: true })
  other = await createTestUser(payload, { email: 'bystander@usthb.dz', verified: true })
  admin = await createTestUser(payload, { email: 'keeper@usthb.dz', role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

/** One create through each of the seven hooked collections, as the member. */
async function seedEveryAction(owner: User) {
  const book = await createTestBook(payload, { title: 'الفوائد لابن القيم' })
  const article = await createTestArticle(payload, { title: 'مقال الإيمان' })
  const activity = await createTestActivity(payload, { title: 'حلقة التحفيظ' })
  const loan = await createTestLoan(payload, {
    book: book.id,
    user: owner.id,
    status: 'picked_up',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const req = await boundReq(payload, owner)
  const asOwner = { req, overrideAccess: false }

  await payload.create({
    collection: 'book-favorites',
    data: { user: owner.id, book: book.id },
    ...asOwner,
  })
  await payload.create({
    collection: 'article-favorites',
    data: { user: owner.id, article: article.id },
    ...asOwner,
  })
  await payload.create({
    collection: 'activity-registrations',
    data: { user: owner.id, activity: activity.id },
    ...asOwner,
  })
  await payload.create({
    collection: 'waitlist-entries',
    data: { user: owner.id, book: book.id, position: 1 },
    ...asOwner,
  })
  await payload.create({
    collection: 'loan-extensions',
    data: { user: owner.id, loan: loan.id, days: 7 },
    ...asOwner,
  })
  await payload.create({
    collection: 'reviews',
    data: { user: owner.id, book: book.id, rating: 5, comment: 'ممتاز' },
    ...asOwner,
  })
  await payload.create({
    collection: 'reviews',
    data: { user: owner.id, article: article.id, rating: 4, comment: 'جيد' },
    ...asOwner,
  })

  return { book, article, activity, loan }
}

describe('the hooks on the seven source collections', () => {
  it('writes one event per member action, with the content target', async () => {
    await seedEveryAction(member)

    const events = await payload.find({
      collection: 'member-events',
      where: { user: { equals: member.id } },
      // Row order, not time order: every create lands in the same test second,
      // so tie ordering needs the serial id to be deterministic.
      sort: 'id',
      limit: 100,
      overrideAccess: true,
    })

    expect(events.totalDocs).toBe(8)
    // Fixture order: the loan request first, then favorites, registration,
    // waitlist and extension, then both reviews.
    expect(events.docs.map((event) => event.action)).toEqual([
      MemberEventAction.LoanRequested,
      MemberEventAction.BookFavorited,
      MemberEventAction.ArticleFavorited,
      MemberEventAction.RegistrationCreated,
      MemberEventAction.WaitlistJoined,
      MemberEventAction.ExtensionRequested,
      MemberEventAction.ReviewCreated,
      MemberEventAction.ReviewCreated,
    ])
    expect(events.docs.map((event) => event.targetType)).toEqual([
      'book',
      'book',
      'article',
      'activity',
      'book',
      'book',
      'book',
      'article',
    ])
  })

  it('resolves the extension target to the book through the loan', async () => {
    await seedEveryAction(member)

    const extensionEvent = await payload.find({
      collection: 'member-events',
      where: { action: { equals: MemberEventAction.ExtensionRequested } },
      limit: 1,
      overrideAccess: true,
    })
    const loan = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      // depth 0: the book arrives as the raw id the event stored.
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    expect(String(extensionEvent.docs[0].targetId)).toBe(String(loan.docs[0].book))
  })

  it('does not write an event when an existing row is updated', async () => {
    const { book } = await seedEveryAction(member)

    const req = await boundReq(payload, member)
    const favorite = await payload.find({
      collection: 'book-favorites',
      where: { user: { equals: member.id } },
      limit: 1,
      req,
      overrideAccess: false,
    })
    await payload.update({
      collection: 'book-favorites',
      id: favorite.docs[0].id,
      data: { book: book.id },
      req,
      overrideAccess: false,
    })

    const events = await payload.find({
      collection: 'member-events',
      where: { user: { equals: member.id } },
      limit: 100,
      overrideAccess: true,
    })
    expect(events.totalDocs).toBe(8)
  })

  it('writes the event for the row owner even when an admin performs the write', async () => {
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id })

    const events = await payload.find({
      collection: 'member-events',
      where: { user: { equals: member.id } },
      limit: 100,
      overrideAccess: true,
    })
    expect(events.totalDocs).toBe(1)
    expect(events.docs[0].action).toBe(MemberEventAction.LoanRequested)
  })
})

describe('the member-events access shape', () => {
  it('rejects anonymous readers outright', async () => {
    await seedEveryAction(member)

    await expect(
      payload.find({ collection: 'member-events', overrideAccess: false, limit: 100 }),
    ).rejects.toThrow('You are not allowed to perform this action.')
  })

  it('shows a member only their own events', async () => {
    await seedEveryAction(member)
    await createTestLoan(payload, { book: (await createTestBook(payload)).id, user: other.id })

    const asMember = await payload.find({
      collection: 'member-events',
      overrideAccess: false,
      user: member,
      limit: 100,
    })
    expect(asMember.totalDocs).toBe(8)

    const asOther = await payload.find({
      collection: 'member-events',
      overrideAccess: false,
      user: other,
      limit: 100,
    })
    expect(asOther.totalDocs).toBe(1)
  })

  it('returns every row to an admin', async () => {
    await seedEveryAction(member)

    const found = await payload.find({
      collection: 'member-events',
      overrideAccess: false,
      user: admin,
      limit: 100,
    })
    expect(found.totalDocs).toBe(8)
  })

  it('is append-only: nobody creates, updates or deletes through access control', async () => {
    await seedEveryAction(member)
    const target = await payload.find({
      collection: 'member-events',
      where: { user: { equals: member.id } },
      limit: 1,
      overrideAccess: true,
    })
    const id = target.docs[0].id

    // The only writer is the hook, which bypasses access deliberately — no
    // caller, not even an admin, may write a row through access control.
    // Local API ops default `overrideAccess: true`, so every probe is explicit.
    await expect(
      payload.create({
        collection: 'member-events',
        data: {
          user: member.id,
          action: MemberEventAction.LoanRequested,
          targetType: 'book',
          targetId: '1',
          timestamp: new Date().toISOString(),
        },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow('You are not allowed to perform this action.')
    await expect(
      payload.update({
        collection: 'member-events',
        id,
        data: { targetId: '9' },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow('You are not allowed to perform this action.')
    await expect(
      payload.delete({
        collection: 'member-events',
        id,
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow('You are not allowed to perform this action.')
  })
})

describe('recordMemberEvent', () => {
  it('silently ignores an unresolvable owner or target', async () => {
    const req = await boundReq(payload, admin)

    await recordMemberEvent(req, {
      user: Number.NaN,
      action: MemberEventAction.LoanRequested,
      targetType: 'book',
      targetId: 1,
      timestamp: new Date().toISOString(),
    })
    await recordMemberEvent(req, {
      user: member.id,
      action: MemberEventAction.LoanRequested,
      targetType: 'book',
      targetId: Number.NaN,
      timestamp: new Date().toISOString(),
    })

    const events = await payload.find({
      collection: 'member-events',
      limit: 100,
      overrideAccess: true,
    })
    expect(events.totalDocs).toBe(0)
  })
})
