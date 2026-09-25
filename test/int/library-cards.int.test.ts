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
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { verificationStatus: 'rejected' },
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
