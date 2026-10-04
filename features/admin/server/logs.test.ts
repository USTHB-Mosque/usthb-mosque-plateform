import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const create = vi.fn()

vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))

const { getAdminLogs, writeLog } = await import('./logs')
const user = { id: 1, role: 'admin' }

describe('admin logs server actions', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    create.mockReset()
  })

  it('writes logs with normalized optional target ids and access context', async () => {
    await writeLog({ create } as never, user as never, {
      action: 'book_created',
      message: 'added',
      targetId: 2,
    })
    await writeLog({ create } as never, user as never, {
      action: 'book_created',
      message: 'none',
      targetId: null,
    })
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0][0]).toMatchObject({
      collection: 'logs',
      data: { actor: 1, targetId: '2', message: 'added' },
      user,
      overrideAccess: false,
    })
    expect(create.mock.calls[1][0].data.targetId).toBeUndefined()
  })

  it('queries with defaults when no filters are set', async () => {
    const result = {
      docs: [],
      page: 1,
      totalPages: 0,
      totalDocs: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }
    const find = vi.fn().mockResolvedValue(result)
    getAdminCtx.mockResolvedValue({ payload: { find }, user })
    await expect(getAdminLogs()).resolves.toMatchObject({ logs: [], groups: [], page: 1 })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, page: 1, limit: 50, overrideAccess: false, user }),
    )
  })

  it('applies all optional filters and explicit pagination', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [],
      page: 2,
      totalPages: 3,
      totalDocs: 30,
      hasNextPage: true,
      hasPrevPage: true,
    })
    getAdminCtx.mockResolvedValue({ payload: { find }, user })
    await getAdminLogs({
      actor: 9,
      action: 'book_created',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 2,
      limit: 10,
    })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { actor: { equals: 9 } },
            { action: { equals: 'book_created' } },
            { timestamp: { greater_than_equal: new Date('2026-01-01') } },
            { timestamp: { less_than_equal: new Date('2026-01-31') } },
          ],
        },
        page: 2,
        limit: 10,
      }),
    )
  })
})
