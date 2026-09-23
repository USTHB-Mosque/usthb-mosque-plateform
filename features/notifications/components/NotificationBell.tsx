'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { getBellState, type BellState } from '@/features/notifications/server/get-notifications'
import { markNotificationRead } from '@/features/notifications/server/mark-notifications-read'

type NotificationBellProps = {
  /** Mobile-menu variant: a plain nav-like item linking to the notifications page. */
  sidebar?: boolean
  className?: string
}

const NOTIFICATIONS_PAGE = '/user/notifications'

const dateTimeFormatter = new Intl.DateTimeFormat('ar', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The notification bell (#17). Fetched client-side so it renders nothing for
 * visitors; subscribed to the SSE stream for a live unread badge. The design
 * is not in Figma — deliberately built in the existing navbar style and to be
 * flagged to the designer.
 */
const NotificationBell: React.FC<NotificationBellProps> = ({ sidebar = false, className }) => {
  const router = useRouter()
  const [state, setState] = React.useState<BellState | null>(null)
  const [refetchKey, setRefetchKey] = React.useState(0)

  const refresh = React.useCallback(() => setRefetchKey((key) => key + 1), [])

  React.useEffect(() => {
    let cancelled = false
    getBellState().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [refetchKey])

  React.useEffect(() => {
    // The stream pushes the unread count every 30s (or on change); refetching
    // the full state keeps the dropdown in sync with server data.
    const source = new EventSource('/api/notifications/stream')
    source.addEventListener('unread', refresh)
    return () => {
      source.close()
    }
  }, [refresh])

  const markRead = React.useCallback(
    async (id: number, link: string | null) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: Math.max(0, prev.unreadCount - 1),
              notifications: prev.notifications.map((item) =>
                item.id === id ? { ...item, seen: true } : item,
              ),
            }
          : prev,
      )
      const result = await markNotificationRead(id)
      if (!result.ok) {
        refresh()
        return
      }
      router.push(link ?? NOTIFICATIONS_PAGE)
    },
    [refresh, router],
  )

  if (!state) return null

  const unreadBadge =
    state.unreadCount > 0 ? (
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-300/15 px-1.5 text-[10px] font-bold text-primary-300">
        {state.unreadCount > 99 ? '99+' : state.unreadCount}
      </span>
    ) : null

  if (sidebar) {
    return (
      <button
        type="button"
        aria-label="الإشعارات"
        onClick={() => router.push(NOTIFICATIONS_PAGE)}
        className={cn(
          'flex h-[38px] w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium justify-start text-grey-500 transition-colors hover:bg-black/5 hover:text-[#243245]',
          className,
        )}
      >
        <Bell className="size-[18px] shrink-0" />
        <span className="min-w-0 truncate">الإشعارات</span>
        {unreadBadge}
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="الإشعارات"
            className={cn('relative', className)}
          />
        }
      >
        <Bell className="size-5" />
        {state.unreadCount > 0 ? (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>الإشعارات</span>
          {unreadBadge}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {state.notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-grey-500">لا توجد إشعارات</p>
        ) : (
          state.notifications.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => void markRead(item.id, item.link)}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2.5 whitespace-normal',
                !item.seen && 'bg-primary-main-20/40',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate text-sm font-bold font-dubai text-[#243245]">
                  {item.title}
                </span>
                <span className="shrink-0 text-[10px] text-grey-400">
                  {dateTimeFormatter.format(new Date(item.createdAt))}
                </span>
              </span>
              <span className="line-clamp-2 text-xs text-grey-500">{item.message}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(NOTIFICATIONS_PAGE)}
          className="cursor-pointer justify-center gap-1 text-primary-300"
        >
          <span>عرض كل الإشعارات</span>
          <ChevronLeft className="size-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
