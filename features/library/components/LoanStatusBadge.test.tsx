import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { Loan } from '@/payload-types'
import LoanStatusBadge, {
  getDueUrgency,
  getEffectiveLoanStatus,
  statusConfig,
} from './LoanStatusBadge'

function loanWith(fields: Partial<Loan>): Loan {
  return {
    id: 1,
    book: 1,
    user: 1,
    status: 'pending',
    loanDate: new Date().toISOString(),
    ...fields,
  } as Loan
}

describe('getEffectiveLoanStatus', () => {
  it('passes stored states through', () => {
    expect(getEffectiveLoanStatus(loanWith({ status: 'pending' }))).toBe('pending')
    expect(getEffectiveLoanStatus(loanWith({ status: 'accepted' }))).toBe('accepted')
    expect(getEffectiveLoanStatus(loanWith({ status: 'returned' }))).toBe('returned')
    expect(getEffectiveLoanStatus(loanWith({ status: 'refused' }))).toBe('refused')
  })

  it('derives overdue from a past due date, never stores it', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    expect(getEffectiveLoanStatus(loanWith({ status: 'picked_up', dueDate: past }))).toBe('overdue')
    expect(getEffectiveLoanStatus(loanWith({ status: 'picked_up', dueDate: future }))).toBe(
      'picked_up',
    )
    // A picked-up loan with no due date is not yet overdue.
    expect(getEffectiveLoanStatus(loanWith({ status: 'picked_up', dueDate: null }))).toBe(
      'picked_up',
    )
  })

  it('treats a missing status as pending', () => {
    expect(getEffectiveLoanStatus(loanWith({ status: null }))).toBe('pending')
  })
})

describe('getDueUrgency', () => {
  it('flags overdue loans', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(getDueUrgency(loanWith({ status: 'picked_up', dueDate: past }))).toBe('overdue')
  })

  it('flags loans due within three days as soon', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDueUrgency(loanWith({ status: 'picked_up', dueDate: soon }))).toBe('soon')
  })

  it('reports settled and comfortable loans as ok', () => {
    const comfortable = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDueUrgency(loanWith({ status: 'picked_up', dueDate: comfortable }))).toBe('ok')
    expect(getDueUrgency(loanWith({ status: 'returned' }))).toBe('ok')
    expect(getDueUrgency(loanWith({ status: 'refused' }))).toBe('ok')
  })
})

describe('LoanStatusBadge', () => {
  it.each(['pending', 'accepted', 'picked_up', 'returned', 'refused'] as const)(
    'renders the Arabic label for %s',
    (status) => {
      render(<LoanStatusBadge loan={loanWith({ status })} />)
      expect(screen.getByText(statusConfig[status].label)).toBeInTheDocument()
    },
  )

  it('renders the derived overdue label', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    render(<LoanStatusBadge loan={loanWith({ status: 'picked_up', dueDate: past })} />)
    expect(screen.getByText(statusConfig.overdue.label)).toBeInTheDocument()
  })
})
