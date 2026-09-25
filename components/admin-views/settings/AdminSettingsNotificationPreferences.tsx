'use client'

import React, { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/shared/ui/switch'
import { cn } from '@/shared/lib/utils'
import { updateAdminNotificationPreferences } from '@/features/admin/server/account'

export type AdminNotificationPreferences = {
  loanRequests: boolean
  accountRequests: boolean
  loanExtensions: boolean
  overdueReturns: boolean
  newReviews: boolean
  activityLogEvents: boolean
}

type AdminSettingsNotificationPreferencesProps = {
  initialPreferences: AdminNotificationPreferences
  className?: string
}

const notificationItems: {
  id: keyof AdminNotificationPreferences
  label: string
  description: string
}[] = [
  {
    id: 'loanRequests',
    label: 'طلبات الإعارة',
    description: 'يتم إرسال طلبات الإعارة الجديدة إلى بريدك',
  },
  {
    id: 'accountRequests',
    label: 'طلبات إنشاء حساب',
    description: 'يتم إرسال طلبات إنشاء الحسابات الجديدة إلى بريدك',
  },
  {
    id: 'loanExtensions',
    label: 'طلبات تمديد الإعارة',
    description: 'يتم إرسال طلبات تمديد الإعارة إلى بريدك',
  },
  {
    id: 'overdueReturns',
    label: 'التأخرات الشديدة في الإرجاع',
    description: 'يتم إرسال تنبيهات التأخر الشديد في الإرجاع إلى بريدك',
  },
  {
    id: 'newReviews',
    label: 'التقييمات الجديدة',
    description: 'يتم إرسال التقييمات الجديدة إلى بريدك',
  },
  {
    id: 'activityLogEvents',
    label: 'الأحداث الجديدة من سجل الأحداث',
    description: 'يتم إرسال الأحداث الجديدة المسجلة إلى بريدك',
  },
]

const AdminSettingsNotificationPreferences: React.FC<AdminSettingsNotificationPreferencesProps> = ({
  initialPreferences,
  className,
}) => {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (id: keyof AdminNotificationPreferences, checked: boolean) => {
    const prev = { ...preferences }
    const next = { ...preferences, [id]: checked }

    setPreferences(next)
    startTransition(async () => {
      const result = await updateAdminNotificationPreferences(next)
      if (!result.ok) {
        setPreferences(prev)
        toast.error(result.error)
      }
    })
  }

  return (
    <div
      dir="rtl"
      className={cn(
        'flex flex-none flex-col px-4 pt-6 pb-6 gap-8 sm:px-6 lg:flex-1 lg:p-0',
        className,
      )}
    >
      <div className="flex flex-col self-stretch gap-6">
        <div className="flex flex-col items-start self-stretch">
          <span className="text-xl font-bold font-dubai text-[#243245]">خيارات الإشعارات</span>
        </div>
        <div className="self-stretch bg-background-2 rounded-xl border border-solid border-stroke-grey">
          {notificationItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'flex justify-between items-center self-stretch p-5',
                index !== notificationItems.length - 1 && 'border-b border-stroke-grey',
              )}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-base font-alyamama text-[#243245]">{item.label}</span>
                <span className="text-sm font-alyamama text-grey-500">{item.description}</span>
              </div>
              <Switch
                checked={preferences[item.id]}
                onCheckedChange={(checked) => handleToggle(item.id, checked)}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsNotificationPreferences
