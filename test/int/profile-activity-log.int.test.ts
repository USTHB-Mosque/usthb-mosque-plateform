import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  createTestActivity,
  createTestArticle,
  createTestBook,
  createTestLoan,
} from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { getActivityLog } from '@/features/profile/server/activity-log'
import { LogAction } from '@/collections/Log'
import type { Log, User } from '@/payload-types'

let payload: Payload
let member: User
let other: User
let admin: User

/**
 * Deliberately unnatural wording: if the stored `message` ever reaches a
 * member's screen, this prefix shows up in the assertion output and says why.
 */
const MESSAGE_A = 'ADMIN-SENTENCE-FOR-A'
const MESSAGE_B = 'ADMIN-SENTENCE-FOR-B'

async function signIn(user: User): Promise<void> {
  const { token } = await loginToken(payload, {
    email: user.email!,
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

/** Exactly the columns a seeded audit line carries — nothing else. */
type SeedLogInput = {
  actor?: number | null
  action: Log['action']
  targetType?: string
  targetId?: string
  message: string
  /** Distinct per row: pagination must not depend on DB tie ordering. */
  timestamp: string
}

/**
 * Arrangement only: a log row written with no `user` is the documented
 * administrative bypass. Anything that asserts access behaviour goes through
 * the rules below with a real identity.
 */
function seedLog(data: SeedLogInput) {
  return payload.create({
    collection: 'logs',
    data,
    overrideAccess: true,
  })
}

/** One row in every collection the timeline derives from, plus one loan. */
async function seedHistory(owner: User) {
  const book = await createTestBook(payload, { title: 'الفوائد لابن القيم' })
  const article = await createTestArticle(payload, { title: 'مقال الإيمان' })
  const activity = await createTestActivity(payload, { title: 'حلقة التحفيظ' })
  const loan = await createTestLoan(payload, {
    book: book.id,
    user: owner.id,
    // Picked up: the only state an extension request is allowed to sit on.
    status: 'picked_up',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // These rows are written the way the member writes them — through their own
  // request — because every one of them has a hook that reads back through
  // access control.
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
  // Both review targets: the reader picks exactly one of book/article.
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

/**
 * The whole fixture: member A holds a loan with a full history and five audit
 * lines about them, member B holds nothing but one audit line of their own.
 */
async function seedFixture() {
  const history = await seedHistory(member)

  // Explicit, distinct instants: the timeline merges eight sources and
  // paginates, so a tie would let two calls order the same rows differently.
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString()
  const older = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  await Promise.all([
    seedLog({
      actor: admin.id,
      action: LogAction.LoanApproved,
      targetType: 'loan',
      targetId: String(history.loan.id),
      timestamp: at(1),
      message: `${MESSAGE_A} loan approved`,
    }),
    seedLog({
      actor: admin.id,
      action: LogAction.UserVerified,
      targetType: 'user',
      targetId: String(member.id),
      timestamp: at(2),
      message: `${MESSAGE_A} user verified`,
    }),
    seedLog({
      actor: member.id,
      action: LogAction.LoanCancelled,
      targetType: 'loan',
      targetId: String(history.loan.id),
      timestamp: at(3),
      message: `${MESSAGE_A} loan cancelled`,
    }),
    seedLog({
      actor: admin.id,
      action: LogAction.UserRejected,
      targetType: 'user',
      targetId: String(member.id),
      timestamp: at(4),
      message: `${MESSAGE_A} user rejected`,
    }),
    // A row from an older day, so the grouping has more than one bucket.
    seedLog({
      actor: admin.id,
      action: LogAction.LoanRefused,
      targetType: 'loan',
      targetId: String(history.loan.id),
      timestamp: older,
      message: `${MESSAGE_A} loan refused`,
    }),
    // `users_imported` is written with no target in production, so pointing it
    // at this member only ever happens here — it pins the fallback wording for
    // an action that has no member-facing label yet.
    seedLog({
      actor: admin.id,
      action: LogAction.UsersImported,
      targetType: 'user',
      targetId: String(member.id),
      timestamp: at(5),
      message: `${MESSAGE_A} imported`,
    }),
    seedLog({
      actor: admin.id,
      action: LogAction.UserRejected,
      targetType: 'user',
      targetId: String(other.id),
      timestamp: at(6),
      message: `${MESSAGE_B} user rejected`,
    }),
  ])

  return history
}

function allEvents(data: Awaited<ReturnType<typeof getActivityLog>>) {
  return (data?.groups ?? []).flatMap((group) => group.items)
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'history@usthb.dz', verified: true })
  other = await createTestUser(payload, { email: 'stranger@usthb.dz', verified: true })
  admin = await createTestUser(payload, { email: 'keeper@usthb.dz', role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('the logs read rule', () => {
  it('hides every row from an anonymous reader', async () => {
    await seedFixture()

    // Access returning `false` (rather than a filter) rejects the whole query.
    await expect(
      payload.find({ collection: 'logs', overrideAccess: false, limit: 100 }),
    ).rejects.toThrow('You are not allowed to perform this action.')
    await expect(
      payload.findByID({ collection: 'logs', id: 1, overrideAccess: false }),
    ).rejects.toThrow('You are not allowed to perform this action.')
  })

  it('returns every row to an admin', async () => {
    await seedFixture()

    const found = await payload.find({
      collection: 'logs',
      overrideAccess: false,
      user: admin,
      limit: 100,
    })
    expect(found.totalDocs).toBe(7)
  })

  it('never exposes one member rows about another (#165)', async () => {
    await seedFixture()

    const asStranger = await payload.find({
      collection: 'logs',
      overrideAccess: false,
      user: other,
      limit: 100,
    })
    const messages = asStranger.docs.map((doc) => doc.message)
    expect(messages).toContain(`${MESSAGE_B} user rejected`)
    expect(messages.some((message) => message.startsWith(MESSAGE_A))).toBe(false)

    // …and by id, which is the shape a direct lookup takes.
    const target = await payload.find({
      collection: 'logs',
      overrideAccess: true,
      where: { message: { equals: `${MESSAGE_A} user verified` } },
    })
    await expect(
      payload.findByID({
        collection: 'logs',
        id: target.docs[0].id,
        req: await boundReq(payload, other),
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('scopes a member without a single loan through their own rows alone', async () => {
    await seedFixture()

    // `other` owns no loan, so the rule never reaches for the loan clause.
    const found = await payload.find({
      collection: 'logs',
      overrideAccess: false,
      user: other,
      limit: 100,
    })
    expect(found.totalDocs).toBe(1)
    expect(found.docs[0].targetId).toBe(String(other.id))
  })
})

describe('getActivityLog', () => {
  it('returns null for an anonymous caller', async () => {
    await seedFixture()
    expect(await getActivityLog()).toBeNull()
  })

  it('applies the default page and limit', async () => {
    await seedFixture()
    await signIn(member)

    const data = await getActivityLog({})
    expect(data?.page).toBe(1)
    expect(data?.groups.flatMap((group) => group.items)).toHaveLength(14)
    expect(data?.totalPages).toBe(1)
  })

  it('merges the derived history with the audit lines about the member', async () => {
    await seedFixture()
    await signIn(member)

    const data = await getActivityLog({ page: 1, limit: 50 })
    expect(data).not.toBeNull()
    const events = allEvents(data!)

    expect(events.map((event) => event.label)).toEqual(
      expect.arrayContaining([
        'طلبت إعارة كتاب',
        'طلبت تمديد إعارة',
        'انضممت إلى قائمة الانتظار',
        'سجّلت في نشاط',
        'أضفت كتاباً إلى المفضلة',
        'أضفت مقالاً إلى المفضلة',
        'كتبت تقييماً',
        'قُبل طلب الإعارة',
        'رُفض طلب الإعارة',
        'ألغيت طلب الإعارة',
        'تم توثيق حسابك',
        'رُفض طلب التوثيق',
        'حدث في حسابك',
      ]),
    )
    expect(data!.totalDocs).toBe(events.length)

    // The stored admin sentence never becomes the label.
    const stored = await payload.find({ collection: 'logs', overrideAccess: true, limit: 100 })
    for (const message of stored.docs.map((doc) => doc.message)) {
      expect(events.map((event) => event.label)).not.toContain(message)
    }
  })

  it('distinguishes what the member did from what the administration did', async () => {
    await seedFixture()
    await signIn(member)

    const events = allEvents(await getActivityLog({ page: 1, limit: 50 }))

    const approved = events.find((event) => event.label === 'قُبل طلب الإعارة')!
    expect(approved.source).toBe('admin')
    // Book titles ride along with the rows that have one…
    expect(approved.detail).toBe('الفوائد لابن القيم')

    const cancelled = events.find((event) => event.label === 'ألغيت طلب الإعارة')!
    expect(cancelled.source).toBe('self')
    expect(cancelled.detail).toBe('الفوائد لابن القيم')

    const extension = events.find((event) => event.label === 'طلبت تمديد إعارة')!
    expect(extension.detail).toBe('الفوائد لابن القيم')

    // …while an audit line about the person has no book to name.
    const verified = events.find((event) => event.label === 'تم توثيق حسابك')!
    expect(verified.source).toBe('admin')
    expect(verified.detail).toBeUndefined()
  })

  it('names the target of a review whichever side of the pair it targets', async () => {
    await seedFixture()
    await signIn(member)

    const events = allEvents(await getActivityLog({ page: 1, limit: 50 }))
    const details = events
      .filter((event) => event.label === 'كتبت تقييماً')
      .map((event) => event.detail)
      .sort()
    expect(details).toEqual(['الفوائد لابن القيم', 'مقال الإيمان'])
  })

  it('groups by local day, newest first', async () => {
    await seedFixture()
    await signIn(member)

    const data = await getActivityLog({ page: 1, limit: 50 })
    const groups = data!.groups
    expect(groups.length).toBeGreaterThanOrEqual(2)
    expect(groups[0].isToday).toBe(true)
    expect(groups.at(-1)!.isToday).toBe(false)
    expect(groups.at(-1)!.items.map((event) => event.label)).toContain('رُفض طلب الإعارة')
  })

  it('paginates without repeating or dropping an event', async () => {
    await seedFixture()
    await signIn(member)

    const first = await getActivityLog({ page: 1, limit: 5 })
    const second = await getActivityLog({ page: 2, limit: 5 })
    const third = await getActivityLog({ page: 3, limit: 5 })

    expect(first!.page).toBe(1)
    expect(second!.page).toBe(2)
    expect(first!.totalPages).toBe(3)
    expect(first!.totalDocs).toBe(14)

    const ids = [first, second, third].map((page) => allEvents(page!).map((event) => event.id))
    expect(ids[0]).toHaveLength(5)
    expect(ids[1]).toHaveLength(5)
    expect(ids[2]).toHaveLength(4)
    expect(new Set(ids.flat()).size).toBe(14)
  })

  it('shows an empty timeline to a member with no history at all', async () => {
    const fresh = await createTestUser(payload, { email: 'blank@usthb.dz', verified: true })
    await signIn(fresh)

    const data = await getActivityLog({})
    expect(data).not.toBeNull()
    expect(data!.groups).toEqual([])
    expect(data!.totalDocs).toBe(0)
    expect(data!.totalPages).toBe(0)
  })

  it('keeps one member history off another member screen (#165)', async () => {
    await seedFixture()
    await signIn(other)

    const labels = allEvents(await getActivityLog({ page: 1, limit: 50 })).map(
      (event) => event.label,
    )
    expect(labels).toEqual(['رُفض طلب التوثيق'])
  })

  // ---- #178: the member's own events outlive their source rows ----

  it('keeps the favorite event after the favorite row is deleted (#178)', async () => {
    await seedFixture()
    await signIn(member)

    // A deleted *target* needs no test here because the schema forbids it:
    // every source column referencing a book is NOT NULL under an ON DELETE
    // SET NULL FK (and `reviews` carries an exactly-one-target CHECK), so a
    // referenced book cannot be deleted at all — `deleteBook` catches that and
    // tells the admin to archive instead. The reachable lossiness is exactly
    // the source row going away, which is what this and the next test cover.
    const req = await boundReq(payload, member)
    const favorite = await payload.find({
      collection: 'book-favorites',
      where: { user: { equals: member.id } },
      limit: 1,
      req,
      overrideAccess: false,
    })
    await payload.delete({
      collection: 'book-favorites',
      id: favorite.docs[0].id,
      req,
      overrideAccess: false,
    })

    const events = allEvents(await getActivityLog({ page: 1, limit: 50 }))
    const favorited = events.filter((event) => event.label === 'أضفت كتاباً إلى المفضلة')
    expect(favorited).toHaveLength(1)
    // The book itself still exists, so the title resolves at render time.
    expect(favorited[0].detail).toBe('الفوائد لابن القيم')
  })

  it('keeps the registration event after the registration row is removed (#178)', async () => {
    await seedFixture()
    await signIn(member)

    // Withdrawal keeps the row (a guarded status transition), so the case an
    // append-only stream must survive is the row going away entirely: an
    // administrator clearing it. The write is an administrative bypass.
    const registration = await payload.find({
      collection: 'activity-registrations',
      where: { user: { equals: member.id } },
      limit: 1,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'activity-registrations',
      id: registration.docs[0].id,
      overrideAccess: true,
    })

    const events = allEvents(await getActivityLog({ page: 1, limit: 50 }))
    expect(events.some((event) => event.label === 'سجّلت في نشاط')).toBe(true)
  })
})
