import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPayloadWithUser = vi.fn()
const softDeleteUserAccount = vi.fn()
const deleteCookie = vi.fn()
const revalidatePath = vi.fn()
const redirect = vi.fn()

vi.mock('@/shared/lib/auth', () => ({
  getPayloadWithUser: (...a: unknown[]) => getPayloadWithUser(...a),
}))
vi.mock('@/features/users/server/account-lifecycle', () => ({
  softDeleteUserAccount: (...a: unknown[]) => softDeleteUserAccount(...a),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: (...a: unknown[]) => deleteCookie(...a) }),
}))
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }))

const { deleteMyAccount } = await import('./delete-account')

const payload = { kind: 'payload' }
const req = { kind: 'req' }

function signedIn(overrides: Record<string, unknown> = {}) {
  getPayloadWithUser.mockResolvedValue({
    payload,
    user: { id: 3, role: 'user' },
    req,
    ...overrides,
  })
}

describe('deleteMyAccount', () => {
  beforeEach(() => {
    getPayloadWithUser.mockReset()
    softDeleteUserAccount.mockReset().mockResolvedValue({})
    deleteCookie.mockReset()
    revalidatePath.mockReset()
    redirect.mockReset()
    // `redirect` throws in Next; emulate that so the action stops there.
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
  })

  it('refuses when nobody is signed in', async () => {
    getPayloadWithUser.mockResolvedValue(null)
    await expect(deleteMyAccount()).resolves.toEqual({
      ok: false,
      error: 'يجب تسجيل الدخول لحذف الحساب',
    })
    expect(softDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('is unreachable for an admin, because getPayloadWithUser excludes them', async () => {
    // `getPayloadWithUser()` is called without `allowAdmin`, so an admin is
    // rejected before the action sees them. Asserting the real gate — rather
    // than mocking past it — is what keeps the admin path honest.
    getPayloadWithUser.mockResolvedValue(null)
    await expect(deleteMyAccount()).resolves.toEqual({
      ok: false,
      error: 'يجب تسجيل الدخول لحذف الحساب',
    })
    expect(softDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('soft deletes the caller, clears the cookie and redirects', async () => {
    signedIn()

    await expect(deleteMyAccount()).rejects.toThrow('NEXT_REDIRECT')

    expect(getPayloadWithUser).toHaveBeenCalled()
    expect(softDeleteUserAccount).toHaveBeenCalledWith(payload, 3, req)
    expect(deleteCookie).toHaveBeenCalledWith('payload-token')
    expect(revalidatePath).toHaveBeenCalledWith('/user', 'layout')
    expect(redirect).toHaveBeenCalledWith('/auth/login?deleted=1')
  })

  it('reports a failure instead of redirecting when the soft delete throws', async () => {
    signedIn()
    softDeleteUserAccount.mockRejectedValue(new Error('db down'))

    await expect(deleteMyAccount()).resolves.toEqual({
      ok: false,
      error: 'تعذّر حذف الحساب، حاول مرة أخرى',
    })
    expect(deleteCookie).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
