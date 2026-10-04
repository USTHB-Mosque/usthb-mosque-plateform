import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { generateCardId } from '@/utils/library-cards'

let payload: Payload

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function cardsFor(userId: number) {
  return payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    depth: 0,
    overrideAccess: true,
  })
}

describe('library cards auto-issue per verified user (#19/#101)', () => {
  it('does not mint a card while a member stays pending', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'pending@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Pending Member',
        role: 'user',
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    expect((await cardsFor(user.id)).totalDocs).toBe(0)
  })

  it('issues a card on the verified transition and stamps users.cardId', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'flip@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Flip Member',
        role: 'user',
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    expect((await cardsFor(user.id)).totalDocs).toBe(0)

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { verificationStatus: 'verified' },
      overrideAccess: true,
    })

    const cards = await cardsFor(user.id)
    expect(cards.totalDocs).toBe(1)
    expect(cards.docs[0].cardId).toBe(generateCardId(user.id))
    expect(cards.docs[0].status).toBe('active')
    expect(cards.docs[0].user).toBe(user.id)

    const fresh = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(fresh.cardId).toBe(cards.docs[0].cardId)
  })

  it('mints a card for a user created as verified', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'created-verified@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Already Verified',
        role: 'user',
        verificationStatus: 'verified',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    const cards = await cardsFor(user.id)
    expect(cards.totalDocs).toBe(1)
    expect(cards.docs[0].cardId).toBe(generateCardId(user.id))
  })

  it('keeps one card per member across repeated verified updates', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'repeat@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Repeat Member',
        role: 'user',
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { verificationStatus: 'verified' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { verificationStatus: 'verified', fullName: 'Updated Again' },
      overrideAccess: true,
    })
    // A rejection needs a reason (#145); it must not disturb the card either way.
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { verificationStatus: 'rejected', verificationNote: 'بيانات ناقصة' },
      overrideAccess: true,
    })

    const afterRejection = await cardsFor(user.id)
    expect(afterRejection.totalDocs).toBe(1)
    expect(afterRejection.docs[0].status).toBe('active')
  })

  it('removes the card when the member is deleted', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'delete@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Delete Member',
        role: 'user',
        verificationStatus: 'verified',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    expect((await cardsFor(user.id)).totalDocs).toBe(1)

    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })

    expect((await cardsFor(user.id)).totalDocs).toBe(0)
  })
})

describe('library card status (#145): archived is the only stamped state', () => {
  async function verifiedMember(email: string): Promise<number> {
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password: 'correct horse battery',
        fullName: 'Status Member',
        role: 'user',
        verificationStatus: 'verified',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    const card = (await cardsFor(user.id)).docs[0]
    return card.id
  }

  it('leaves a newly issued active card unstamped', async () => {
    const cardId = await verifiedMember('stamped-active@cards-int.usthb.dz')

    const card = await payload.findByID({
      collection: 'library-cards',
      id: cardId,
      depth: 0,
      overrideAccess: true,
    })
    expect(card.status).toBe('active')
    expect(card.archivedAt).toBeNull()
  })

  it('stamps archivedAt when the card is archived, and keeps the first stamp', async () => {
    const cardId = await verifiedMember('stamped-archive@cards-int.usthb.dz')

    const archived = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'archived' },
      overrideAccess: true,
    })
    expect(archived.status).toBe('archived')
    expect(archived.archivedAt).toBeTruthy()
    const firstStamp = archived.archivedAt

    // Archiving an already-archived card keeps the original stamp rather than
    // pretending the card was retired twice.
    const again = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'archived' },
      overrideAccess: true,
    })
    expect(again.archivedAt).toBe(firstStamp)
  })

  it('accepts the withdrawn inactive state without stamping it', async () => {
    const cardId = await verifiedMember('stamped-inactive@cards-int.usthb.dz')

    const card = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'inactive' },
      overrideAccess: true,
    })
    expect(card.status).toBe('inactive')
    expect(card.archivedAt).toBeNull()
  })

  it('clears a stale stamp when the card comes back into circulation', async () => {
    const cardId = await verifiedMember('stamped-clear@cards-int.usthb.dz')
    await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'archived' },
      overrideAccess: true,
    })

    const restored = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'active' },
      overrideAccess: true,
    })
    expect(restored.archivedAt).toBeNull()
  })

  it('leaves the stamp alone when an edit does not touch the status', async () => {
    const cardId = await verifiedMember('stamped-unrelated@cards-int.usthb.dz')
    const archived = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: { status: 'archived' },
      overrideAccess: true,
    })

    const renamed = await payload.update({
      collection: 'library-cards',
      id: cardId,
      data: {},
      overrideAccess: true,
    })
    expect(renamed.status).toBe('archived')
    expect(renamed.archivedAt).toBe(archived.archivedAt)
  })

  it('stamps a card that is created already retired', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'stamped-created-archived@cards-int.usthb.dz',
        password: 'correct horse battery',
        fullName: 'Born Retired',
        role: 'user',
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    const card = await payload.create({
      collection: 'library-cards',
      data: {
        cardId: 'M-99999',
        user: user.id,
        status: 'archived',
        issueDate: '2026-01-15T00:00:00.000Z',
      },
      overrideAccess: true,
    })
    expect(card.archivedAt).toBeTruthy()
  })
})
