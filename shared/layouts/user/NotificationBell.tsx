'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type NotificationBellProps = {
  unreadCount?: number
  sidebar?: boolean
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount = 0,
  sidebar = false,
}) => {
  if (sidebar) {
    return (
      <button
        type="button"
        aria-label="الإشعارات"
        className="flex h-[38px] w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium justify-start text-grey-500 transition-colors hover:bg-black/5 hover:text-[#243245] "
      >
        <Bell className="size-[18px] shrink-0" />
        <span className="min-w-0 truncate">الإشعارات</span>
        {unreadCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-300/15 px-1.5 text-[10px] font-bold text-primary-300">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <Button type="button" size="icon" variant="outline" aria-label="الإشعارات" className="relative">
      <Bell className="size-5" />
      {unreadCount > 0 ? (
        <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Button>
  )
}

export default NotificationBell
