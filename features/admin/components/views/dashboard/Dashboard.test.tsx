import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Loan, Review } from '@/payload-types'

const markLoanPickedUp = vi.fn()
const sendLoanReminder = vi.fn()
const rejectLoan = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/admin/server/loans', () => ({
  markLoanPickedUp: (...args: unknown[]) => markLoanPickedUp(...args),
  sendLoanReminder: (...args: unknown[]) => sendLoanReminder(...args),
  rejectLoan: (...args: unknown[]) => rejectLoan(...args),
}))

vi.mock('@/features/library', () => ({
  LoanDetailsDialog: ({ open, loan }: { open: boolean; loan: Loan }) =>
    open ? (
      <div data-testid="loan-details">
        <span>{(loan.book as { title?: string }).title}</span>
      </div>
    ) : null,
}))

vi.mock('@/features/profile/components/dashboard/CalendarWidget', () => ({
  default: () => <div data-testid="calendar" />,
}))

vi.mock('./calendar-events', () => ({ buildCalendarEvents: () => [] }))

import AdminDashboard from './Dashboard'

function pickup(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    status: 'accepted',
    book: { title: 'دليل المساجد', location: 'رف ٣ - طابق ٢' },
    user: { fullName: 'أحمد بن علي', email: 'ahmed@example.com' },
    pickupCode: 'PK-4242',
    pickupDate: '2026-10-01T09:00:00.000Z',
    pickupHour: '09:00',
    ...overrides,
  } as unknown as Loan
}

function renderDashboard(props: Partial<React.ComponentProps<typeof AdminDashboard>> = {}) {
  return render(
    <AdminDashboard
      stats={{
        pendingLoans: 0,
        pendingExtensions: 0,
        severeOverdue: 0,
        pendingVerifications: 0,
      }}
      upcomingReturns={[]}
      upcomingPickups={[pickup()]}
      latestReviews={[] as Review[]}
      recentActivityLogs={[]}
      {...props}
    />,
  )
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /إجراءات استلام/ }))
  await screen.findByRole('menuitem', { name: /تأكيد الاستلام/ })
}

describe('AdminDashboard pickup row actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markLoanPickedUp.mockResolvedValue({ ok: true })
    sendLoanReminder.mockResolvedValue({ ok: true })
    rejectLoan.mockResolvedValue({ ok: true })
  })

  // Regression: the shared dropdown is Base UI's Menu, whose items fire
  // onClick. Wiring onSelect left all three actions dead.
  it('opens the details dialog from the dropdown', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    await user.click(screen.getByRole('menuitem', { name: /تفاصيل الإعارة/ }))

    const dialog = await screen.findByTestId('loan-details')
    expect(within(dialog).getByText('دليل المساجد')).toBeInTheDocument()
  })

  it('asks for confirmation before recording a pickup', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    await user.click(screen.getByRole('menuitem', { name: /تأكيد الاستلام/ }))

    // The dialog is the gate; the action must not have fired yet.
    expect(markLoanPickedUp).not.toHaveBeenCalled()
    expect(await screen.findByText('تسجيل أخذ الكتاب')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /تسجيل الأخذ/ }))

    await waitFor(() => expect(markLoanPickedUp).toHaveBeenCalledWith(1))
    expect(refresh).toHaveBeenCalled()
  })

  it('sends a pickup reminder straight from the dropdown', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    await user.click(screen.getByRole('menuitem', { name: /تذكير بالمستلام/ }))

    await waitFor(() => expect(sendLoanReminder).toHaveBeenCalledWith(1))
    expect(markLoanPickedUp).not.toHaveBeenCalled()
  })

  it('opens the details dialog when the row itself is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(screen.getByText('أحمد بن علي'))

    expect(await screen.findByTestId('loan-details')).toBeInTheDocument()
  })

  it('does not open the details dialog when the row checkbox is used', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(screen.getByRole('checkbox', { name: /تحديد استلام/ }))

    expect(screen.queryByTestId('loan-details')).not.toBeInTheDocument()
    // Selection is what actually happened.
    expect(await screen.findByRole('group', { name: /إجراءات التحديد/ })).toBeInTheDocument()
  })

  it('selects every row from the header checkbox and bulk-records the pickup', async () => {
    const user = userEvent.setup()
    renderDashboard({ upcomingPickups: [pickup(), pickup({ id: 2, pickupCode: 'PK-4343' })] })

    await user.click(screen.getByRole('checkbox', { name: 'تحديد الكل' }))

    const bar = await screen.findByRole('group', { name: /إجراءات التحديد/ })
    expect(bar).toHaveTextContent('2')

    await user.click(screen.getByRole('button', { name: /تأكيد الاستلام/ }))

    expect(await screen.findByText('تسجيل أخذ الكتاب')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /تسجيل الأخذ/ }))

    await waitFor(() => {
      expect(markLoanPickedUp).toHaveBeenCalledTimes(2)
      expect(markLoanPickedUp).toHaveBeenCalledWith(1)
      expect(markLoanPickedUp).toHaveBeenCalledWith(2)
    })
  })

  it('shows the book location in the location column, not the pickup code', () => {
    renderDashboard()
    expect(screen.getByRole('columnheader', { name: 'موقع الكتاب' })).toBeInTheDocument()
    expect(screen.getByText('رف ٣ - طابق ٢')).toBeInTheDocument()
    // The pickup code is member-facing (it goes in the reminder email), not an
    // admin shelf reference, so it stays out of this table.
    expect(screen.queryByText('PK-4242')).not.toBeInTheDocument()
  })

  it('falls back to a dash when the book has no location', () => {
    renderDashboard({ upcomingPickups: [pickup({ book: { title: 'دليل المساجد' } as never })] })
    const row = screen.getByText('دليل المساجد').closest('tr') as HTMLElement
    expect(row.textContent).toContain('—')
  })

  it('cancels a loan from the dropdown and passes the admin reason through', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    await user.click(screen.getByRole('menuitem', { name: /إلغاء الإعارة/ }))

    expect(await screen.findByText('إلغاء الإعارة')).toBeInTheDocument()
    // Destructive: nothing happens until the dialog is confirmed.
    expect(rejectLoan).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox'), 'لم يعد إلى المكتبة')
    await user.click(screen.getByRole('button', { name: /تأكيد الإلغاء/ }))

    await waitFor(() => expect(rejectLoan).toHaveBeenCalledWith(1, 'لم يعد إلى المكتبة'))
    expect(refresh).toHaveBeenCalled()
  })

  it('cancels without a reason when the admin leaves the field blank', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    await user.click(screen.getByRole('menuitem', { name: /إلغاء الإعارة/ }))
    await user.click(await screen.findByRole('button', { name: /تأكيد الإلغاء/ }))

    await waitFor(() => expect(rejectLoan).toHaveBeenCalledWith(1, undefined))
  })

  // The pickups menu deliberately mirrors the users table menu, so every row
  // menu in the admin panel reads the same. jsdom performs no layout, so this
  // asserts the classes that produce it rather than a measured width.
  it('matches the shared admin row-menu styling', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await openMenu(user)

    const popup = screen.getByRole('menu')
    expect(popup).toHaveClass('min-w-44')

    // Grouped, labelled, with a separator isolating the destructive action —
    // the same shape as UsersTable's menu.
    expect(within(popup).getByText('الاستلام')).toBeInTheDocument()
    expect(popup.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(1)

    const cancelItem = screen.getByRole('menuitem', { name: /إلغاء الإعارة/ })
    expect(cancelItem).toHaveAttribute('data-variant', 'destructive')
  })
})

describe('AdminDashboard activity log', () => {
  it('renders an icon per action and a formatted timestamp', () => {
    renderDashboard({
      upcomingPickups: [],
      recentActivityLogs: [
        {
          action: 'account_verified',
          timestamp: '2026-09-20T14:30:00.000Z',
          userName: 'سارة',
          userEmail: 'sara@example.com',
        },
        {
          action: 'something_new',
          timestamp: '2026-09-20T15:00:00.000Z',
          userName: 'كريم',
          userEmail: 'kareem@example.com',
        },
      ],
    })

    expect(screen.getByText('تفعيل الحساب')).toBeInTheDocument()
    // Unknown actions fall back rather than rendering a blank row.
    expect(screen.getByText('حدث')).toBeInTheDocument()
    expect(screen.getByText('سارة')).toBeInTheDocument()
    expect(screen.getByText('كريم')).toBeInTheDocument()
  })

  it('surfaces the metadata alongside the action label', () => {
    renderDashboard({
      upcomingPickups: [],
      recentActivityLogs: [
        {
          action: 'login',
          timestamp: '2026-09-20T14:30:00.000Z',
          metadata: 'عنوان الشبكة',
          userName: 'سارة',
          userEmail: 'sara@example.com',
        },
      ],
    })

    expect(screen.getByText(/تسجيل دخول — عنوان الشبكة/)).toBeInTheDocument()
  })

  // #156: the PRD describes a "+145% more than last month" delta on the KPI
  // cards. Nothing in this codebase ever measured it, so nothing may render a
  // signed percentage — a card that claims a trend nobody computed is worse than
  // a card that only counts.
  it('shows no unmeasured trend percentage on any card', () => {
    const { container } = renderDashboard({ upcomingPickups: [], recentActivityLogs: [] })

    expect(container.textContent ?? '').not.toMatch(/[+\u2212-]\s*\d+(\.\d+)?\s*%/)
    expect(container.textContent ?? '').not.toMatch(/145\s*%/)
  })
})
