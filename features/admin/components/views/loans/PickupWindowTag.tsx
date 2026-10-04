'use client'

import React from 'react'
import { Badge } from '@/shared/ui/badge'
import { statusConfig } from '@/features/library'
import type { Loan } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'

/**
 * The pickup desk's own vocabulary (#153, D1).
 *
 * On the collection tabs a bare stored status tells an admin nothing they did
 * not already learn from the tab they opened. What the desk actually needs is
 * whether the member has been to collect, and how long is left to come — so
 * `accepted` and `picked_up` rows are tagged in those terms instead.
 *
 * The *words* are the desk's, but the *colours* are not: `pending` and
 * `picked_up` are the same two steps every other loan surface paints, so they
 * come from the library's `statusConfig` rather than a second copy of the hex
 * (#65). Only the labels below are local.
 *
 * Nothing here compares the deadline to "now": both reads that feed this table
 * drain the Pickup Window queue first, so a window that has already lapsed has
 * already been refused and is no longer sitting on this tab at all. What is
 * left is the deadline itself, which is data and renders identically on the
 * server and in the browser.
 *
 * Rendered only on those two tabs; the other tabs keep `LoanStatusBadge`.
 */
const PickupWindowTag: React.FC<{ loan: Loan }> = ({ loan }) => {
  if (loan.status === 'picked_up') {
    return (
      <Badge className={`rounded-lg ${statusConfig.picked_up.className}`}>تم تسجيل الاستلام</Badge>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge className={`w-fit rounded-lg ${statusConfig.pending.className}`}>
        لم يُسجَّل الاستلام
      </Badge>
      {loan.pickupWindowExpiresAt ? (
        <span className="text-xs text-muted-foreground">
          نافذة الاستلام حتى{' '}
          {format(new Date(loan.pickupWindowExpiresAt), 'd MMM yyyy — HH:mm', { locale: arDZ })}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">نافذة الاستلام غير محددة</span>
      )}
    </div>
  )
}

export default PickupWindowTag
