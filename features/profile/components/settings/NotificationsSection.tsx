'use client'

import React, { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/shared/ui/switch'
import { cn } from '@/shared/lib/utils'
import { updateNotificationPreferences } from '@/features/profile/server/settings'

type NotificationsSectionProps = {
  initialPreferences: {
    loanRequests: boolean
    activityRegistrations: boolean
    loanExtensions: boolean
    loanReturnReminder: boolean
  }
  className?: string
}

const notificationItems = [
  {
    id: 'loanRequests' as const,
    label: 'طلبات الإعارة',
    description: 'يتم إرسال حالة طلبات الإعارة إلى بريدك',
  },
  {
    id: 'activityRegistrations' as const,
    label: 'طلبات التسجيل في الأنشطة',
    description: 'يتم إرسال حالة طلبات التسجيل في الأنشطة إلى بريدك',
  },
  {
    id: 'loanExtensions' as const,
    label: 'طلبات تمديد الإعارة',
    description: 'يتم إرسال حالة طلبات تمديد الإعارة إلى بريدك',
  },
  {
    id: 'loanReturnReminder' as const,
    label: 'تذكير بموعد إرجاع الكتب',
    description: 'يتم إرسال تذكير بإرجاع الإعارة إلى بريدك',
    alwaysOn: true,
  },
]

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  initialPreferences,
  className,
}) => {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (id: (typeof notificationItems)[number]['id'], checked: boolean) => {
    const prev = { ...preferences }
    const next = { ...preferences, [id]: checked }

    setPreferences(next)
    startTransition(async () => {
      const result = await updateNotificationPreferences({
        loanRequests: next.loanRequests,
        activityRegistrations: next.activityRegistrations,
        loanExtensions: next.loanExtensions,
      })
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
                checked={item.alwaysOn ? true : preferences[item.id]}
                onCheckedChange={(checked) => handleToggle(item.id, checked)}
                disabled={isPending || item.alwaysOn}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotificationsSection
