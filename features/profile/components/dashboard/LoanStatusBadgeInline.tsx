import React from 'react'
import type { Loan } from '@/payload-types'

const statusConfig: Record<string, { label: string; className: string; dotClassName: string }> = {
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
    dotClassName: 'bg-muted-foreground/60',
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

export function getEffectiveStatus(loan: Loan): string {
  const status = loan.status
  if (status === 'returned' || status === 'refused' || status === 'pending') return status
  if (status === 'picked_up') {
    // Overdue is derived from `dueDate`, never stored (#19).
    const due = loan.dueDate ? new Date(loan.dueDate).getTime() : Number.POSITIVE_INFINITY
    return due < Date.now() ? 'overdue' : 'picked_up'
  }
  return status ?? 'pending'
}

const LoanStatusBadgeInline: React.FC<{ loan: Loan }> = ({ loan }) => {
  const status = getEffectiveStatus(loan)
  const config = statusConfig[status] ?? statusConfig.pending
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export default LoanStatusBadgeInline

export { statusConfig }
