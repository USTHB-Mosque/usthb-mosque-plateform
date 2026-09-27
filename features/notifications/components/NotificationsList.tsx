'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import {
  BadgeCheck,
  Bell,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Hourglass,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type {
  NotificationListItem,
  NotificationsPage,
} from '@/features/notifications/server/get-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/server/mark-notifications-read'
import { notifyBellRefresh } from '@/features/notifications/lib/bell-refresh'
import {
  formatAbsoluteArabicTime,
  formatRelativeArabicTime,
  groupNotificationsByDay,
} from '@/features/notifications/lib/notifications-format'
import {
  NOTIFICATION_TYPES,
  NOTIFICATIONS_PAGE,
  type NotificationType,
} from '@/utils/notifications'

type NotificationsListProps = {
  data: NotificationsPage
  seen: 'all' | 'unread'
  type?: NotificationType
}

/** An icon per notification type — scannability without reading the chip. */
const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  loan: BookOpen,
  waitlist: Hourglass,
  extension: CalendarClock,
  verification: BadgeCheck,
  request: BookMarked,
  activity: CalendarCheck,
  article: Newspaper,
  system: Bell,
}

/**
 * The /user/notifications inbox (#17): all/unread + type filters via URL
 * search params, day grouping with Arabic relative timestamps, mark as read
 * on click (nudging the navbar bell), and mark-all-as-read.
 */
const NotificationsList: React.FC<NotificationsListProps> = ({ data, seen, type }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  // One stamp per mount: SSR and the hydrating client each render a stable,
  // self-consistent list (suppressing the sub-minute الـآن boundary drift).
  const now = React.useMemo(() => new Date(), [])

  const buildHref = (overrides: { seen?: string; type?: string; page?: number }) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === '' || (key === 'page' && value === 1)) next.delete(key)
      else next.set(key, String(value))
    }
    const query = next.toString()
    return query ? `${NOTIFICATIONS_PAGE}?${query}` : NOTIFICATIONS_PAGE
  }

  const markRead = (id: number, seen: boolean, link: string | null) => {
    // Already-read rows only navigate — no redundant write.
    if (seen) {
      router.push(link ?? NOTIFICATIONS_PAGE)
      return
    }
    startTransition(async () => {
      const result = await markNotificationRead(id)
      if (result.ok) {
        notifyBellRefresh()
        router.push(link ?? NOTIFICATIONS_PAGE)
      } else router.refresh()
    })
  }

  const markAll = () => {
    startTransition(async () => {
      const result = await markAllNotificationsRead()
      if (result.ok) {
        notifyBellRefresh()
        router.refresh()
      }
    })
  }

  const groups = groupNotificationsByDay(data.notifications, now)

  return (
    <div dir="rtl" className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={seen === 'all' ? 'default' : 'outline'}
            size="sm"
            nativeButton={false}
            render={<Link href={buildHref({ seen: undefined, page: 1 })} />}
          >
            الكل
          </Button>
          <Button
            variant={seen === 'unread' ? 'default' : 'outline'}
            size="sm"
            nativeButton={false}
            render={<Link href={buildHref({ seen: 'unread', page: 1 })} />}
          >
            غير المقروء{data.unreadCount > 0 ? ` (${data.unreadCount})` : ''}
          </Button>
        </div>

        {data.unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={markAll} disabled={isPending}>
            <CheckCheck className="size-4" />
            تحديد الكل كمقروء
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="تصفية حسب النوع">
        <Button
          variant={type === undefined ? 'default' : 'outline'}
          size="sm"
          nativeButton={false}
          render={<Link href={buildHref({ type: undefined, page: 1 })} />}
        >
          كل الأنواع
        </Button>
        {NOTIFICATION_TYPES.map((option) => (
          <Button
            key={option.value}
            variant={type === option.value ? 'default' : 'outline'}
            size="sm"
            nativeButton={false}
            render={<Link href={buildHref({ type: option.value, page: 1 })} />}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {data.notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-grey-400">{group.label}</h3>
            <div className="self-stretch overflow-hidden rounded-xl border border-stroke-grey">
              {group.items.map((item, index) => {
                const Icon = TYPE_ICONS[item.type] ?? Bell
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markRead(item.id, item.seen, item.link)}
                    className={cn(
                      'flex w-full flex-col items-start gap-1 px-5 py-4 text-start transition-colors hover:bg-black/5',
                      index !== group.items.length - 1 && 'border-b border-stroke-grey',
                      !item.seen && 'bg-primary-main-20/20',
                    )}
                  >
                    <span className="flex w-full flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Icon
                          aria-label={`إشعار ${typeLabel(item.type)}`}
                          className="size-4 shrink-0 text-primary-300"
                          aria-hidden={false}
                        />
                        <span className="text-base font-bold font-dubai text-[#243245]">
                          {item.title}
                        </span>
                        {!item.seen ? (
                          <span className="h-2 w-2 rounded-full bg-primary-300" aria-hidden />
                        ) : null}
                      </span>
                      <span
                        className="text-[11px] text-grey-400"
                        title={formatAbsoluteArabicTime(item.createdAt)}
                        suppressHydrationWarning
                      >
                        {formatRelativeArabicTime(item.createdAt, now)}
                      </span>
                    </span>
                    <span className="text-sm text-grey-500">{item.message}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-grey-500">
                      {typeLabel(item.type)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {data.page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildHref({ page: data.page - 1 })} />}
            >
              السابق
            </Button>
          ) : null}
          <span className="text-sm text-grey-500">
            {data.page} / {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildHref({ page: data.page + 1 })} />}
            >
              التالي
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function typeLabel(type: NotificationListItem['type']): string {
  return NOTIFICATION_TYPES.find((option) => option.value === type)?.label ?? type
}

export default NotificationsList
