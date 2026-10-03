'use server'

import type { Where } from 'payload'
import { revalidatePath } from 'next/cache'
import type { LibraryCard, User } from '@/payload-types'
import type { UserSituation } from '@/utils/constants/users'
import {
  ARCHIVED_CARD_STATUS,
  LIBRARY_CARD_STATUS_LABELS,
  type LibraryCardStatus,
} from '@/utils/constants/library-cards'
import { generateCardId } from '@/utils/library-cards'
import { getAdminCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'

/** The four numbers the cards screen puts on top (#145, Figma `cards` 1606:14136). */
export interface AdminCardsStats {
  total: number
  active: number
  inactive: number
  archived: number
}

export interface AdminCardsParams {
  page?: number
  limit?: number
  search?: string
  status?: LibraryCardStatus[]
}

export interface AdminCardsPage {
  docs: LibraryCard[]
  page: number
  totalPages: number
  totalDocs: number
}

export interface CardActionResult {
  ok: boolean
  error?: string
  cardId?: string
}

/** One row in the add-card picker: a verified member and whether they hold a card. */
export interface CardCandidate {
  id: number
  fullName: string
  email: string
  situation: UserSituation | null
  hasCard: boolean
}

const MEMBER_SEARCH_FIELDS = ['fullName', 'firstName', 'lastName', 'email'] as const

const CARDS_ROUTE = '/admin-panel/cards'

function memberNameFilter(term: string): Where {
  return { or: MEMBER_SEARCH_FIELDS.map((field) => ({ [field]: { contains: term } })) }
}

function revalidateCards(): void {
  // The card id is also a column on the users table, so both screens go stale.
  revalidatePath(CARDS_ROUTE)
  revalidatePath('/admin-panel/users')
}

export async function getAdminCardsStats(): Promise<AdminCardsStats> {
  const { payload, user } = await getAdminCtx()

  const count = (where: Where) =>
    payload.count({ collection: 'library-cards', where, overrideAccess: false, user })

  const [total, active, inactive, archived] = await Promise.all([
    count({}),
    count({ status: { equals: 'active' } }),
    count({ status: { equals: 'inactive' } }),
    count({ status: { equals: ARCHIVED_CARD_STATUS } }),
  ])

  return {
    total: total.totalDocs,
    active: active.totalDocs,
    inactive: inactive.totalDocs,
    archived: archived.totalDocs,
  }
}

/**
 * The card index. Search covers the card id and the holder's name or email; a
 * relationship cannot be searched with `contains` in one query, so the member
 * side is resolved to ids first and the cards are then filtered by that list.
 */
export async function getAdminCards(params: AdminCardsParams = {}): Promise<AdminCardsPage> {
  const { payload, user } = await getAdminCtx()
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const limit = Math.max(1, Math.trunc(params.limit ?? 20))

  const andFilters: Where[] = []
  if (params.status?.length) andFilters.push({ status: { in: params.status } })

  const term = params.search?.trim()
  if (term) {
    const members = await payload.find({
      collection: 'users',
      where: { and: [{ deletedAt: { exists: false } }, memberNameFilter(term)] },
      depth: 0,
      limit: 0,
      overrideAccess: false,
      user,
    })
    andFilters.push({
      or: [{ cardId: { contains: term } }, { user: { in: members.docs.map((doc) => doc.id) } }],
    })
  }

  // depth 2 populates card -> user -> profilePicture, so a row can name the
  // holder and show their face without a second round trip.
  const result = await payload.find({
    collection: 'library-cards',
    where: andFilters.length ? { and: andFilters } : {},
    sort: '-createdAt',
    page,
    limit,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return {
    docs: result.docs as LibraryCard[],
    page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  }
}

/**
 * Issues the one card a verified member is entitled to. Cards are normally
 * minted automatically on verification, so this is the repair path: a member
 * who lost theirs gets it back by reactivating the same card rather than by
 * collecting a second one (see `utils/constants/library-cards.ts`).
 */
export async function issueCard(userId: number): Promise<CardActionResult> {
  const { payload, user } = await getAdminCtx()

  let member: User
  try {
    member = (await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
      overrideAccess: false,
      user,
    })) as User
  } catch {
    return { ok: false, error: 'العضو غير موجود' }
  }

  if (member.deletedAt) return { ok: false, error: 'لا يمكن إصدار بطاقة لعضو محذوف' }
  if (member.verificationStatus !== 'verified') {
    return { ok: false, error: 'لا يمكن إصدار بطاقة لعضو غير موثق' }
  }

  const existing = await payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user,
  })

  const held = existing.docs[0] as LibraryCard | undefined
  if (held?.status === 'active') {
    return { ok: false, error: 'لدى العضو بطاقة فعالة بالفعل' }
  }

  const cardId = held?.cardId ?? generateCardId(userId)

  if (held) {
    await payload.update({
      collection: 'library-cards',
      id: held.id,
      data: { status: 'active' },
      overrideAccess: false,
      user,
    })
  } else {
    await payload.create({
      collection: 'library-cards',
      data: {
        cardId,
        user: userId,
        status: 'active',
        issueDate: new Date().toISOString(),
      },
      overrideAccess: false,
      user,
    })
  }

  // The users table shows the card id, so it is denormalised there. Written on
  // every issue, not only on create, so a member whose `users.cardId` drifted
  // away from their card is repaired by the same repair action.
  await payload.update({
    collection: 'users',
    id: userId,
    data: { cardId },
    overrideAccess: false,
    user,
  })

  await writeLog(payload, user, {
    action: LogAction.CardIssued,
    targetType: 'user',
    targetId: userId,
    message: `أصدر بطاقة ${cardId} للعضو ${member.fullName ?? member.email}`,
  })

  revalidateCards()
  return { ok: true, cardId }
}

/** Moves a card between states. `archivedAt` is stamped by the collection hook. */
export async function setCardStatus(
  cardId: number,
  status: LibraryCardStatus,
): Promise<CardActionResult> {
  const { payload, user } = await getAdminCtx()

  let card: LibraryCard
  try {
    card = (await payload.findByID({
      collection: 'library-cards',
      id: cardId,
      depth: 0,
      overrideAccess: false,
      user,
    })) as LibraryCard
  } catch {
    return { ok: false, error: 'البطاقة غير موجودة' }
  }

  const from = card.status
  if (from === status) return { ok: false, error: 'البطاقة في هذه الحالة بالفعل' }

  await payload.update({
    collection: 'library-cards',
    id: cardId,
    data: { status },
    overrideAccess: false,
    user,
  })

  await writeLog(payload, user, {
    action: status === ARCHIVED_CARD_STATUS ? LogAction.CardArchived : LogAction.CardStatusChanged,
    targetType: 'library-card',
    targetId: cardId,
    message: `غيّر حالة البطاقة ${card.cardId} من ${LIBRARY_CARD_STATUS_LABELS[from]} إلى ${LIBRARY_CARD_STATUS_LABELS[status]}`,
    metadata: { from, to: status },
  })

  revalidateCards()
  return { ok: true }
}

/**
 * The add-card picker: verified members, whether or not they already hold a
 * card, so an admin can see at a glance who is actually missing one.
 */
export async function getCardCandidates(search?: string): Promise<CardCandidate[]> {
  const { payload, user } = await getAdminCtx()

  const andFilters: Where[] = [
    { deletedAt: { exists: false } },
    { role: { equals: 'user' } },
    { verificationStatus: { equals: 'verified' } },
  ]
  const term = search?.trim()
  if (term) andFilters.push(memberNameFilter(term))

  const result = await payload.find({
    collection: 'users',
    where: { and: andFilters },
    sort: 'fullName',
    depth: 0,
    limit: 20,
    overrideAccess: false,
    user,
  })

  return (result.docs as User[]).map((doc) => ({
    id: doc.id,
    fullName: doc.fullName ?? '',
    email: doc.email,
    situation: doc.situation ?? null,
    hasCard: Boolean(doc.cardId),
  }))
}
