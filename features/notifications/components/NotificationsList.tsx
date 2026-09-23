'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { NotificationsPage } from '@/features/notifications/server/get-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/server/mark-notifications-read'
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

const dateTimeFormatter = new Intl.DateTimeFormat('ar', {
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The /user/notifications inbox (#17): all/unread + type filters via URL
 * search params, mark as read on click, and mark-all-as-read.
 */
const NotificationsList: React.FC<NotificationsListProps> = ({ data, seen, type }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

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
      if (result.ok) router.push(link ?? NOTIFICATIONS_PAGE)
      else router.refresh()
    })
  }

  const markAll = () => {
    startTransition(async () => {
      const result = await markAllNotificationsRead()
      if (result.ok) router.refresh()
    })
  }

  return (
    <div dir="rtl" className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={seen === 'all' ? 'default' : 'outline'}
            size="sm"
            render={<Link href={buildHref({ seen: undefined, page: 1 })} />}
          >
            الكل
          </Button>
          <Button
            variant={seen === 'unread' ? 'default' : 'outline'}
            size="sm"
            render={<Link href={buildHref({ seen: 'unread', page: 1 })} />}
          >
            غير المقروء{data.unreadCount > 0 ? ` (${data.unreadCount})` : ''}
          </Button>
          <select
            aria-label="تصفية حسب النوع"
            value={type ?? ''}
            onChange={(event) =>
              router.push(buildHref({ type: event.target.value || undefined, page: 1 }))
            }
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none"
          >
            <option value="">كل الأنواع</option>
            {NOTIFICATION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {data.unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={markAll} disabled={isPending}>
            <CheckCheck className="size-4" />
            تحديد الكل كمقروء
          </Button>
        ) : null}
      </div>

      {data.notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
      ) : (
        <div className="self-stretch overflow-hidden rounded-xl border border-stroke-grey">
          {data.notifications.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => markRead(item.id, item.seen, item.link)}
              className={cn(
                'flex w-full flex-col items-start gap-1 px-5 py-4 text-start transition-colors hover:bg-black/5',
                index !== data.notifications.length - 1 && 'border-b border-stroke-grey',
                !item.seen && 'bg-primary-main-20/20',
              )}
            >
              <span className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-base font-bold font-dubai text-[#243245]">
                    {item.title}
                  </span>
                  {!item.seen ? (
                    <span className="h-2 w-2 rounded-full bg-primary-300" aria-hidden />
                  ) : null}
                </span>
                <span className="text-[11px] text-grey-400">
                  {dateTimeFormatter.format(new Date(item.createdAt))}
                </span>
              </span>
              <span className="text-sm text-grey-500">{item.message}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-grey-500">
                {NOTIFICATION_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {data.page > 1 ? (
            <Button
              variant="outline"
              size="sm"
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

export default NotificationsList
