import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type {
  AdminUserBorrowing,
  AdminUserExtension,
  AdminUserReview,
} from '@/features/admin/server/users'

const approveExtension = vi.fn()
const refuseExtension = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/admin/server/extensions', () => ({
  approveExtension: (...args: unknown[]) => approveExtension(...args),
  refuseExtension: (...args: unknown[]) => refuseExtension(...args),
}))

import UserHistory from './UserHistory'

type History = React.ComponentProps<typeof UserHistory>['history']

function history(overrides: Partial<History> = {}): History {
  return {
    borrowings: { docs: [], total: 0 },
    reviews: { docs: [], total: 0 },
    extensions: { docs: [] },
    ...overrides,
  }
}

function borrowing(overrides: Partial<AdminUserBorrowing> = {}): AdminUserBorrowing {
  return {
    id: 1,
    title: 'صحيح مسلم',
    status: 'returned',
    returned: true,
    loanDate: '2026-09-01T00:00:00.000Z',
    dueDate: '2026-09-15T00:00:00.000Z',
    returnDate: '2026-09-10T00:00:00.000Z',
    ...overrides,
  }
}

function review(overrides: Partial<AdminUserReview> = {}): AdminUserReview {
  return {
    id: 1,
    rating: 4,
    comment: 'كتاب نافع',
    targetType: 'book',
    targetTitle: 'صحيح مسلم',
    createdAt: '2026-09-02T00:00:00.000Z',
    ...overrides,
  }
}

function extension(overrides: Partial<AdminUserExtension> = {}): AdminUserExtension {
  return {
    id: 7,
    status: 'pending',
    days: 7,
    reason: 'امتحانات',
    bookTitle: 'صحيح مسلم',
    originalDueDate: '2026-09-15T00:00:00.000Z',
    newDueDate: '2026-09-22T00:00:00.000Z',
    waitingForBook: 0,
    createdAt: '2026-09-12T00:00:00.000Z',
    ...overrides,
  }
}

describe('UserHistory (#156)', () => {
  beforeEach(() => {
    approveExtension.mockReset()
    refuseExtension.mockReset()
    refresh.mockReset()
    approveExtension.mockResolvedValue({ ok: true })
    refuseExtension.mockResolvedValue({ ok: true })
  })

  it('marks returned borrowings apart from the ones still out', () => {
    render(
      <UserHistory
        history={history({
          borrowings: {
            docs: [
              borrowing(),
              borrowing({
                id: 2,
                title: 'الرحيق المختوم',
                status: 'picked_up',
                returned: false,
                returnDate: null,
              }),
            ],
            total: 2,
          },
        })}
      />,
    )

    const list = screen.getByTestId('borrowings-list')
    expect(
      within(list).getByText('مُسترجع', { selector: '[data-state="returned"]' }),
    ).toBeInTheDocument()
    expect(
      within(list).getByText('لم يُسترجع', { selector: '[data-state="not-returned"]' }),
    ).toBeInTheDocument()
    expect(within(list).getByText('الرحيق المختوم')).toBeInTheDocument()
  })

  it('says when the list is a slice of a longer history', () => {
    render(<UserHistory history={history({ borrowings: { docs: [borrowing()], total: 34 } })} />)
    expect(screen.getByText(/آخر 1 من 34/)).toBeInTheDocument()
  })

  it('lists the member reviews with their target kind and rating', () => {
    render(
      <UserHistory
        history={history({
          reviews: {
            docs: [
              review(),
              review({ id: 2, targetType: 'article', targetTitle: 'مقال', rating: 2 }),
            ],
            total: 2,
          },
        })}
      />,
    )

    const list = screen.getByTestId('reviews-list')
    expect(within(list).getByText('كتاب')).toBeInTheDocument()
    expect(within(list).getByText('مقال', { selector: '[data-kind]' })).toBeInTheDocument()
    expect(within(list).getByText('4/5')).toBeInTheDocument()
    expect(within(list).getByText('2/5')).toBeInTheDocument()
  })

  it('shows the due-check on a pending extension and lets an admin decide it', async () => {
    const user = userEvent.setup()
    render(
      <UserHistory
        history={history({
          extensions: {
            docs: [
              extension({ id: 7, waitingForBook: 3 }),
              extension({ id: 8, bookTitle: 'بلا انتظار', waitingForBook: 0 }),
            ],
          },
        })}
      />,
    )

    // The queue is the same check that auto-approves a member's own request.
    expect(screen.getByText(/3 أعضاء في قائمة الانتظار/)).toBeInTheDocument()
    expect(screen.getByText(/الإعارة متاحة/)).toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: /قبول تمديد/ })
    await user.click(buttons[0])
    await user.click(await screen.findByRole('button', { name: /تأكيد القبول/ }))

    expect(approveExtension).toHaveBeenCalledWith(7)
    expect(refresh).toHaveBeenCalled()
  })

  it('reports a refusal instead of pretending it worked', async () => {
    approveExtension.mockResolvedValue({ ok: false, error: 'تمت معالجة طلب التمديد مسبقاً' })
    const user = userEvent.setup()
    render(<UserHistory history={history({ extensions: { docs: [extension()] } })} />)

    await user.click(screen.getByRole('button', { name: /قبول تمديد/ }))
    await user.click(await screen.findByRole('button', { name: /تأكيد القبول/ }))

    expect(refresh).not.toHaveBeenCalled()
  })

  it('offers no decision on an extension that is already decided', () => {
    render(
      <UserHistory
        history={history({ extensions: { docs: [extension({ status: 'approved' })] } })}
      />,
    )

    expect(screen.queryByRole('button', { name: /قبول تمديد/ })).not.toBeInTheDocument()
    expect(screen.getByText('مقبول')).toBeInTheDocument()
  })

  it('says so when a member has no history at all', () => {
    render(<UserHistory history={history()} />)

    expect(screen.getByText('لا توجد إعارات سابقة')).toBeInTheDocument()
    expect(screen.getByText('لا توجد تقييمات')).toBeInTheDocument()
    expect(screen.getByText('لا توجد طلبات تمديد')).toBeInTheDocument()
  })
})
