import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityRegistration } from '@/payload-types'
import RegistrationsTable from './RegistrationsTable'

const cancel = vi.fn()
const refresh = vi.fn()
vi.mock('../server/activities', () => ({
  cancelActivityRegistration: (...args: unknown[]) => cancel(...args),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }))
vi.mock('@/shared/hooks/use-search', () => ({
  useSearch: () => ({
    values: { period: 'upcoming', status: '', search: '', page: 1 },
    searchValues: { period: 'upcoming', status: '', search: '', page: 1 },
    setValue: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('Member activity registrations', () => {
  it('confirms cancellation before releasing a spot', async () => {
    cancel.mockResolvedValue({ ok: true })
    const registration = {
      id: 42,
      status: 'accepted',
      attended: false,
      createdAt: '2026-09-01T12:00:00Z',
      activity: { id: 7, title: 'لقاء علمي', type: 'aqidah', startDate: '2027-01-01T12:00:00Z' },
    } as ActivityRegistration
    render(
      <RegistrationsTable registrations={[registration]} now={new Date('2026-10-01').getTime()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(cancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الإلغاء' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(42))
    expect(refresh).toHaveBeenCalled()
  })
})
