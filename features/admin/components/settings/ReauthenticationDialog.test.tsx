import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ReauthenticationDialog from './ReauthenticationDialog'

const actions = vi.hoisted(() => ({ begin: vi.fn(), complete: vi.fn(), status: vi.fn() }))
vi.mock('../../server/security', () => ({
  beginAdminReauthentication: actions.begin,
  completeAdminReauthentication: actions.complete,
  getAdminReauthenticationStatus: actions.status,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('admin identity-confirmation dialog', () => {
  it('does not unlock settings until the required second factor succeeds', async () => {
    const verified = vi.fn()
    actions.begin.mockResolvedValue({
      ok: true,
      challenge: 'opaque-attempt',
      destination: 'a***@usthb.dz',
    })
    actions.complete
      .mockResolvedValueOnce({ ok: false, error: 'الرمز غير صالح' })
      .mockResolvedValueOnce({ ok: true, expiresAt: '2026-10-03T12:05:00.000Z' })
    render(<ReauthenticationDialog open onOpenChange={vi.fn()} onVerified={verified} />)
    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), {
      target: { value: 'current-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الهوية' }))
    const code = await screen.findByLabelText('رمز التحقق أو الاسترداد')
    expect(verified).not.toHaveBeenCalled()
    fireEvent.change(code, { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الرمز' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صالح')
    expect(verified).not.toHaveBeenCalled()
    fireEvent.change(code, { target: { value: '222222' } })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الرمز' }))
    await waitFor(() => expect(verified).toHaveBeenCalledWith('2026-10-03T12:05:00.000Z'))
  })
})
