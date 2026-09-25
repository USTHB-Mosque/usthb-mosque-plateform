import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStaffCtx = vi.fn()

vi.mock('./ctx', () => ({ getStaffCtx: (...args: unknown[]) => getStaffCtx(...args) }))

const { getAdminLibraryStats } = await import('./library')

describe('getAdminLibraryStats', () => {
  beforeEach(() => getStaffCtx.mockReset())

  it('counts books and active loans and clamps available books to zero', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({ totalDocs: 2 })
      .mockResolvedValueOnce({ totalDocs: 4 })
    const user = { id: 1 }
    getStaffCtx.mockResolvedValue({ payload: { find }, user })

    await expect(getAdminLibraryStats()).resolves.toEqual({
      stats: { totalBooks: 2, borrowedBooks: 4, availableBooks: 0, lostBooks: 0 },
    })
    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ collection: 'books', overrideAccess: false, user }),
    )
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ collection: 'loans', overrideAccess: false, user }),
    )
  })

  it('returns positive availability when copies exceed active loans', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({ totalDocs: 7 })
      .mockResolvedValueOnce({ totalDocs: 3 })
    getStaffCtx.mockResolvedValue({ payload: { find }, user: { id: 1 } })
    await expect(getAdminLibraryStats()).resolves.toMatchObject({
      stats: { totalBooks: 7, borrowedBooks: 3, availableBooks: 4 },
    })
  })
})
