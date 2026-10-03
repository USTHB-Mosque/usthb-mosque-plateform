import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestArticle } from '../lib/factories'
import { createTestUser } from '../lib/seed'

import { recordArticleRead } from '@/features/articles/server/article-reads'

let payload: Payload
let admin: User
let member: User
let other: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  admin = await createTestUser(payload, { role: 'admin', email: 'admin@reads-int.usthb.dz' })
  member = await createTestUser(payload, {
    email: 'member@reads-int.usthb.dz',
    verified: true,
  })
  other = await createTestUser(payload, { email: 'other@reads-int.usthb.dz', verified: true })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('article read counters (#156)', () => {
  it('records one counter row per member and article and increments it on re-read', async () => {
    const article = await createTestArticle(payload)

    await recordArticleRead(payload, article.id, member)
    await recordArticleRead(payload, article.id, member)
    await recordArticleRead(payload, article.id, other)

    const rows = await payload.find({
      collection: 'article-reads',
      depth: 0,
      overrideAccess: true,
      sort: 'article',
    })

    expect(rows.totalDocs).toBe(2)
    const memberRow = rows.docs.find((row) => row.user === member.id)
    expect(memberRow).toMatchObject({ article: article.id, readCount: 2 })
    expect(new Date(memberRow?.lastReadAt ?? '').getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('is a no-op for an anonymous reader and never throws', async () => {
    const article = await createTestArticle(payload)

    await expect(recordArticleRead(payload, article.id, null)).resolves.toBeUndefined()
    await expect(
      payload.count({ collection: 'article-reads', overrideAccess: true }),
    ).resolves.toMatchObject({ totalDocs: 0 })
  })

  it('counts concurrent reads of the same article without losing any', async () => {
    const article = await createTestArticle(payload)

    await Promise.all([
      recordArticleRead(payload, article.id, member),
      recordArticleRead(payload, article.id, member),
      recordArticleRead(payload, article.id, member),
    ])

    const row = (
      await payload.find({ collection: 'article-reads', depth: 0, overrideAccess: true, limit: 1 })
    ).docs[0]
    expect(row.readCount).toBe(3)
  })

  it('does nothing when the adapter has no pool, and swallows a storage failure', async () => {
    const article = await createTestArticle(payload)

    const noPool = { db: {} } as unknown as Payload
    await expect(recordArticleRead(noPool, article.id, member)).resolves.toBeUndefined()

    const broken = {
      db: {
        pool: {
          query: () => {
            throw new Error('database is gone')
          },
        },
      },
    } as unknown as Payload
    await expect(recordArticleRead(broken, article.id, member)).resolves.toBeUndefined()

    // Neither attempt wrote anything.
    await expect(
      payload.count({ collection: 'article-reads', overrideAccess: true }),
    ).resolves.toMatchObject({ totalDocs: 0 })
  })

  it('keeps the counter server-owned: nobody but an admin can read or write it', async () => {
    const article = await createTestArticle(payload)
    await recordArticleRead(payload, article.id, member)
    const row = (
      await payload.find({ collection: 'article-reads', overrideAccess: true, limit: 1 })
    ).docs[0]

    const asAdmin = await boundReq(payload, admin)
    await expect(
      payload.find({ collection: 'article-reads', req: asAdmin, overrideAccess: false }),
    ).resolves.toMatchObject({ totalDocs: 1 })

    const asMember = await boundReq(payload, member)
    await expect(
      payload.find({ collection: 'article-reads', req: asMember, overrideAccess: false }),
    ).rejects.toThrow()

    const anonymous = await boundReq(payload)
    await expect(
      payload.find({ collection: 'article-reads', req: anonymous, overrideAccess: false }),
    ).rejects.toThrow()

    await expect(
      payload.update({
        collection: 'article-reads',
        id: row.id,
        data: { readCount: 999 },
        req: asAdmin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'article-reads',
        data: {
          article: article.id,
          user: member.id,
          readCount: 5,
          lastReadAt: new Date().toISOString(),
        },
        req: asAdmin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.delete({
        collection: 'article-reads',
        id: row.id,
        req: asAdmin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
