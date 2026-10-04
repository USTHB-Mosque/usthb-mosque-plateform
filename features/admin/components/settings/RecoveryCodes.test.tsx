import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SecurityGate from './SecurityGate'
import TwoFactorSettings from './TwoFactorSettings'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../server/security', () => ({
  beginAdminTwoFactorEnrollment: vi.fn(),
  confirmAdminTwoFactorEnrollment: vi.fn(),
  disableAdminTwoFactor: vi.fn(),
  regenerateAdminRecoveryCodes: vi
    .fn()
    .mockResolvedValue({ ok: true, recoveryCodes: ['ABCD-1234-5678-EF01'] }),
  beginAdminReauthentication: vi.fn(),
  completeAdminReauthentication: vi.fn(),
  getAdminReauthenticationStatus: vi.fn(),
}))
afterEach(() => vi.restoreAllMocks())

it('keeps the one-time recovery result visible after identity proof expires until acknowledged', async () => {
  const until = new Date(Date.now() + 60_000).toISOString()
  const view = (
    <SecurityGate expiresAt={until}>
      <TwoFactorSettings enabled recoveryCodesRemaining={10} />
    </SecurityGate>
  )
  const { rerender } = render(view)
  fireEvent.click(screen.getByRole('button', { name: 'إنشاء رموز استرداد جديدة' }))
  fireEvent.click(screen.getByRole('button', { name: 'إنشاء الرموز' }))
  expect(await screen.findByText('ABCD-1234-5678-EF01')).toBeVisible()
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(until) + 1)
  rerender(
    <SecurityGate expiresAt={until}>
      <TwoFactorSettings enabled recoveryCodesRemaining={10} />
    </SecurityGate>,
  )
  expect(screen.getByText('ABCD-1234-5678-EF01')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'لقد حفظت الرموز' }))
  expect(screen.queryByText('ABCD-1234-5678-EF01')).not.toBeInTheDocument()
})
