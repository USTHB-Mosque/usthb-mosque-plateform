import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Loan, LoanExtension } from '@/payload-types'

const refresh = vi.fn()
const push = vi.fn()
const cancelLoan = vi.fn()
const withdrawLoanExtension = vi.fn()
const requestLoanExtension = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Both server modules reach `@/payload.config` through shared/lib/auth; booting
// that config in jsdom needs S3 env the test does not have. The gates these
// actions enforce are covered by the integration suites instead.
vi.mock('@/features/library/server/cancel-loan', () => ({
  cancelLoan: (...args: unknown[]) => cancelLoan(...args),
}))

vi.mock('@/features/library/server/loan-extensions', () => ({
  requestLoanExtension: (...args: unknown[]) => requestLoanExtension(...args),
  withdrawLoanExtension: (...args: unknown[]) => withdrawLoanExtension(...args),
}))

import LoansTable from './LoansTable'

function loanWith(fields: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    book: { id: 11, title: 'مقدمة ابن خلدون', author: 'ابن خلدون' },
    user: 1,
    status: 'pending',
    loanDate: '2026-09-01T09:00:00.000Z',
    createdAt: '2026-09-01T09:00:00.000Z',
    ...fields,
  } as unknown as Loan
}

function extensionWith(loan: Loan, fields: Partial<LoanExtension> = {}): LoanExtension {
  return {
    id: 5,
    loan: loan.id,
    user: 1,
    status: 'pending',
    days: 7,
    ...fields,
  } as unknown as LoanExtension
}

function setup(loans: Loan[], extensions: LoanExtension[] = []) {
  const user = userEvent.setup()
  render(<LoansTable loans={loans} extensions={extensions} />)
  return user
}

type User = ReturnType<typeof userEvent.setup>

async function openMenu(user: User, title = 'مقدمة ابن خلدون') {
  await user.click(screen.getByRole('button', { name: new RegExp(`إجراءات ${title}`) }))
  await screen.findByRole('menuitem', { name: /تفاصيل الإعارة/ })
}

/** The open popup; Base UI's Menu does not expose `role="menu"` here. */
const menu = () => document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement

/** The desktop table row — the mobile list and the filter chips also carry text. */
const desktopRow = () => document.querySelector('tbody tr') as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  // `useSearch` round-trips the filters through the real URL, so one test's
  // tab or status choice would otherwise decide the next test's rows.
  window.history.replaceState({}, '', window.location.pathname)
  cancelLoan.mockResolvedValue({ success: true, message: 'تم إلغاء الطلب' })
  withdrawLoanExtension.mockResolvedValue({ success: true, message: 'تم السحب' })
  requestLoanExtension.mockResolvedValue({ success: true, message: 'تم' })
})

describe('LoansTable cancellation menu (D6, #153)', () => {
  it.each(['pending', 'accepted'] as const)(
    'offers cancellation while the request is still %s',
    async (status) => {
      const user = setup([loanWith({ status })])
      await openMenu(user)

      expect(within(menu()).getByRole('menuitem', { name: /إلغاء الطلب/ })).toBeInTheDocument()
    },
  )

  it.each(['picked_up', 'refused', 'cancelled'] as const)(
    'does not offer cancellation once the request is %s',
    async (status) => {
      const user = setup([loanWith({ status })])
      await openMenu(user)

      expect(
        within(menu()).queryByRole('menuitem', { name: /إلغاء الطلب/ }),
      ).not.toBeInTheDocument()
    },
  )

  it('does not offer cancellation on a returned loan, which lives in the past tab', async () => {
    const user = setup([loanWith({ status: 'returned' })])
    await user.click(screen.getByRole('tab', { name: 'طلباتي السابقة' }))

    await openMenu(user)

    expect(within(menu()).queryByRole('menuitem', { name: /إلغاء الطلب/ })).not.toBeInTheDocument()
  })

  it('warns an accepted borrower that the copy goes back and that this is not a no-show', async () => {
    const user = setup([loanWith({ status: 'accepted' })])
    await openMenu(user)
    await user.click(within(menu()).getByRole('menuitem', { name: /إلغاء الطلب/ }))

    // D6: the confirmation is where the member learns what cancelling costs.
    expect(await screen.findByText('إلغاء طلب الإعارة')).toBeInTheDocument()
    expect(
      screen.getByText(/سيتم تحرير النسخة المخصصة لـ«مقدمة ابن خلدون» فوراً/),
    ).toBeInTheDocument()
    expect(screen.getByText(/لن يُحتسب هذا الإجراء غياباً/)).toBeInTheDocument()
    // Nothing has happened yet — the dialog is the gate.
    expect(cancelLoan).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'تأكيد الإلغاء' }))

    await waitFor(() => expect(cancelLoan).toHaveBeenCalledWith(1))
    expect(refresh).toHaveBeenCalled()
  })

  it('keeps the confirmation for a pending request free of any copy-release warning', async () => {
    const user = setup([loanWith({ status: 'pending' })])
    await openMenu(user)
    await user.click(within(menu()).getByRole('menuitem', { name: /إلغاء الطلب/ }))

    expect(await screen.findByText('إلغاء طلب الإعارة')).toBeInTheDocument()
    expect(screen.getByText(/سيتم إلغاء طلب «مقدمة ابن خلدون»/)).toBeInTheDocument()
    expect(screen.queryByText(/تحرير النسخة المخصصة/)).not.toBeInTheDocument()
  })

  it('cancels from the details dialog too, through the same confirmation', async () => {
    const user = setup([loanWith({ status: 'accepted' })])
    await user.click(within(desktopRow()).getByText('مقبول'))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /إلغاء الطلب/ }))

    expect(await screen.findByText('إلغاء طلب الإعارة')).toBeInTheDocument()
    expect(cancelLoan).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'تأكيد الإلغاء' }))
    await waitFor(() => expect(cancelLoan).toHaveBeenCalledWith(1))
  })

  it('keeps the loan period on a live loan, so the cancelled one is the exception', async () => {
    const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const user = setup([loanWith({ status: 'picked_up', dueDate })])
    await user.click(within(desktopRow()).getByText('تم الأخذ'))

    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getAllByText('فترة الإعارة')).toHaveLength(1)
    expect(within(dialog).getAllByText('تاريخ الإعارة')).toHaveLength(1)
    // The row and the calendar's legend.
    expect(within(dialog).getAllByText('موعد الإرجاع')).toHaveLength(2)
  })

  it('shows a cancelled loan as status only — no period, no dates', async () => {
    const user = setup([loanWith({ status: 'cancelled', dueDate: '2026-09-15T09:00:00.000Z' })])
    await user.click(within(desktopRow()).getByText('ملغى'))

    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('الحالة:')).toBeInTheDocument()
    expect(within(dialog).getByText('ملغى')).toBeInTheDocument()
    // D6 (#153): the borrower withdrew, so there is no period left to honour —
    // a highlighted due date next to `ملغى` would read as a live deadline.
    expect(within(dialog).queryAllByText('فترة الإعارة')).toHaveLength(0)
    expect(within(dialog).queryAllByText('تاريخ الإعارة')).toHaveLength(0)
    expect(within(dialog).queryAllByText('موعد الإرجاع')).toHaveLength(0)
  })
})

describe('LoansTable extension withdrawal (D6, #153)', () => {
  it('offers withdrawal instead of a new request while one is pending', async () => {
    const loan = loanWith({ status: 'picked_up' })
    const user = setup([loan], [extensionWith(loan)])

    await openMenu(user)

    expect(within(menu()).getByRole('menuitem', { name: /سحب طلب التمديد/ })).toBeInTheDocument()
    expect(within(menu()).queryByRole('menuitem', { name: /طلب تمديد/ })).not.toBeInTheDocument()
  })

  it('goes back to asking for an extension once the request is no longer pending', async () => {
    const loan = loanWith({ status: 'picked_up' })
    const user = setup([loan], [extensionWith(loan, { status: 'withdrawn' })])

    await openMenu(user)

    expect(within(menu()).queryByRole('menuitem', { name: /سحب/ })).not.toBeInTheDocument()
    expect(within(menu()).getByRole('menuitem', { name: /طلب تمديد الإعارة/ })).toBeInTheDocument()
  })

  it('asks for confirmation before withdrawing and only then calls the action', async () => {
    const loan = loanWith({ status: 'picked_up' })
    const user = setup([loan], [extensionWith(loan)])

    await openMenu(user)
    await user.click(within(menu()).getByRole('menuitem', { name: /سحب طلب التمديد/ }))

    expect(await screen.findByText('سحب طلب التمديد')).toBeInTheDocument()
    expect(withdrawLoanExtension).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'تأكيد السحب' }))

    await waitFor(() => expect(withdrawLoanExtension).toHaveBeenCalledWith(5))
    expect(refresh).toHaveBeenCalled()
  })
})
