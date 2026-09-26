import React from 'react'
import type { Loan } from '@/payload-types'

import { getEffectiveLoanStatus, statusConfig } from '@/features/library'

/**
 * Inline status pill for the profile tables. It reuses the library feature's
 * status vocabulary (#19) so the member-facing mappings never drift apart.
 */
const LoanStatusBadgeInline: React.FC<{ loan: Loan }> = ({ loan }) => {
  const status = getEffectiveLoanStatus(loan)
  const config = statusConfig[status]
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export default LoanStatusBadgeInline
