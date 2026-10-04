import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { Loan } from '@/payload-types'
import type { LoanStatus } from '@/utils/constants/loans'

const approveLoan = vi.fn()
const markLoanPickedUp = vi.fn()
const markLoanReturned = vi.fn()
const rejectLoan = vi.fn()
const reschedulePickup = vi.fn()
const sendLoanReminder = vi.fn()
const getBorrowerLoanBudget = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/admin/server/loans', () => ({
  approveLoan: (...args: unknown[]) => approveLoan(...args),
  getBorrowerLoanBudget: (...args: unknown[]) => getBorrowerLoanBudget(...args),
  markLoanPickedUp: (...args: unknown[]) => markLoanPickedUp(...args),
  markLoanReturned: (...args: unknown[]) => markLoanReturned(...args),
  rejectLoan: (...args: unknown[]) => rejectLoan(...args),
  reschedulePickup: (...args: unknown[]) => reschedulePickup(...args),
  sendLoanReminder: (...args: unknown[]) => sendLoanReminder(...args),
}))

// `booksKeys` now arrives through the same barrel as the rest of the library
// surface, so it belongs to that mock rather than to a leaf path that is no
// longer imported.
vi.mock('@/features/library', () => ({
  LoanStatusBadge: () => null,
  LoanDetailsDialog: () => null,
  booksKeys: { root: ['books'] },
  // PickupWindowTag reads the palette off this config on the two collection
  // tabs, so a stub without it fails with an unrelated-looking crash.
  statusConfig: {
    pending: { label: 'قيد الانتظار', className: 'bg-pending', dotClassName: '' },
    picked_up: { label: 'تم الأخذ', className: 'bg-picked-up', dotClassName: '' },
  },
}))

vi.mock('@/features/admin/api/loans.queries', () => ({
  adminLoansKeys: { root: ['admin-loans'] },
}))

import LoansTable from './LoansTable'

beforeEach(() => {
  vi.clearAllMocks()
})

function pendingLoan(overrides: Record<string, unknown> = {}): Loan {
  return {
    id: 11,
    status: 'pending',
    loanDate: '2026-10-01T09:00:00.000Z',
    book: { id: 3, title: 'العقيدة الواسعة', author: 'الشيخ' },
    user: { id: 7, fullName: 'أحمد بن علي', email: 'ahmed@example.com' },
    ...overrides,
  } as unknown as Loan
}

function renderTable(loans: Loan[], activeStatus: LoanStatus = 'pending') {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <LoansTable loans={loans} activeStatus={activeStatus} />
    </QueryClientProvider>,
  )
}

describe('LoansTable duplicate-loan warning (#100)', () => {
  it('stops for a borrower who already holds an unreturned book, with two outs', async () => {
    getBorrowerLoanBudget.mockResolvedValue([{ userId: 7, heldCount: 1, borrowLimit: 3 }])
    const user = userEvent.setup()
    renderTable([pendingLoan()])

    await user.click(screen.getByRole('button', { name: 'قبول طلب أحمد بن علي' }))

    expect(await screen.findByText(/يحمل أحمد بن علي/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'قبول' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'رفض مع السبب' })).toBeInTheDocument()
    expect(getBorrowerLoanBudget).toHaveBeenCalledWith([7])
    expect(approveLoan).not.toHaveBeenCalled()
  })

  it('confirms straight through when the borrower holds nothing', async () => {
    getBorrowerLoanBudget.mockResolvedValue([{ userId: 7, heldCount: 0, borrowLimit: 3 }])
    approveLoan.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderTable([pendingLoan()])

    await user.click(screen.getByRole('button', { name: 'قبول طلب أحمد بن علي' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText(/يحمل/)).toBeNull()
    expect(
      within(dialog).getByText('سيتم قبول الطلب وإنشاء رمز الاستلام وإخطار المستفيد.'),
    ).toBeInTheDocument()

    // The budget read runs inside startTransition, so the dialog can render
    // while the transition is still pending and its footer buttons disabled.
    const confirmButton = within(dialog).getByRole('button', { name: 'قبول الطلب' })
    await waitFor(() => expect(confirmButton).toBeEnabled())
    await user.click(confirmButton)

    expect(approveLoan).toHaveBeenCalledWith(11)
  })

  it('sends the single-row second out to the reason dialog', async () => {
    getBorrowerLoanBudget.mockResolvedValue([{ userId: 7, heldCount: 2, borrowLimit: 3 }])
    const user = userEvent.setup()
    renderTable([pendingLoan()])

    await user.click(screen.getByRole('button', { name: 'قبول طلب أحمد بن علي' }))

    const refuse = await screen.findByRole('button', { name: 'رفض مع السبب' })
    await waitFor(() => expect(refuse).toBeEnabled())
    await user.click(refuse)

    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'قبول' })).toBeNull()
    expect(approveLoan).not.toHaveBeenCalled()
  })

  it('warns a bulk approval once, with قبول الكل and راجع as the outs', async () => {
    getBorrowerLoanBudget.mockResolvedValue([
      { userId: 7, heldCount: 1, borrowLimit: 3 },
      { userId: 9, heldCount: 0, borrowLimit: 3 },
    ])
    const user = userEvent.setup()
    renderTable([pendingLoan(), pendingLoan({ id: 12, user: { id: 9, fullName: 'سارة قادري' } })])

    await user.click(screen.getByRole('checkbox', { name: 'تحديد الكل' }))
    await user.click(await screen.findByRole('button', { name: 'قبول المحددين' }))

    expect(await screen.findByText(/يضم التحديد/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'قبول الكل' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'راجع' })).toBeInTheDocument()
    expect(getBorrowerLoanBudget).toHaveBeenCalledWith([7, 9])
    expect(approveLoan).not.toHaveBeenCalled()
  })
})
