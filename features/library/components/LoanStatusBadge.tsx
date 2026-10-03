'use client'

import React from 'react'
import { Badge } from '@/shared/ui/badge'
import type { Loan } from '@/payload-types'

import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'

/** The six stored states plus `overdue`, which is derived from `dueDate`. */
export type EffectiveLoanStatus =
  'pending' | 'accepted' | 'picked_up' | 'returned' | 'refused' | 'cancelled' | 'overdue'

export const statusConfig: Record<
  EffectiveLoanStatus,
  { label: string; className: string; dotClassName: string; tintClassName: string }
> = {
  pending: {
    label: 'قيد الانتظار',
    className: 'bg-[#FFB020]/15 text-[#B45309] dark:text-[#ffcaa2]',
    dotClassName: 'bg-[#B45309] dark:bg-[#ffcaa2]',
    tintClassName: 'bg-[#FFB020]/15',
  },
  accepted: {
    label: 'مقبول',
    className: 'bg-[#0DEAC2]/15 text-[#0AAFC2] dark:text-[#4dedff]',
    dotClassName: 'bg-[#0AAFC2]',
    tintClassName: 'bg-[#0DEAC2]/15',
  },
  picked_up: {
    label: 'تم الأخذ',
    className: 'bg-[#228BE6]/15 text-[#1864AB] dark:text-[#9bceff]',
    dotClassName: 'bg-[#228BE6]',
    tintClassName: 'bg-[#228BE6]/15',
  },
  returned: {
    label: 'تم الإرجاع',
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground/30',
    tintClassName: 'bg-muted',
  },
  refused: {
    label: 'مرفوض',
    className: 'bg-[#FF6B6B]/15 text-[#C0392B] dark:text-[#ffb9b2]',
    dotClassName: 'bg-[#C0392B] dark:bg-[#ffb9b2]',
    tintClassName: 'bg-[#FF6B6B]/15',
  },
  // #153, D6: the member's own withdrawal, so it reads as closed rather than
  // as the administration's red refusal — a cancellation is not a rebuke.
  cancelled: {
    label: 'ملغى',
    className: 'bg-[#7048E8]/15 text-[#6741D9] dark:text-[#c9b7ff]',
    dotClassName: 'bg-[#6741D9] dark:bg-[#c9b7ff]',
    tintClassName: 'bg-[#7048E8]/15',
  },
  overdue: {
    label: 'متأخر',
    className: 'bg-[#FF6B6B]/15 text-[#C0392B] dark:text-[#ffb9b2]',
    dotClassName: 'bg-[#C0392B] dark:bg-[#ffb9b2]',
    tintClassName: 'bg-[#FF6B6B]/15',
  },
}

export function getEffectiveLoanStatus(loan: Loan): EffectiveLoanStatus {
  const status = loan.status
  if (
    status === 'returned' ||
    status === 'refused' ||
    status === 'cancelled' ||
    status === 'pending'
  ) {
    return status
  }
  if (status === 'picked_up') {
    // Overdue is derived from `dueDate`, never stored (#19).
    const due = loan.dueDate ? new Date(loan.dueDate).getTime() : Number.POSITIVE_INFINITY
    return due < Date.now() ? 'overdue' : 'picked_up'
  }
  return status ?? 'pending'
}

export function isLoanActive(loan: Loan): boolean {
  return ACTIVE_LOAN_STATUSES.includes(loan.status as never)
}

export function getDueUrgency(loan: Loan): 'overdue' | 'soon' | 'ok' {
  const status = getEffectiveLoanStatus(loan)
  if (status === 'overdue') return 'overdue'
  // A cancelled loan owes nothing back, so its (stale) due date must not
  // colour the row as urgent.
  if (status === 'returned' || status === 'refused' || status === 'cancelled') return 'ok'
  const due = loan.dueDate ? new Date(loan.dueDate).getTime() : Number.POSITIVE_INFINITY
  if (due - Date.now() <= 3 * 24 * 60 * 60 * 1000) return 'soon'
  return 'ok'
}

type LoanStatusBadgeProps = {
  loan: Loan
}

const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({ loan }) => {
  const status = getEffectiveLoanStatus(loan)
  const config = statusConfig[status]
  return <Badge className={`${config.className} rounded-lg`}>{config.label}</Badge>
}

export default LoanStatusBadge
