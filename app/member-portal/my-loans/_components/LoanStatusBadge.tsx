'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Loan } from '@/payload-types'

export type EffectiveLoanStatus = NonNullable<Loan['status']>

const statusConfig: Record<
  EffectiveLoanStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'قيد الانتظار',
    className: 'bg-[#FFB020]/15 text-[#B45309]',
  },
  approved: {
    label: 'موافق عليه',
    className: 'bg-[#0DEAC2]/15 text-[#0AAFC2]',
  },
  overdue: {
    label: 'متأخر',
    className: 'bg-[#FF6B6B]/15 text-[#C0392B]',
  },
  returned: {
    label: 'مُعاد',
    className: 'bg-muted text-muted-foreground',
  },
}

export function getEffectiveLoanStatus(loan: Loan): EffectiveLoanStatus {
  if (loan.status === 'returned' || loan.status === 'overdue' || loan.status === 'pending') {
    return loan.status
  }
  const due = loan.dueDate ? new Date(loan.dueDate).getTime() : Number.POSITIVE_INFINITY
  if (loan.status === 'approved' && due < Date.now()) return 'overdue'
  return loan.status ?? 'pending'
}

export function getDueUrgency(loan: Loan): 'overdue' | 'soon' | 'ok' {
  const status = getEffectiveLoanStatus(loan)
  if (status === 'overdue') return 'overdue'
  if (status === 'returned') return 'ok'
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