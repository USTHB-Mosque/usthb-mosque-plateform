import * as React from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { ScrollText, ShieldCheck, User, type LucideIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/ui/card'
import type { ActivityLogPage, ActivityLogSource } from '@/features/profile/server/activity-log'

type ActivityLogTimelineProps = {
  data: ActivityLogPage | null
  /** Request-time clock, so relative labels stay stable within one render. */
  now?: Date
}

/** What they did themselves vs. what the administration did for them. */
const SOURCE_ICONS: Record<ActivityLogSource, LucideIcon> = {
  self: User,
  admin: ShieldCheck,
}

const SOURCE_LABELS: Record<ActivityLogSource, string> = {
  self: 'فعلته أنت',
  admin: 'من طرف الإدارة',
}

const pageHref = (page: number) => `/user/activity-log?page=${page}`

/**
 * The member's history (#165): day groups of their own actions merged with the
 * audit lines written about them, plus the pager. Read-only — the pager is the
 * only control, so this stays a server component.
 */
const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({ data, now }) => {
  const referenceTime = now ?? new Date()
  const groups = data?.groups ?? []

  return (
    <div className="flex flex-col gap-6">
      {groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <ScrollText className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-card-foreground">لا توجد أحداث بعد</p>
          <p className="max-w-md text-xs text-muted-foreground">
            سيظهر هنا كل ما فعلته في المكتبة، وكل ما قامت به الإدارة بخصوص حسابك: طلبات الإعارة،
            التمديدات، التوثيق وحجب الإعارة.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.dateKey} aria-label={group.label} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {group.items.map((event, index) => {
                const Icon = SOURCE_ICONS[event.source]
                const date = new Date(event.timestamp)
                return (
                  <li
                    key={event.id}
                    className={cn(
                      'flex items-start gap-3 px-5 py-4',
                      index !== group.items.length - 1 && 'border-b border-border',
                    )}
                  >
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      title={SOURCE_LABELS[event.source]}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="sr-only">{SOURCE_LABELS[event.source]}</span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-card-foreground">{event.label}</span>
                      {event.detail ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {event.detail}
                        </span>
                      ) : null}
                    </span>

                    <time
                      dateTime={event.timestamp}
                      title={format(date, 'd MMM yyyy – HH:mm', { locale: arDZ })}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    >
                      {formatDistanceToNow(date, { addSuffix: true, locale: arDZ })}
                    </time>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      {data && data.totalPages > 1 ? (
        <nav aria-label="تنقل بين الصفحات" className="flex items-center justify-center gap-3">
          {data.page > 1 ? (
            <Link
              href={pageHref(data.page - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-card-foreground transition-colors hover:bg-muted"
            >
              السابق
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {data.page} / {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <Link
              href={pageHref(data.page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-card-foreground transition-colors hover:bg-muted"
            >
              التالي
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}

export default ActivityLogTimeline
