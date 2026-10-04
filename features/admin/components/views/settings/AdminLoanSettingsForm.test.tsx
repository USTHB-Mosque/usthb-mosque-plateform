import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const updateAdminLoanSettings = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/admin/server/loan-settings', () => ({
  updateAdminLoanSettings: (...args: unknown[]) => updateAdminLoanSettings(...args),
}))

import AdminLoanSettingsForm from './AdminLoanSettingsForm'

const renderForm = (initial = { defaultLoanDurationDays: 14, borrowLimit: 3 }) =>
  render(<AdminLoanSettingsForm initialSettings={initial} />)

describe('AdminLoanSettingsForm (#156)', () => {
  beforeEach(() => {
    updateAdminLoanSettings.mockReset()
    refresh.mockReset()
    updateAdminLoanSettings.mockResolvedValue({ ok: true })
  })

  it('shows the values enforcement is currently using', () => {
    renderForm()
    expect(screen.getByLabelText('مدة الإعارة الافتراضية (بالأيام)')).toHaveValue(14)
    expect(screen.getByLabelText('الحد الأقصى للكتب المستعارة في وقت واحد')).toHaveValue(3)
  })

  it('writes both values and says which loans the change touches', async () => {
    const user = userEvent.setup()
    renderForm()

    const duration = screen.getByLabelText('مدة الإعارة الافتراضية (بالأيام)')
    await user.clear(duration)
    await user.type(duration, '21')
    await user.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }))

    expect(updateAdminLoanSettings).toHaveBeenCalledWith({
      defaultLoanDurationDays: 21,
      borrowLimit: 3,
    })
    expect(refresh).toHaveBeenCalled()
    expect(screen.getByText(/الإعارات الجديدة فقط/)).toBeInTheDocument()
  })

  it('surfaces the rejection instead of claiming it saved', async () => {
    updateAdminLoanSettings.mockResolvedValue({
      ok: false,
      error: 'مدة الإعارة يجب أن تكون يوماً كاملاً بين 1 و 90',
    })
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }))

    expect(refresh).not.toHaveBeenCalled()
  })
})
