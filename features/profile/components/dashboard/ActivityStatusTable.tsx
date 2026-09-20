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

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-primary-300/10 text-primary-300',
  past: 'bg-muted text-muted-foreground',
  attended: 'bg-green-100 text-green-700',
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

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-background-2">
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">النشاط</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                تاريخ بدأ النشاط
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                مكان النشاط
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">حالة الطلب</th>
              <th className="w-12 px-3 py-3 text-center" />
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
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
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {activity?.startDate
                        ? format(new Date(activity.startDate), 'dd/MM/yyyy', { locale: arDZ })
                        : '—'}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {activity?.location || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
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
    </section>
  )
}

export default ActivityStatusTable
