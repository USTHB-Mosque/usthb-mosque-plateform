import React from 'react'
import type { Loan } from '@/payload-types'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'قيد الانتظار', className: 'bg-[#FFB020]/15 text-[#B45309]' },
  approved: { label: 'موافق عليه', className: 'bg-[#0DEAC2]/15 text-[#0AAFC2]' },
  overdue: { label: 'متأخر', className: 'bg-[#FF6B6B]/15 text-[#C0392B]' },
  returned: { label: 'مُعاد', className: 'bg-muted text-muted-foreground' },
}

function getEffectiveStatus(loan: Loan): string {
  const status = loan.status
  if (status === 'returned' || status === 'overdue' || status === 'pending') return status
  const due = loan.dueDate ? new Date(loan.dueDate).getTime() : Number.POSITIVE_INFINITY
  if (status === 'approved' && due < Date.now()) return 'overdue'
  return status ?? 'pending'
}

const LoanStatusBadgeInline: React.FC<{ loan: Loan }> = ({ loan }) => {
  const status = getEffectiveStatus(loan)
  const config = statusConfig[status] ?? statusConfig.pending
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export default LoanStatusBadgeInline