import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPayloadWithUser = vi.fn()

vi.mock('@/shared/lib/auth', () => ({
  getPayloadWithUser: (...args: unknown[]) => getPayloadWithUser(...args),
}))

const { cancelActivityRegistration, getUserActivityRegistration } = await import('./activities')

const member = { id: 7 }
const registration = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user: member.id,
  activity: 3,
  ...overrides,
})

describe('status guards when a registration carries no status', () => {
  beforeEach(() => {
    getPayloadWithUser.mockReset()
  })

  it('treats a missing status as not registered and not cancellable', async () => {
    const findByID = vi.fn().mockResolvedValue(registration({ status: null }))
    getPayloadWithUser.mockResolvedValue({ payload: { findByID }, user: member, req: {} })

    expect(await cancelActivityRegistration(1)).toEqual({
      ok: false,
      error: 'لا يمكن إلغاء هذا التسجيل',
    })
  })

  it('still reports a member with no status as registered', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [registration({ status: undefined })] })
    getPayloadWithUser.mockResolvedValue({ payload: { find }, user: member, req: {} })

    expect(await getUserActivityRegistration('3')).toEqual({ registered: true })
  })
})
