'use client'

import React from 'react'
import {
  LogIn,
  KeyRound,
  UserCheck,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { User } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'

type ActivityLogProps = {
  user: User
  onBack: () => void
}

const actionConfig: Record<string, { label: string; icon: React.ElementType }> = {
  login: { label: 'تسجيل دخول', icon: LogIn },
  password_changed: { label: 'تغيير كلمة المرور', icon: KeyRound },
  profile_updated: { label: 'تحديث الملف الشخصي', icon: UserCheck },
  account_verified: { label: 'تأكيد الحساب', icon: ShieldCheck },
  account_created: { label: 'إنشاء الحساب', icon: UserPlus },
}

const ActivityLog: React.FC<ActivityLogProps> = ({ user, onBack }) => {
  const entries = (user.activityLog ?? []) as Array<{
    action: string
    timestamp: string
    metadata?: string
  }>

  return (
    <div className="flex flex-col self-stretch gap-6">
      <div className="self-stretch bg-background-2 rounded-xl border border-solid border-stroke-grey">
        {entries.length === 0 && (
          <div className="p-8 text-center text-grey-500 font-alyamama">
            لا توجد أحداث مسجلة بعد.
          </div>
        )}
        {entries.map((entry, index) => {
          const config = actionConfig[entry.action] ?? { label: entry.action, icon: LogIn }
          const Icon = config.icon
          const date = new Date(entry.timestamp)
          const formattedDate = format(date, 'dd/MM/yyyy - hh:mm a', { locale: arDZ })

          return (
            <div
              key={`${entry.action}-${entry.timestamp}`}
              className={`flex justify-between items-center self-stretch p-5 ${
                index !== entries.length - 1 ? 'border-b border-stroke-grey' : ''
              }`}
            >
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-main-15">
                  <Icon className="h-5 w-5 text-primary-300" />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-base font-alyamama text-[#243245]">{config.label}</span>
                  {entry.metadata && (
                    <span className="text-sm font-alyamama text-grey-500">{entry.metadata}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-alyamama text-grey-500 shrink-0">{formattedDate}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ActivityLog
