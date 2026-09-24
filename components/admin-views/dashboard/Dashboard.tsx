'use client'

import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import {
  ArrowUpRight,
  Star,
  RotateCcw,
  TrendingUp,
  MoreHorizontal,
  CheckCircle,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import CalendarWidget from '@/features/profile/components/dashboard/CalendarWidget'
import type { Loan, Review, Book, User } from '@/payload-types'

interface AdminDashboardProps {
  stats: {
    pendingLoans: number
    pendingExtensions: number
    severeOverdue: number
    pendingVerifications: number
  }
  upcomingReturns: Loan[]
  latestReviews: Review[]
  recentActivityLogs: Array<{
    action: string
    timestamp: string
    metadata?: string
    userName: string
    userEmail: string
  }>
}

const ACTION_LABELS: Record<string, string> = {
  login: 'تسجيل دخول',
  password_changed: 'تغيير كلمة المرور',
  profile_updated: 'تحديث الملف الشخصي',
  account_verified: 'تفعيل الحساب',
  account_created: 'إنشاء حساب',
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700',
  password_changed: 'bg-amber-100 text-amber-700',
  profile_updated: 'bg-purple-100 text-purple-700',
  account_verified: 'bg-emerald-100 text-emerald-700',
  account_created: 'bg-primary-main-15 text-primary-300',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  upcomingReturns,
  latestReviews,
  recentActivityLogs,
}) => {
  const statCards = [
    {
      label: 'طلبات الإعارة قيد الانتظار',
      value: stats.pendingLoans,
      href: '/admin-panel/loans/pending',
      trend: '+145%',
    },
    {
      label: 'طلبات تمديد قيد الانتظار',
      value: stats.pendingExtensions,
      href: '/admin-panel/loans/pending',
      trend: '+145%',
    },
    {
      label: 'عدد التأخيرات الشهرية في الإرجاع',
      value: stats.severeOverdue,
      href: '/admin-panel/loans/overdue',
      trend: '+145%',
    },
    {
      label: 'عدد الحسابات بانتظار التحقق',
      value: stats.pendingVerifications,
      href: '/admin-panel/verification',
      trend: '+145%',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group/card flex items-center justify-between rounded-2xl border border-border bg-background-2 p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-3xl font-bold text-card-foreground">{stat.value}</span>
              <span className="flex items-center gap-1 text-xs text-primary-300">
                <TrendingUp className="size-3" />
                <span>{stat.trend}</span>
                أكثر من الشهر الماضي
              </span>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover/card:scale-110">
              <ArrowUpRight className="size-4 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Calendar + Upcoming Returns — bento layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CalendarWidget />
        <section className="rounded-2xl border border-border p-4 sm:p-5 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground">استلامات الكتب القادمة</h2>
            <Link
              href="/admin-panel/loans/active"
              className="text-xs text-primary-300 hover:underline"
            >
              عرض الكل
            </Link>
          </header>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-border bg-background-2">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    المستفيد
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكتاب</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الرمز</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    تاريخ الإستلام
                  </th>
                  <th className="w-12 px-3 py-3 text-center" />
                </tr>
              </thead>
              <tbody>
                {upcomingReturns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      لا توجد استلامات قادمة
                    </td>
                  </tr>
                ) : (
                  upcomingReturns.map((loan) => {
                    const book = loan.book as Book | undefined
                    const user = loan.user as User | undefined
                    const displayName =
                      user?.fullName ||
                      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                      user?.email

                    return (
                      <tr
                        key={loan.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                      >
                        <td className="truncate px-4 py-3 font-medium text-card-foreground">
                          {displayName}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {book?.title || 'كتاب'}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {book?.isbn || '—'}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {format(new Date(loan.dueDate), 'd MMM yyyy', { locale: arDZ })}
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
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <CheckCircle className="me-2 size-4" />
                                تأكيد الاستلام
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <CalendarClock className="me-2 size-4" />
                                طلب إعادة جدولة
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
      </div>

      {/* Reviews + Activity Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Latest Reviews */}
        <Card className="ring-0 border border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold">آخر التقييمات</CardTitle>
          </CardHeader>
          <CardContent>
            {latestReviews.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Star className="size-8 opacity-40" />
                <p className="text-sm">لا توجد تقييمات بعد</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {latestReviews.map((review) => {
                  const book = review.book as Book | undefined
                  const user = review.user as User | undefined
                  const displayName =
                    user?.fullName ||
                    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                    user?.email

                  return (
                    <div key={review.id} className="rounded-xl border border-border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{book?.title || 'كتاب'}</p>
                          <p className="truncate text-xs text-muted-foreground">{displayName}</p>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.comment}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {review.createdAt
                          ? format(new Date(review.createdAt), 'd MMM yyyy', { locale: arDZ })
                          : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Logs Timeline */}
        <Card className="ring-0 border border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold">آخر الأحداث المسجلة</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivityLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <RotateCcw className="size-8 opacity-40" />
                <p className="text-sm">لا توجد أحداث بعد</p>
              </div>
            ) : (
              <div className="relative flex flex-col gap-0">
                {recentActivityLogs.map((log, i) => (
                  <div
                    key={`${log.userEmail}-${log.timestamp}-${i}`}
                    className="relative flex gap-3 pb-4"
                  >
                    {/* Vertical line */}
                    {i < recentActivityLogs.length - 1 && (
                      <div className="absolute start-[11px] top-6 h-full w-px bg-border" />
                    )}
                    {/* Dot */}
                    <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-background-2 ring-2 ring-border">
                      <div className="size-2 rounded-full bg-primary" />
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{log.userName}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), 'd MMM yyyy — HH:mm', { locale: arDZ })}
                      </p>
                      {log.metadata && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{log.metadata}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
