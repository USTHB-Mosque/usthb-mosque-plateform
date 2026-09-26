import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestArticle, createTestBook } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import {
  getBookFavoriteState,
  toggleBookFavorite,
  removeBookFavorite,
} from '@/features/library/server/favorites'
import {
  getArticleFavoriteState,
  toggleArticleFavorite,
  removeArticleFavorite,
} from '@/features/library/server/article-favorites'
import type { User } from '@/payload-types'

let payload: Payload
let member: User
let otherMember: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'fav-member@usthb.dz', verified: true })
  otherMember = await createTestUser(payload, { email: 'fav-other@usthb.dz', verified: true })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('book favorites', () => {
  it('toggles on and off and reports the state', async () => {
    const book = await createTestBook(payload)

    // Anonymous callers simply see an unfavorited state.
    expect(await getBookFavoriteState(book.id)).toEqual({ favorited: false })

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    expect(await getBookFavoriteState(book.id)).toEqual({ favorited: false })

    expect(await toggleBookFavorite(book.id)).toEqual({ ok: true, favorited: true })
    expect(await getBookFavoriteState(book.id)).toEqual({ favorited: true })

    expect(await toggleBookFavorite(book.id)).toEqual({ ok: true, favorited: false })
    expect(await getBookFavoriteState(book.id)).toEqual({ favorited: false })
  })

  it('rejects an anonymous toggle', async () => {
    const book = await createTestBook(payload)
    const result = await toggleBookFavorite(book.id)
    expect(result).toEqual({ ok: false, error: 'يجب تسجيل الدخول', favorited: false })
  })

  it('raises the duplicate guard with its Arabic error', async () => {
    const book = await createTestBook(payload)
    const req = await boundReq(payload, member)

    const created = await payload.create({
      collection: 'book-favorites',
      data: { user: member.id, book: book.id },
      req,
      overrideAccess: false,
    })
    expect(created).toBeTruthy()

    await expect(
      payload.create({
        collection: 'book-favorites',
        data: { user: member.id, book: book.id },
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow('هذا الكتاب موجود بالفعل في المفضلة')
  })

  it('removes a favorite by id', async () => {
    const book = await createTestBook(payload)
    const req = await boundReq(payload, member)
    const favorite = await payload.create({
      collection: 'book-favorites',
      data: { user: member.id, book: book.id },
      req,
      overrideAccess: false,
    })
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const result = await removeBookFavorite(favorite.id)
    expect(result).toEqual({ ok: true })

    const remaining = await payload.find({
      collection: 'book-favorites',
      where: { user: { equals: member.id } },
      overrideAccess: true,
    })
    expect(remaining.totalDocs).toBe(0)
  })

  it('rejects an anonymous removal', async () => {
    const result = await removeBookFavorite(1)
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('refuses a favorite without any user attached', async () => {
    const book = await createTestBook(payload)

    // No data.user and no req.user: the duplicate guard returns early and the
    // required-field validation rejects the row.
    await expect(
      payload.create({
        collection: 'book-favorites',
        data: { book: book.id, user: undefined as unknown as number },
      }),
    ).rejects.toThrow()
  })

  it('scopes rows to the owner', async () => {
    const book = await createTestBook(payload)
    const req = await boundReq(payload, member)
    await payload.create({
      collection: 'book-favorites',
      data: { user: member.id, book: book.id },
      req,
      overrideAccess: false,
    })

    const otherReq = await boundReq(payload, otherMember)
    const othersView = await payload.find({
      collection: 'book-favorites',
      req: otherReq,
      overrideAccess: false,
    })
    expect(othersView.totalDocs).toBe(0)

    await expect(
      payload.delete({
        collection: 'book-favorites',
        id: 1,
        req: otherReq,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('article favorites', () => {
  it('toggles on and off and reports the state', async () => {
    const article = await createTestArticle(payload)

    // Anonymous state check for the article favorite seam.
    expect(await getArticleFavoriteState(article.id)).toEqual({ favorited: false })

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    expect(await getArticleFavoriteState(article.id)).toEqual({ favorited: false })

    expect(await toggleArticleFavorite(article.id)).toEqual({ ok: true, favorited: true })
    expect(await getArticleFavoriteState(article.id)).toEqual({ favorited: true })

    expect(await toggleArticleFavorite(article.id)).toEqual({ ok: true, favorited: false })
    expect(await getArticleFavoriteState(article.id)).toEqual({ favorited: false })
  })

  it('rejects an anonymous toggle', async () => {
    const article = await createTestArticle(payload)
    const result = await toggleArticleFavorite(article.id)
    expect(result).toEqual({ ok: false, error: 'يجب تسجيل الدخول', favorited: false })
  })

  it('raises the duplicate guard with its Arabic error', async () => {
    const article = await createTestArticle(payload)
    const req = await boundReq(payload, member)

    await payload.create({
      collection: 'article-favorites',
      data: { user: member.id, article: article.id },
      req,
      overrideAccess: false,
    })

    await expect(
      payload.create({
        collection: 'article-favorites',
        data: { user: member.id, article: article.id },
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow('هذا المقال موجود بالفعل في المفضلة')
  })

  it('removes a favorite by id', async () => {
    const article = await createTestArticle(payload)
    const req = await boundReq(payload, member)
    const favorite = await payload.create({
      collection: 'article-favorites',
      data: { user: member.id, article: article.id },
      req,
      overrideAccess: false,
    })
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const result = await removeArticleFavorite(favorite.id)
    expect(result).toEqual({ ok: true })

    const remaining = await payload.find({
      collection: 'article-favorites',
      where: { user: { equals: member.id } },
      overrideAccess: true,
    })
    expect(remaining.totalDocs).toBe(0)
  })

  it('refuses a favorite without any user attached', async () => {
    const article = await createTestArticle(payload)

    await expect(
      payload.create({
        collection: 'article-favorites',
        data: { article: article.id, user: undefined as unknown as number },
      }),
    ).rejects.toThrow()
  })

  it('rejects an anonymous removal', async () => {
    const result = await removeArticleFavorite(1)
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })
})
