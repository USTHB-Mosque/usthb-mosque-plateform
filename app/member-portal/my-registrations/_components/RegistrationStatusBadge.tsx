'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Activity, ActivityRegistration } from '@/payload-types'

export type EffectiveRegistrationStatus = 'registered' | 'attended' | 'passed'

const statusConfig: Record<
  EffectiveRegistrationStatus,
  { label: string; className: string }
> = {
  registered: {
    label: 'مسجّل',
    className: 'bg-[#0DEAC2]/15 text-[#0AAFC2]',
  },
  attended: {
    label: 'تم الحضور',
    className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  },
  passed: {
    label: 'مكتمل',
    className: 'bg-muted text-muted-foreground',
  },
}

export function getEffectiveRegistrationStatus(
  registration: ActivityRegistration,
): EffectiveRegistrationStatus {
  if (registration.attended) return 'attended'

  const activity = registration.activity as Activity | undefined
  const start = activity?.startDate ? new Date(activity.startDate).getTime() : Number.POSITIVE_INFINITY
  if (start < Date.now()) return 'passed'

  return 'registered'
}

export function isPastRegistration(registration: ActivityRegistration): boolean {
  const status = getEffectiveRegistrationStatus(registration)
  return status === 'attended' || status === 'passed'
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
