'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type NotificationBellProps = {
  unreadCount?: number
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount = 0 }) => {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label="الإشعارات"
      className="relative"
    >
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
