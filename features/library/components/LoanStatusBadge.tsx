'use client'

import React from 'react'
import { Badge } from '@/shared/ui/badge'
import type { Loan } from '@/payload-types'

import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'

/** The five stored states plus `overdue`, which is derived from `dueDate`. */
export type EffectiveLoanStatus =
  'pending' | 'accepted' | 'picked_up' | 'returned' | 'refused' | 'overdue'

export const statusConfig: Record<
  EffectiveLoanStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: 'قيد الانتظار',
    className: 'bg-[#FFB020]/15 text-[#B45309]',
    dotClassName: 'bg-[#B45309]',
  },
  accepted: {
    label: 'مقبول',
    className: 'bg-[#0DEAC2]/15 text-[#0AAFC2]',
    dotClassName: 'bg-[#0AAFC2]',
  },
  picked_up: {
    label: 'تم الأخذ',
    className: 'bg-[#228BE6]/15 text-[#1864AB]',
    dotClassName: 'bg-[#228BE6]',
  },
  returned: {
    label: 'تم الإرجاع',
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground/30',
  },
  refused: {
    label: 'مرفوض',
    className: 'bg-[#FF6B6B]/15 text-[#C0392B]',
    dotClassName: 'bg-[#C0392B]',
  },
  overdue: {
    label: 'متأخر',
    className: 'bg-[#FF6B6B]/15 text-[#C0392B]',
    dotClassName: 'bg-[#C0392B]',
  },
}

export function getEffectiveLoanStatus(loan: Loan): EffectiveLoanStatus {
  const status = loan.status
  if (status === 'returned' || status === 'refused' || status === 'pending') return status
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
  if (status === 'returned' || status === 'refused') return 'ok'
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
