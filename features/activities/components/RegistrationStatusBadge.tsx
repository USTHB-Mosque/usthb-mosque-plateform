'use client'

import React from 'react'
import { Badge } from '@/shared/ui/badge'
import type { Activity, ActivityRegistration } from '@/payload-types'
import { activityEndTime } from '@/utils/constants/activities'

export type EffectiveRegistrationStatus =
  'pending' | 'registered' | 'refused' | 'quota_rejected' | 'cancelled' | 'attended' | 'passed'

export const statusConfig: Record<
  EffectiveRegistrationStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: 'قيد المراجعة',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dotClassName: 'bg-amber-500',
  },
  registered: {
    label: 'مسجّل',
    className: 'bg-[#0DEAC2]/15 text-[#0AAFC2] dark:text-[#4dedff]',
    dotClassName: 'bg-[#0AAFC2]',
  },
  refused: {
    label: 'مرفوض',
    className: 'bg-red-500/15 text-red-700 dark:text-red-200',
    dotClassName: 'bg-red-500',
  },
  quota_rejected: {
    label: 'اكتمل العدد',
    className: 'bg-red-500/15 text-red-700 dark:text-red-200',
    dotClassName: 'bg-red-500',
  },
  cancelled: {
    label: 'ملغى',
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  attended: {
    label: 'تم الحضور',
    className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
    dotClassName: 'bg-emerald-500',
  },
  passed: {
    label: 'مكتمل',
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground/30',
  },
}

export function getEffectiveRegistrationStatus(
  registration: ActivityRegistration,
): EffectiveRegistrationStatus {
  if (
    registration.status === 'refused' ||
    registration.status === 'quota_rejected' ||
    registration.status === 'cancelled'
  )
    return registration.status
  if (registration.status === 'pending') return 'pending'
  if (registration.attended) return 'attended'

  const activity = registration.activity as Activity | undefined
  const end = activity?.startDate ? activityEndTime(activity) : Number.POSITIVE_INFINITY
  if (registration.status === 'completed' || end < Date.now()) return 'passed'

  return 'registered'
}

export function isPastRegistration(registration: ActivityRegistration): boolean {
  const status = getEffectiveRegistrationStatus(registration)
  return status === 'attended' || status === 'passed' || status === 'cancelled'
}

type RegistrationStatusBadgeProps = {
  registration: ActivityRegistration
}

const RegistrationStatusBadge: React.FC<RegistrationStatusBadgeProps> = ({ registration }) => {
  const status = getEffectiveRegistrationStatus(registration)
  const config = statusConfig[status]
  return <Badge className={`${config.className} rounded-lg`}>{config.label}</Badge>
}

export default RegistrationStatusBadge
