import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { LibraryCard } from '@/payload-types'

const setCardStatus = vi.fn()
const refresh = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))
vi.mock('@/features/admin/server/cards', () => ({
  setCardStatus: (...args: unknown[]) => setCardStatus(...args),
}))
vi.mock('@/features/admin/api/cards.queries', () => ({
  adminCardsKeys: { root: ['admin', 'cards'] },
}))

import { adminCardsKeys } from '@/features/admin/api/cards.queries'
import CardsTable from './CardsTable'

beforeEach(() => {
  vi.clearAllMocks()
})

function card(overrides: Record<string, unknown> = {}): LibraryCard {
  return {
    id: 5,
    cardId: 'M-00007',
    status: 'active',
    issueDate: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    user: {
      id: 7,
      fullName: 'أحمد بن علي',
      email: 'ahmed@example.com',
      situation: 'student',
    },
    ...overrides,
  } as unknown as LibraryCard
}

let invalidateQueries: ReturnType<typeof vi.fn>

function renderTable(cards: LibraryCard[]) {
  const client = new QueryClient()
  invalidateQueries = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
  return render(
    <QueryClientProvider client={client}>
      <CardsTable cards={cards} />
    </QueryClientProvider>,
  )
}

describe('CardsTable', () => {
  it('names the holder, the card id and the status', () => {
    renderTable([card()])

    expect(screen.getByText('M-00007')).toBeInTheDocument()
    expect(screen.getByText('أحمد بن علي')).toBeInTheDocument()
    expect(screen.getByText('طالب')).toBeInTheDocument()
    expect(screen.getByText('فعالة')).toBeInTheDocument()
  })

  it('shows a dash when a card has no holder photo', () => {
    renderTable([card()])

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it.each([
    ['inactive', 'غير فعالة'],
    ['archived', 'مأرشفة'],
  ])('renders the %s state as %s', (status, label) => {
    renderTable([card({ status })])

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('withdraws an active card from the row menu and refreshes the list', async () => {
    setCardStatus.mockResolvedValue({ ok: true })
    renderTable([card()])

    await userEvent.click(screen.getByRole('button', { name: /إجراءات/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /سحب البطاقة/ }))

    await waitFor(() => expect(setCardStatus).toHaveBeenCalledWith(5, 'inactive'))
    expect(toastSuccess).toHaveBeenCalledWith('تم سحب البطاقة')
    expect(refresh).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminCardsKeys.root })
  })

  it('archives a card from the row menu', async () => {
    setCardStatus.mockResolvedValue({ ok: true })
    renderTable([card()])

    await userEvent.click(screen.getByRole('button', { name: /إجراءات/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /أرشفة البطاقة/ }))

    await waitFor(() => expect(setCardStatus).toHaveBeenCalledWith(5, 'archived'))
  })

  it('offers only reinstatement for an archived card', async () => {
    setCardStatus.mockResolvedValue({ ok: true })
    renderTable([card({ status: 'archived' })])

    await userEvent.click(screen.getByRole('button', { name: /إجراءات/ }))
    const menu = await screen.findByRole('menu')

    expect(within(menu).getByRole('menuitem', { name: /إعادة البطاقة للخدمة/ })).toBeTruthy()
    expect(within(menu).queryByRole('menuitem', { name: /أرشفة البطاقة/ })).toBeNull()
  })

  it('surfaces the server error when a transition is refused', async () => {
    setCardStatus.mockResolvedValue({ ok: false, error: 'البطاقة في هذه الحالة بالفعل' })
    renderTable([card()])

    await userEvent.click(screen.getByRole('button', { name: /إجراءات/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /سحب البطاقة/ }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('البطاقة في هذه الحالة بالفعل'))
    expect(refresh).not.toHaveBeenCalled()
  })
})
