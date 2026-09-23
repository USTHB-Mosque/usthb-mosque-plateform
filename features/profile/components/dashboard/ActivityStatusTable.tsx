'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MoreHorizontal, Eye, XCircle } from 'lucide-react'
import type { ActivityRegistration, Activity } from '@/payload-types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

interface ActivityStatusTableProps {
  registrations: ActivityRegistration[]
}

function isUpcoming(activity: Activity | undefined): boolean {
  if (!activity?.startDate) return false
  return new Date(activity.startDate).getTime() >= Date.now()
}

function getStatus(registration: ActivityRegistration): 'upcoming' | 'past' | 'attended' {
  if (registration.attended) return 'attended'
  const activity = registration.activity as Activity | undefined
  if (isUpcoming(activity)) return 'upcoming'
  return 'past'
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'قادم',
  past: 'منتهي',
  attended: 'حاضر',
}

const STATUS_COLORS: Record<string, { className: string; dotClassName: string }> = {
  upcoming: {
    className: 'bg-primary-300/10 text-primary-300',
    dotClassName: 'bg-primary-300',
  },
  past: {
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground/60',
  },
  attended: {
    className: 'bg-green-100 text-green-700',
    dotClassName: 'bg-green-600',
  },
}

const ActivityStatusTable: React.FC<ActivityStatusTableProps> = ({ registrations }) => {
  const router = useRouter()

  return (
    <section className="rounded-2xl border border-border p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">حالة التسجيلات في الأنشطة</h2>
        <Link href="/user/my-registrations" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      <ul className="divide-y divide-border sm:hidden">
        <li className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-background-2 px-4 py-3 text-right">
          <span className="w-[60%] font-medium text-muted-foreground md:w-[75%]">النشاط</span>
          <span className="font-medium text-muted-foreground">تاريخ بدأ النشاط</span>
          <span className="size-2.5 shrink-0" />
        </li>
        {registrations.length === 0 ? (
          <li className="px-4 py-10 text-center text-muted-foreground">لا توجد تسجيلات حالياً.</li>
        ) : (
          registrations.map((registration) => {
            const activity = registration.activity as Activity | undefined
            const activityId = activity?.id
            const status = getStatus(registration)
            return (
              <li
                key={registration.id}
                onClick={() => router.push(`/user/activities/${activityId}`)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0 w-[60%] font-medium text-card-foreground md:w-[75%]">
                  {activity?.title || 'نشاط'}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {activity?.startDate
                    ? format(new Date(activity.startDate), 'dd/MM/yyyy', { locale: arDZ })
                    : '—'}
                </span>
                <span
                  className={`size-2.5 shrink-0 rounded-full ${STATUS_COLORS[status].dotClassName}`}
                  title={STATUS_LABELS[status]}
                  aria-label={STATUS_LABELS[status]}
                />
              </li>
            )
          })
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl sm:block">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-background-2">
              <th className="w-[35%] px-4 py-3 text-right font-medium text-muted-foreground xl:w-[31%]">
                النشاط
              </th>
              <th className="w-1/4 px-4 py-3 text-right font-medium text-muted-foreground xl:w-1/5">
                تاريخ بدأ النشاط
              </th>
              <th className="w-1/4 px-4 py-3 text-right font-medium text-muted-foreground xl:w-1/5">
                مكان النشاط
              </th>
              <th className="w-[15%] px-4 py-3 text-center font-medium text-muted-foreground xl:w-1/5 xl:text-right">
                <span className="xl:hidden" aria-hidden="true">
                  &nbsp;
                </span>
                <span className="hidden xl:inline">حالة الطلب</span>
              </th>
              <th className="hidden px-3 py-3 text-center xl:w-[9%] xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  لا توجد تسجيلات حالياً.
                </td>
              </tr>
            ) : (
              registrations.map((registration) => {
                const activity = registration.activity as Activity | undefined
                const activityId = activity?.id
                const status = getStatus(registration)
                return (
                  <tr
                    key={registration.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => router.push(`/user/activities/${activityId}`)}
                  >
                    <td className="truncate px-4 py-3 font-medium text-card-foreground">
                      {activity?.title || 'نشاط'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {activity?.startDate
                        ? format(new Date(activity.startDate), 'dd/MM/yyyy', { locale: arDZ })
                        : '—'}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {activity?.location || '—'}
                    </td>
                    <td className="py-3 pl-3 pr-1 text-left xl:px-0 xl:text-right">
                      {(() => {
                        const color = STATUS_COLORS[status]
                        return (
                          <>
                            <span
                              className={`inline-block size-2.5 rounded-full align-middle ${color.dotClassName} xl:hidden`}
                              title={STATUS_LABELS[status]}
                              aria-label={STATUS_LABELS[status]}
                            />
                            <span
                              className={`hidden whitespace-nowrap rounded-full px-2.5 py-0.5 text-center text-xs font-medium xl:inline-block xl:min-w-[90px] ${color.className}`}
                            >
                              {STATUS_LABELS[status]}
                            </span>
                          </>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-3 text-center hidden xl:table-cell xl:px-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="ms-auto flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/user/activities/${activityId}`)
                            }}
                          >
                            <Eye className="me-2 size-4" />
                            تفاصيل النشاط
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Cancel registration
                            }}
                            variant="destructive"
                          >
                            <XCircle className="me-2 size-4" />
                            الغاء التسجيل
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 xl:hidden">
        <span className="text-xs font-medium text-muted-foreground">حالة الطلب:</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-card-foreground">
            <span
              className={`inline-block size-2.5 rounded-full ${STATUS_COLORS[key].dotClassName}`}
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}

export default ActivityStatusTable
