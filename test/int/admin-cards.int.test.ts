import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

import {
  boundReq,
  getTestPayload,
  resetDatabase,
  resetRateLimitBuckets,
} from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { createTestMedia } from '../lib/factories'
import {
  getAdminCards,
  getAdminCardsStats,
  getCardCandidates,
  issueCard,
  setCardStatus,
} from '@/features/admin/server/cards'
import { approveUser, rejectUser } from '@/features/admin/server/verification'
import { generateCardId } from '@/utils/library-cards'

let payload: Payload
let admin: User
let member: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  resetRateLimitBuckets()
  clearNextContext()
  admin = await createTestUser(payload, { email: 'cards-admin@usthb.dz', role: 'admin' })
  member = await createTestUser(payload, {
    email: 'cards-member@usthb.dz',
    fullName: 'كريم عمر',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function signIn(user: User) {
  const { token } = await loginToken(payload, {
    email: user.email!,
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

async function cardFor(userId: number) {
  const result = await payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    depth: 0,
    overrideAccess: true,
  })
  return result.docs[0]
}

async function cardsOf(userId: number) {
  return payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    depth: 0,
    overrideAccess: true,
  })
}

describe('the cards admin screen (#145)', () => {
  it('counts the total and each status so the four KPI cards are real', async () => {
    await signIn(admin)

    // One card per verified member: `member` from beforeEach plus two more.
    const second = await createTestUser(payload, {
      email: 'cards-second@usthb.dz',
      verified: true,
    })
    const third = await createTestUser(payload, {
      email: 'cards-third@usthb.dz',
      verified: true,
    })

    const secondCard = await cardFor(second.id)
    const thirdCard = await cardFor(third.id)
    await payload.update({
      collection: 'library-cards',
      id: secondCard.id,
      data: { status: 'inactive' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'library-cards',
      id: thirdCard.id,
      data: { status: 'archived' },
      overrideAccess: true,
    })

    await expect(getAdminCardsStats()).resolves.toEqual({
      total: 3,
      active: 1,
      inactive: 1,
      archived: 1,
    })
  })

  it('lists newest first with the holder resolved for the row', async () => {
    await signIn(admin)

    const page = await getAdminCards()

    expect(page.docs).toHaveLength(1)
    expect(page.docs[0].cardId).toBe(generateCardId(member.id))
    const holder = page.docs[0].user as User
    expect(holder.fullName).toBe('كريم عمر')
  })

  it('searches by card id and by the holder name', async () => {
    await signIn(admin)

    await expect(getAdminCards({ search: 'M-0' })).resolves.toMatchObject({ totalDocs: 1 })
    await expect(getAdminCards({ search: 'كريم' })).resolves.toMatchObject({ totalDocs: 1 })
    await expect(getAdminCards({ search: 'لا يوجد' })).resolves.toMatchObject({ totalDocs: 0 })
  })

  it('filters the list by the statuses the quick filters offer', async () => {
    await signIn(admin)
    const card = await cardFor(member.id)

    await expect(getAdminCards({ status: ['active'] })).resolves.toMatchObject({ totalDocs: 1 })
    await expect(getAdminCards({ status: ['archived'] })).resolves.toMatchObject({ totalDocs: 0 })

    await setCardStatus(card.id, 'archived')
    await expect(getAdminCards({ status: ['archived'] })).resolves.toMatchObject({ totalDocs: 1 })
  })

  it('refuses the whole screen to a member', async () => {
    await signIn(member)

    await expect(getAdminCards()).rejects.toThrow('Unauthorized')
    await expect(getAdminCardsStats()).rejects.toThrow('Unauthorized')
    await expect(issueCard(member.id)).rejects.toThrow('Unauthorized')
    await expect(setCardStatus(1, 'archived')).rejects.toThrow('Unauthorized')
    await expect(getCardCandidates()).rejects.toThrow('Unauthorized')
  })

  it('issues the missing card for a verified member and denormalises the id', async () => {
    await signIn(admin)
    // The verification hook already minted one, so the member starts without.
    const fresh = await createTestUser(payload, { email: 'cards-fresh@usthb.dz', verified: true })
    const issued = await payload.delete({
      collection: 'library-cards',
      id: (await cardFor(fresh.id)).id,
      overrideAccess: true,
    })
    expect(issued.id).toBeTruthy()
    await payload.update({
      collection: 'users',
      id: fresh.id,
      data: { cardId: null },
      overrideAccess: true,
    })

    await expect(issueCard(fresh.id)).resolves.toEqual({
      ok: true,
      cardId: generateCardId(fresh.id),
    })
    const card = await cardFor(fresh.id)
    expect(card.status).toBe('active')
    const reread = await payload.findByID({
      collection: 'users',
      id: fresh.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(reread.cardId).toBe(card.cardId)
  })

  it('refuses to issue a card to a member who is not verified', async () => {
    await signIn(admin)
    const pending = await createTestUser(payload, { email: 'cards-pending@usthb.dz' })

    await expect(issueCard(pending.id)).resolves.toEqual({
      ok: false,
      error: 'لا يمكن إصدار بطاقة لعضو غير موثق',
    })
  })

  it('refuses a second card while the first is still active', async () => {
    await signIn(admin)

    await expect(issueCard(member.id)).resolves.toEqual({
      ok: false,
      error: 'لدى العضو بطاقة فعالة بالفعل',
    })
    expect((await cardsOf(member.id)).totalDocs).toBe(1)
  })

  it('puts a withdrawn card back in service instead of minting a second one', async () => {
    await signIn(admin)
    const card = await cardFor(member.id)
    await setCardStatus(card.id, 'inactive')

    await expect(issueCard(member.id)).resolves.toEqual({ ok: true, cardId: card.cardId })
    expect((await cardsOf(member.id)).totalDocs).toBe(1)
    expect((await cardFor(member.id)).status).toBe('active')
    // Reinstating clears the archive stamp it may have carried.
    expect((await cardFor(member.id)).archivedAt).toBeNull()
  })

  it('records every card decision in the activity log', async () => {
    await signIn(admin)
    const card = await cardFor(member.id)

    await setCardStatus(card.id, 'inactive')
    await setCardStatus(card.id, 'archived')

    const logs = await payload.find({
      collection: 'logs',
      where: { targetType: { equals: 'library-card' } },
      depth: 0,
      overrideAccess: true,
    })
    expect(logs.docs.map((doc) => doc.action)).toEqual(['card_archived', 'card_status_changed'])
    expect(logs.docs[1].metadata).toEqual({ from: 'active', to: 'inactive' })
  })

  it('stamps archivedAt when a card is retired through the screen', async () => {
    await signIn(admin)
    const card = await cardFor(member.id)

    await setCardStatus(card.id, 'archived')

    expect((await cardFor(member.id)).archivedAt).toBeTruthy()
  })

  it('lists verified members as add-card candidates, flagging the ones who hold a card', async () => {
    await signIn(admin)
    const pending = await createTestUser(payload, { email: 'cards-candidate-pending@usthb.dz' })

    const candidates = await getCardCandidates()

    expect(candidates.map((candidate) => candidate.email)).toContain(member.email)
    expect(candidates.find((c) => c.email === member.email)?.hasCard).toBe(true)
    expect(candidates.map((candidate) => candidate.email)).not.toContain(pending.email)
  })

  it('narrows the candidates by the search term', async () => {
    await signIn(admin)

    const candidates = await getCardCandidates('كريم')

    expect(candidates).toHaveLength(1)
    expect(candidates[0].email).toBe(member.email)
  })
})

describe('library card access control (#145)', () => {
  it('is owner-scoped for reads and admin-only for every write', async () => {
    const other = await createTestUser(payload, { email: 'cards-other@usthb.dz', verified: true })
    const card = await cardFor(member.id)

    const read = async (user: User | undefined) => {
      try {
        await payload.findByID({
          collection: 'library-cards',
          id: card.id,
          req: await boundReq(payload, user),
          overrideAccess: false,
        })
        return true
      } catch {
        return false
      }
    }
    const write = async (user: User | undefined) => {
      try {
        await payload.update({
          collection: 'library-cards',
          id: card.id,
          data: { status: 'inactive' },
          req: await boundReq(payload, user),
          overrideAccess: false,
        })
        return true
      } catch {
        return false
      }
    }
    const create = async (user: User | undefined) => {
      try {
        await payload.create({
          collection: 'library-cards',
          data: {
            cardId: 'M-88888',
            user: member.id,
            status: 'active',
            issueDate: new Date().toISOString(),
          },
          req: await boundReq(payload, user),
          overrideAccess: false,
        })
        return true
      } catch {
        return false
      }
    }
    const remove = async (user: User | undefined) => {
      try {
        await payload.delete({
          collection: 'library-cards',
          id: card.id,
          req: await boundReq(payload, user),
          overrideAccess: false,
        })
        return true
      } catch {
        return false
      }
    }

    expect(await read(undefined)).toBe(false)
    expect(await read(member)).toBe(true)
    expect(await read(other)).toBe(false)
    expect(await read(admin)).toBe(true)

    // A member reads their own card but never moves it, even their own.
    expect(await write(member)).toBe(false)
    expect(await write(admin)).toBe(true)
    expect(await create(undefined)).toBe(false)
    expect(await create(member)).toBe(false)
    expect(await create(admin)).toBe(true)
    expect(await remove(member)).toBe(false)
    expect(await remove(admin)).toBe(true)
  })
})

describe('verification decisions notify the member (#145)', () => {
  async function notificationsFor(user: User) {
    return payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      depth: 0,
      limit: 100,
      overrideAccess: true,
    })
  }

  async function pendingApplicant() {
    const applicant = await createTestUser(payload, { email: 'verif-applicant@usthb.dz' })
    const media = await createTestMedia(payload, { isPrivate: true, owner: applicant.id })
    await payload.update({
      collection: 'users',
      id: applicant.id,
      data: { verificationDocument: media.id },
      overrideAccess: true,
    })
    return { applicant, media }
  }

  it('rings the bell and sends the email on approval, pointing at the library', async () => {
    const { applicant } = await pendingApplicant()
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      await signIn(admin)
      await expect(approveUser(applicant.id)).resolves.toEqual({ ok: true })

      const notices = await notificationsFor(applicant)
      const decision = notices.docs.find((doc) => doc.type === 'verification')
      expect(decision?.title).toBe('تم توثيق الحساب')
      expect(decision?.link).toBe('/user/library')
      expect(decision?.emailSent).toBe(true)

      expect(send).toHaveBeenCalledTimes(1)
      const mail = send.mock.calls[0][0] as { to?: string; subject?: string; html?: string }
      expect(mail.to).toBe(applicant.email)
      expect(mail.subject).toBe('تم توثيق الحساب')
      expect(mail.html).toContain('href="/user/library"')
    } finally {
      send.mockRestore()
    }
  })

  it('rings the bell and sends the email on rejection, keeping the reason in both', async () => {
    const { applicant } = await pendingApplicant()
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      await signIn(admin)
      await expect(rejectUser(applicant.id, 'الصورة غير واضحة')).resolves.toEqual({ ok: true })

      const notices = await notificationsFor(applicant)
      const decision = notices.docs.find((doc) => doc.type === 'verification')
      expect(decision?.title).toBe('تم رفض توثيق الحساب')
      expect(decision?.message).toContain('الصورة غير واضحة')
      // A rejected member has a document to re-upload, so that is where the
      // bell entry and the email both point.
      expect(decision?.link).toBe('/user/settings')
      expect(decision?.emailSent).toBe(true)

      const mail = send.mock.calls[0][0] as { html?: string }
      expect(mail.html).toContain('الصورة غير واضحة')
      expect(mail.html).toContain('href="/user/settings"')
    } finally {
      send.mockRestore()
    }
  })

  it('stores the rejection reason on the member so the admin screen can show it again', async () => {
    const { applicant } = await pendingApplicant()
    await signIn(admin)

    await rejectUser(applicant.id, 'الوثيقة غير واضحة')

    const reread = await payload.findByID({
      collection: 'users',
      id: applicant.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(reread.verificationStatus).toBe('rejected')
    expect(reread.verificationNote).toBe('الوثيقة غير واضحة')
  })

  it('leaves the certificate readable by the member and the admin, and closed to everyone else', async () => {
    const { applicant, media } = await pendingApplicant()
    const other = await createTestUser(payload, { email: 'verif-other@usthb.dz', verified: true })

    const canRead = async (user: User | undefined) => {
      try {
        await payload.findByID({
          collection: 'media',
          id: media.id,
          req: await boundReq(payload, user),
          overrideAccess: false,
        })
        return true
      } catch {
        return false
      }
    }

    // The stored URL is the protected route, never a bucket URL: that is what
    // the admin preview renders.
    expect(new URL(media.url as string).pathname.startsWith('/api/media/file/')).toBe(true)

    expect(await canRead(undefined)).toBe(false)
    expect(await canRead(applicant)).toBe(true)
    expect(await canRead(other)).toBe(false)
    expect(await canRead(admin)).toBe(true)
  })
})
