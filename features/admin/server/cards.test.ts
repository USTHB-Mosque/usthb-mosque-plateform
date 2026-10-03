import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const revalidatePath = vi.fn()
const writeLog = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const { getAdminCardsStats, getAdminCards, issueCard, setCardStatus, getCardCandidates } =
  await import('./cards')

const user = { id: 8, role: 'admin' }

/** Payload find stub: hands back one canned result per collection. */
function stubFind(results: Record<string, unknown>) {
  return vi.fn(({ collection }: { collection: string }) =>
    Promise.resolve(results[collection] ?? { docs: [], totalDocs: 0 }),
  )
}

describe('features/admin/server/cards.ts', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    revalidatePath.mockReset()
    writeLog.mockReset()
  })

  describe('getAdminCardsStats', () => {
    it('counts the total plus each status', async () => {
      const count = vi
        .fn()
        .mockResolvedValueOnce({ totalDocs: 7 })
        .mockResolvedValueOnce({ totalDocs: 4 })
        .mockResolvedValueOnce({ totalDocs: 2 })
        .mockResolvedValueOnce({ totalDocs: 1 })
      getAdminCtx.mockResolvedValue({ payload: { count }, user })

      await expect(getAdminCardsStats()).resolves.toEqual({
        total: 7,
        active: 4,
        inactive: 2,
        archived: 1,
      })
      expect(count).toHaveBeenCalledTimes(4)
      expect(count).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'library-cards', overrideAccess: false, user }),
      )
      expect(
        count.mock.calls.map((call: unknown[]) => (call[0] as { where: unknown }).where),
      ).toEqual([
        {},
        { status: { equals: 'active' } },
        { status: { equals: 'inactive' } },
        { status: { equals: 'archived' } },
      ])
    })
  })

  describe('getAdminCards', () => {
    it('lists every card newest first when nothing is filtered', async () => {
      const find = stubFind({ 'library-cards': { docs: [], totalPages: 1, totalDocs: 0 } })
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      const page = await getAdminCards()

      expect(page).toMatchObject({ page: 1, totalPages: 1, totalDocs: 0, docs: [] })
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'library-cards',
          where: {},
          sort: '-createdAt',
          page: 1,
          limit: 20,
          depth: 2,
          overrideAccess: false,
          user,
        }),
      )
    })

    it('filters by the requested statuses', async () => {
      const find = stubFind({})
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      await getAdminCards({ status: ['archived', 'inactive'], page: 3, limit: 5 })

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { and: [{ status: { in: ['archived', 'inactive'] } }] },
          page: 3,
          limit: 5,
        }),
      )
    })

    it('resolves the member search to ids before filtering cards', async () => {
      const find = vi
        .fn()
        .mockResolvedValueOnce({ docs: [{ id: 4 }, { id: 9 }] })
        .mockResolvedValueOnce({ docs: [], totalPages: 1, totalDocs: 0 })
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      await getAdminCards({ search: '  كريم ' })

      expect(find.mock.calls[0][0]).toMatchObject({
        collection: 'users',
        where: {
          and: [
            { deletedAt: { exists: false } },
            {
              or: [
                { fullName: { contains: 'كريم' } },
                { firstName: { contains: 'كريم' } },
                { lastName: { contains: 'كريم' } },
                { email: { contains: 'كريم' } },
              ],
            },
          ],
        },
      })
      expect(find.mock.calls[1][0]).toMatchObject({
        collection: 'library-cards',
        where: {
          and: [
            {
              or: [{ cardId: { contains: 'كريم' } }, { user: { in: [4, 9] } }],
            },
          ],
        },
      })
    })

    it('normalises nonsense pagination into the first page', async () => {
      const find = stubFind({})
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      const page = await getAdminCards({ page: 0, limit: -3 })

      expect(page.page).toBe(1)
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    })
  })

  describe('issueCard', () => {
    it('issues the missing card for a verified member and records it', async () => {
      const member = { id: 12, verificationStatus: 'verified', deletedAt: null, cardId: null }
      const findByID = vi.fn().mockResolvedValue(member)
      const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 })
      const create = vi.fn().mockResolvedValue({ id: 3, cardId: 'M-00012', status: 'active' })
      const update = vi.fn().mockResolvedValue({})
      getAdminCtx.mockResolvedValue({ payload: { findByID, find, create, update }, user })

      await expect(issueCard(12)).resolves.toMatchObject({ ok: true, cardId: 'M-00012' })

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'library-cards',
          data: expect.objectContaining({ cardId: 'M-00012', user: 12, status: 'active' }),
          overrideAccess: false,
          user,
        }),
      )
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          id: 12,
          data: expect.objectContaining({ cardId: 'M-00012' }),
          overrideAccess: false,
          user,
        }),
      )
      expect(writeLog).toHaveBeenCalledWith(
        expect.anything(),
        user,
        expect.objectContaining({ action: 'card_issued' }),
      )
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/cards')
    })

    it('brings a withdrawn card back into circulation instead of minting a second one', async () => {
      const findByID = vi.fn().mockResolvedValue({
        id: 12,
        verificationStatus: 'verified',
        deletedAt: null,
        cardId: 'M-00012',
      })
      const find = vi.fn().mockResolvedValue({
        docs: [{ id: 5, cardId: 'M-00012', status: 'archived' }],
        totalDocs: 1,
      })
      const update = vi.fn().mockResolvedValue({})
      const create = vi.fn()
      getAdminCtx.mockResolvedValue({ payload: { findByID, find, update, create }, user })

      await expect(issueCard(12)).resolves.toMatchObject({ ok: true, cardId: 'M-00012' })

      expect(create).not.toHaveBeenCalled()
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'library-cards',
          id: 5,
          data: expect.objectContaining({ status: 'active' }),
          overrideAccess: false,
          user,
        }),
      )
      // The denormalised id is rewritten on every issue, so drift repairs too.
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          id: 12,
          data: expect.objectContaining({ cardId: 'M-00012' }),
          overrideAccess: false,
          user,
        }),
      )
      expect(writeLog).toHaveBeenCalledWith(
        expect.anything(),
        user,
        expect.objectContaining({ action: 'card_issued' }),
      )
    })

    it('refuses a member who is not verified', async () => {
      const findByID = vi
        .fn()
        .mockResolvedValue({ id: 12, verificationStatus: 'pending_verification', deletedAt: null })
      const create = vi.fn()
      getAdminCtx.mockResolvedValue({ payload: { findByID, create }, user })

      await expect(issueCard(12)).resolves.toEqual({
        ok: false,
        error: 'لا يمكن إصدار بطاقة لعضو غير موثق',
      })
      expect(create).not.toHaveBeenCalled()
    })

    it('refuses a soft-deleted member', async () => {
      const findByID = vi
        .fn()
        .mockResolvedValue({ id: 12, verificationStatus: 'verified', deletedAt: '2026-01-01' })
      const create = vi.fn()
      getAdminCtx.mockResolvedValue({ payload: { findByID, create }, user })

      await expect(issueCard(12)).resolves.toEqual({
        ok: false,
        error: 'لا يمكن إصدار بطاقة لعضو محذوف',
      })
      expect(create).not.toHaveBeenCalled()
    })

    it('refuses when the member already holds an active card', async () => {
      const findByID = vi.fn().mockResolvedValue({
        id: 12,
        verificationStatus: 'verified',
        deletedAt: null,
        cardId: 'M-00012',
      })
      const find = vi.fn().mockResolvedValue({
        docs: [{ id: 5, cardId: 'M-00012', status: 'active' }],
        totalDocs: 1,
      })
      getAdminCtx.mockResolvedValue({ payload: { findByID, find }, user })

      await expect(issueCard(12)).resolves.toEqual({
        ok: false,
        error: 'لدى العضو بطاقة فعالة بالفعل',
      })
    })

    it('reports a member that does not exist', async () => {
      const findByID = vi.fn().mockRejectedValue(new Error('not found'))
      getAdminCtx.mockResolvedValue({ payload: { findByID }, user })

      await expect(issueCard(99)).resolves.toEqual({ ok: false, error: 'العضو غير موجود' })
    })
  })

  describe('setCardStatus', () => {
    it('archives a card and audits it as an archive', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 5, cardId: 'M-00012', status: 'active' })
      const update = vi.fn().mockResolvedValue({ id: 5, cardId: 'M-00012', status: 'archived' })
      getAdminCtx.mockResolvedValue({ payload: { findByID, update }, user })

      await expect(setCardStatus(5, 'archived')).resolves.toEqual({ ok: true })

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'library-cards',
          id: 5,
          data: expect.objectContaining({ status: 'archived' }),
          overrideAccess: false,
          user,
        }),
      )
      expect(writeLog).toHaveBeenCalledWith(
        expect.anything(),
        user,
        expect.objectContaining({ action: 'card_archived' }),
      )
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/cards')
    })

    it('withdraws an active card as a status change, not an archive', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 5, cardId: 'M-00012', status: 'active' })
      const update = vi.fn().mockResolvedValue({})
      getAdminCtx.mockResolvedValue({ payload: { findByID, update }, user })

      await expect(setCardStatus(5, 'inactive')).resolves.toEqual({ ok: true })

      expect(writeLog).toHaveBeenCalledWith(
        expect.anything(),
        user,
        expect.objectContaining({
          action: 'card_status_changed',
          metadata: { from: 'active', to: 'inactive' },
        }),
      )
    })

    it('says nothing happened when the card is already in that state', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 5, cardId: 'M-00012', status: 'archived' })
      const update = vi.fn()
      getAdminCtx.mockResolvedValue({ payload: { findByID, update }, user })

      await expect(setCardStatus(5, 'archived')).resolves.toEqual({
        ok: false,
        error: 'البطاقة في هذه الحالة بالفعل',
      })
      expect(update).not.toHaveBeenCalled()
      expect(writeLog).not.toHaveBeenCalled()
    })

    it('reports a card that does not exist', async () => {
      const findByID = vi.fn().mockRejectedValue(new Error('not found'))
      getAdminCtx.mockResolvedValue({ payload: { findByID }, user })

      await expect(setCardStatus(5, 'archived')).resolves.toEqual({
        ok: false,
        error: 'البطاقة غير موجودة',
      })
    })
  })

  describe('getCardCandidates', () => {
    it('lists verified members with their current card state', async () => {
      const find = vi.fn().mockResolvedValue({
        docs: [
          {
            id: 4,
            fullName: 'كريم عمر',
            email: 'karim@usthb.dz',
            cardId: null,
            situation: 'student',
          },
          {
            id: 9,
            fullName: 'أمينة بلقاسم',
            email: 'amina@usthb.dz',
            cardId: 'M-00009',
            situation: 'doctoral',
          },
        ],
      })
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      await expect(getCardCandidates()).resolves.toEqual([
        {
          id: 4,
          fullName: 'كريم عمر',
          email: 'karim@usthb.dz',
          situation: 'student',
          hasCard: false,
        },
        {
          id: 9,
          fullName: 'أمينة بلقاسم',
          email: 'amina@usthb.dz',
          situation: 'doctoral',
          hasCard: true,
        },
      ])
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          where: {
            and: [
              { deletedAt: { exists: false } },
              { role: { equals: 'user' } },
              { verificationStatus: { equals: 'verified' } },
            ],
          },
          sort: 'fullName',
          limit: 20,
          depth: 0,
          overrideAccess: false,
          user,
        }),
      )
    })

    it('falls back to the email when a member never gave a name', async () => {
      const find = vi.fn().mockResolvedValue({
        docs: [{ id: 11, fullName: null, email: 'anon@usthb.dz', cardId: null }],
      })
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      await expect(getCardCandidates()).resolves.toEqual([
        { id: 11, fullName: '', email: 'anon@usthb.dz', situation: null, hasCard: false },
      ])
    })

    it('narrows the candidate list by the search term', async () => {
      const find = vi.fn().mockResolvedValue({ docs: [] })
      getAdminCtx.mockResolvedValue({ payload: { find }, user })

      await getCardCandidates('amine')

      expect(find.mock.calls[0][0]).toMatchObject({
        where: {
          and: [
            { deletedAt: { exists: false } },
            { role: { equals: 'user' } },
            { verificationStatus: { equals: 'verified' } },
            {
              or: [
                { fullName: { contains: 'amine' } },
                { firstName: { contains: 'amine' } },
                { lastName: { contains: 'amine' } },
                { email: { contains: 'amine' } },
              ],
            },
          ],
        },
      })
    })
  })
})
