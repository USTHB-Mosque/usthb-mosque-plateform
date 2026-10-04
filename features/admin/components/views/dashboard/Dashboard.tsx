'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Star,
  RotateCcw,
  MoreVertical,
  CheckCircle,
  Eye,
  Bell,
  PackageCheck,
  X,
  LogIn,
  KeyRound,
  UserPen,
  BadgeCheck,
  UserPlus,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { CalendarWidget } from '@/features/profile'
import { LoanDetailsDialog } from '@/features/library'
import { markLoanPickedUp, sendLoanReminder, rejectLoan } from '@/features/admin/server/loans'
import BulkActionsBar from '@/shared/common/BulkActionsBar'
import TableCheckbox from '@/shared/ui/table-checkbox'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import RejectLoanDialog from '@/features/admin/components/views/loans/RejectLoanDialog'
import { buildCalendarEvents } from './calendar-events'
import { cn } from '@/shared/lib/utils'
import type { Loan, Review, Book, User } from '@/payload-types'

interface AdminDashboardProps {
  stats: {
    pendingLoans: number
    pendingExtensions: number
    severeOverdue: number
    pendingVerifications: number
  }
  upcomingReturns: Loan[]
  upcomingPickups: Loan[]
  latestReviews: Review[]
  recentActivityLogs: Array<{
    action: string
    timestamp: string
    metadata?: string
    userName: string
    userEmail: string
  }>
}

/**
 * The activity widget is a scan-first list: the icon chip carries the action so
 * the eye can skip the labels, and the tones stay on the teal/neutral token
 * scale rather than the raw Tailwind palette the old badges used.
 */
const ACTION_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  login: { label: 'تسجيل دخول', icon: LogIn, tone: 'bg-primary-main-10 text-primary-400' },
  password_changed: {
    label: 'تغيير كلمة المرور',
    icon: KeyRound,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  profile_updated: {
    label: 'تحديث الملف الشخصي',
    icon: UserPen,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  },
  account_verified: {
    label: 'تفعيل الحساب',
    icon: BadgeCheck,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  account_created: {
    label: 'إنشاء حساب',
    icon: UserPlus,
    tone: 'bg-primary-main-10 text-primary-400',
  },
}

const UNKNOWN_ACTION = {
  label: 'حدث',
  icon: Activity,
  tone: 'bg-muted text-muted-foreground',
} as const

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

function displayNameOf(user: User | undefined): string {
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  upcomingReturns = [],
  upcomingPickups = [],
  latestReviews,
  recentActivityLogs,
}) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ loanIds: number[]; label: string } | null>(null)
  const [cancel, setCancel] = useState<{ loanId: number; label: string } | null>(null)

  const pickupIds = upcomingPickups.map((loan) => loan.id)
  const allSelected = pickupIds.length > 0 && pickupIds.every((id) => selected.has(id))
  const someSelected = !allSelected && pickupIds.some((id) => selected.has(id))

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pickupIds))
  }

  const openDetails = (loan: Loan) => {
    setDetailsLoan(loan)
    setDetailsOpen(true)
  }

  const labelFor = (loanIds: number[]) => {
    if (loanIds.length === 1) {
      const loan = upcomingPickups.find((l) => l.id === loanIds[0])
      return displayNameOf(loan?.user as User | undefined)
    }
    return `${loanIds.length} استلامات`
  }

  const openConfirm = (loanIds: number[]) => {
    if (loanIds.length === 0) return
    setConfirm({ loanIds, label: labelFor(loanIds) })
  }

  const runPickup = (loanIds: number[]) => {
    setConfirm(null)
    setSelected(new Set())
    startTransition(async () => {
      let done = 0
      for (const id of loanIds) {
        const result = await markLoanPickedUp(id)
        if (result.ok) done++
        else toast.error(result.error || 'تعذر تسجيل الاستلام')
      }
      if (done > 0) {
        toast.success(`تم تسجيل استلام ${done} ${done === 1 ? 'كتاب' : 'كتب'}`)
        router.refresh()
      }
    })
  }

  const sendReminder = (loan: Loan) => {
    startTransition(async () => {
      const result = await sendLoanReminder(loan.id)
      if (result.ok) toast.success('تم إرسال التذكير إلى المستفيد')
      else toast.error(result.error || 'تعذر إرسال التذكير')
    })
  }

  // An accepted loan the member never collects. The schema has no `cancelled`
  // state, and `refuseLoan` is the transition that accepts `accepted` and
  // releases the copy, so cancellation is a refusal with cancel wording.
  const runCancel = async (loanId: number, reason?: string) => {
    setCancel(null)
    setSelected(new Set())
    startTransition(async () => {
      const result = await rejectLoan(loanId, reason)
      if (result.ok) {
        toast.success('تم إلغاء الإعارة وإرجاع الكتاب إلى الرف')
        router.refresh()
      } else {
        toast.error(result.error || 'تعذر إلغاء الإعارة')
      }
    })
  }

  // Counts only. A trend line needs a measured month-over-month delta; until
  // one is computed from real rows we show nothing rather than invent a number.
  const statCards = [
    {
      label: 'طلبات الإعارة قيد الانتظار',
      value: stats.pendingLoans,
      href: '/admin-panel/loans',
    },
    {
      label: 'طلبات تمديد قيد الانتظار',
      value: stats.pendingExtensions,
      href: '/admin-panel/loans/extensions',
    },
    {
      label: 'عدد التأخيرات الشهرية في الإرجاع',
      value: stats.severeOverdue,
      href: '/admin-panel/loans',
    },
    {
      label: 'عدد الحسابات بانتظار التحقق',
      value: stats.pendingVerifications,
      href: '/admin-panel/verification',
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
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover/card:scale-110">
              <ArrowUpRight className="size-4 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Calendar + today's pickups — bento layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CalendarWidget events={buildCalendarEvents(upcomingPickups, upcomingReturns)} />
        <section className="rounded-2xl border border-border p-4 sm:p-5 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground">استلامات الكتب القادمة</h2>
            <Link href="/admin-panel/loans" className="text-xs text-primary-300 hover:underline">
              عرض الكل
            </Link>
          </header>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-border bg-background-2">
                  <th className="w-10 px-3 py-3">
                    <span className="sr-only">تحديد</span>
                    <TableCheckbox
                      checked={allSelected}
                      partial={someSelected}
                      label="تحديد الكل"
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    المستفيد
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكتاب</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    موقع الكتاب
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    تاريخ الاستلام
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الساعة</th>
                  <th className="w-12 px-3 py-3 text-center" />
                </tr>
              </thead>
              <tbody>
                {upcomingPickups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      لا توجد استلامات قادمة
                    </td>
                  </tr>
                ) : (
                  upcomingPickups.map((loan) => {
                    const book = loan.book as Book | undefined
                    const isSelected = selected.has(loan.id)
                    return (
                      <tr
                        key={loan.id}
                        onClick={() => openDetails(loan)}
                        className={cn(
                          'cursor-pointer border-b border-border last:border-0 hover:bg-muted/40',
                          isSelected && 'bg-primary-200/5',
                        )}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <TableCheckbox
                            checked={isSelected}
                            label={`تحديد استلام ${displayNameOf(loan.user as User | undefined)}`}
                            onChange={() => toggle(loan.id)}
                          />
                        </td>
                        <td className="truncate px-4 py-3 font-medium text-card-foreground">
                          {displayNameOf(loan.user as User | undefined)}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {book?.title || 'كتاب'}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {book?.location || '—'}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {loan.pickupDate
                            ? format(new Date(loan.pickupDate), 'd MMM yyyy', { locale: arDZ })
                            : '—'}
                        </td>
                        <td className="truncate px-4 py-3 text-muted-foreground">
                          {loan.pickupHour || '—'}
                        </td>
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`إجراءات استلام ${displayNameOf(loan.user as User | undefined)}`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">فتح قائمة الإجراءات</span>
                            </DropdownMenuTrigger>
                            {/* Mirrors the users table action menu so every row menu in
                                the admin panel reads the same. */}
                            <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>الاستلام</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetails(loan)}>
                                  <Eye className="size-4" />
                                  تفاصيل الإعارة
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openConfirm([loan.id])}>
                                  <PackageCheck className="size-4" />
                                  تأكيد الاستلام
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={pending}
                                  onClick={() => sendReminder(loan)}
                                >
                                  <Bell className="size-4" />
                                  تذكير بالمستلام
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={pending}
                                  onClick={() =>
                                    setCancel({
                                      loanId: loan.id,
                                      label: displayNameOf(loan.user as User | undefined),
                                    })
                                  }
                                >
                                  <X className="size-4" />
                                  إلغاء الإعارة
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
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

      <BulkActionsBar
        count={selected.size}
        itemName="استلام"
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: 'تأكيد الاستلام',
            icon: CheckCircle,
            onClick: () => openConfirm(Array.from(selected)),
          },
        ]}
      />

      {detailsLoan ? (
        <LoanDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} loan={detailsLoan} />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          open
          onOpenChange={() => setConfirm(null)}
          title="تسجيل أخذ الكتاب"
          description={`سيتم تسجيل أخذ الكتاب «${confirm.label}» وحساب تاريخ الإرجاع ابتداءً من اليوم.`}
          confirmLabel="تسجيل الأخذ"
          busy={pending}
          onConfirm={() => runPickup(confirm.loanIds)}
        />
      ) : null}

      {cancel ? (
        <RejectLoanDialog
          open
          onOpenChange={() => setCancel(null)}
          itemLabel={cancel.label}
          busy={pending}
          title="إلغاء الإعارة"
          description={`سيتم إلغاء إعارة ${cancel.label} قبل الاستلام، ويصبح الكتاب متاحاً مجدداً إلى دورته على الرف. يمكنك إضافة سبب يظهر للمستفيد.`}
          confirmLabel="تأكيد الإلغاء"
          placeholder="اكتب سبب الإلغاء هنا ..."
          onConfirm={(reason) => runCancel(cancel.loanId, reason)}
        />
      ) : null}

      {/*
        Upcoming returns — copies the member still holds.
        Hidden for now: the pickups table above plus the calendar already carry
        the operational load, and the calendar marks due dates as well. The
        `upcomingReturns` query stays in place (the calendar consumes it).
      */}
      {/* <section className="rounded-2xl border border-border p-4 sm:p-5">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-card-foreground">إرجاعات الكتب القادمة</h2>
          <Link href="/admin-panel/loans" className="text-xs text-primary-300 hover:underline">
            عرض الكل
          </Link>
        </header>
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b border-border bg-background-2">
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المستفيد</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكتاب</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  تاريخ الإرجاع
                </th>
              </tr>
            </thead>
            <tbody>
              {upcomingReturns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد إرجاعات قادمة
                  </td>
                </tr>
              ) : (
                upcomingReturns.map((loan) => {
                  const book = loan.book as Book | undefined
                  return (
                    <tr
                      key={loan.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="truncate px-4 py-3 font-medium text-card-foreground">
                        {displayNameOf(loan.user as User | undefined)}
                      </td>
                      <td className="truncate px-4 py-3 text-muted-foreground">
                        {book?.title || 'كتاب'}
                      </td>
                      <td className="truncate px-4 py-3 text-muted-foreground">
                        {loan.dueDate
                          ? format(new Date(loan.dueDate), 'd MMM yyyy', { locale: arDZ })
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section> */}

      {/* Reviews + Activity Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Latest Reviews */}
        <Card className="ring-0 flex flex-col border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">آخر التقييمات</CardTitle>
              <Link
                href="/admin-panel/reviews"
                className="text-xs text-primary-300 hover:underline"
              >
                عرض الكل
              </Link>
            </div>
          </CardHeader>
          <CardContent className="max-h-[22rem] overflow-y-auto">
            {latestReviews.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Star className="size-8 opacity-40" />
                <p className="text-sm">لا توجد تقييمات بعد</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {latestReviews.map((review) => {
                  const book = review.book as Book | undefined
                  const displayName = displayNameOf(review.user as User | undefined)

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
        <Card className="ring-0 flex flex-col border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">آخر الأحداث المسجلة</CardTitle>
              <Link
                href="/admin-panel/activity-log"
                className="text-xs text-primary-300 hover:underline"
              >
                عرض الكل
              </Link>
            </div>
          </CardHeader>
          <CardContent className="max-h-[22rem] overflow-y-auto">
            {recentActivityLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <RotateCcw className="size-8 opacity-40" />
                <p className="text-sm">لا توجد أحداث بعد</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentActivityLogs.map((log, i) => {
                  const meta = ACTION_META[log.action] ?? UNKNOWN_ACTION
                  const Icon = meta.icon
                  return (
                    <li key={`${log.userEmail}-${log.timestamp}-${i}`}>
                      <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-border hover:bg-muted/30">
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg',
                            meta.tone,
                          )}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-card-foreground">
                              {log.userName}
                            </span>
                            <time
                              dateTime={log.timestamp}
                              className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                            >
                              {format(new Date(log.timestamp), 'd MMM · HH:mm', { locale: arDZ })}
                            </time>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {meta.label}
                            {log.metadata ? ` — ${log.metadata}` : ''}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
