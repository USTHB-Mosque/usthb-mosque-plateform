import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginForm from './LoginForm'

const actions = vi.hoisted(() => ({
  login: vi.fn(),
  complete: vi.fn(),
  push: vi.fn(),
  invalidate: vi.fn(),
}))
vi.mock('@/features/auth/server/login', () => ({ login: actions.login }))
vi.mock('@/features/auth/server/mfa', () => ({ completeLoginChallenge: actions.complete }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: actions.push }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: actions.invalidate }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => vi.resetAllMocks())

describe('two-step login form', () => {
  it('waits for the second factor before navigating to the admin panel', async () => {
    actions.login.mockResolvedValue({
      user: undefined,
      challenge: 'opaque-attempt',
      destination: 'a***@usthb.dz',
    })
    actions.complete.mockResolvedValue({ ok: true, user: { id: 7, role: 'admin' } })
    actions.invalidate.mockResolvedValue(undefined)
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'admin@usthb.dz' },
    })
    fireEvent.change(screen.getByLabelText('كلمة المرور'), {
      target: { value: 'current-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))
    const code = await screen.findByLabelText('رمز التحقق أو الاسترداد')
    expect(actions.push).not.toHaveBeenCalled()
    fireEvent.change(code, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تسجيل الدخول' }))
    await waitFor(() => expect(actions.push).toHaveBeenCalledWith('/admin-panel/dashboard'))
  })
})
