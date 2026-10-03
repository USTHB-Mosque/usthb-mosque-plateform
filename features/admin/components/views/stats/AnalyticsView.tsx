'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from 'recharts'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { bookCategoriesConfig, bookTypesConfig, BookCategory } from '@/utils/constants/books'
import { getAdminAnalytics, type AnalyticsResult } from '@/features/admin/server/analytics'
import {
  PERIOD_OPTIONS,
  resolveFrom,
  type AnalyticsPeriod,
} from '@/features/admin/components/views/stats/periods'

function labelOf(value: string | null, map: Record<string, string>): string {
  if (!value) return 'غير مصنف'
  return map[value] ?? value
}

function categoryPillClass(value: string | null): string {
  if (value === BookCategory.Religious) return 'bg-[#0DEAC2]/15 text-[#0AAFC2] dark:text-[#4dedff]'
  if (value === BookCategory.Scientific) return 'bg-[#228BE6]/15 text-[#1864AB] dark:text-[#9bceff]'
  return 'bg-muted text-muted-foreground'
}

function CategoryPill({ value }: { value: string | null }) {
  return (
    <Badge className={`h-7 rounded-lg px-3 py-1 text-sm ${categoryPillClass(value)}`}>
      {labelOf(value, bookCategoriesConfig)}
    </Badge>
  )
}

/** The word every chart on this screen counts in, unless it says otherwise. */
const UNIT = 'طلب'

/**
 * Every card fed by `loans` rows grouped over `loan_date` counts *requests* —
 * a pending or refused row included — because that is what "the day most people
 * asked for a book" means. Only the borrowed-books table narrows to collected
 * copies, and it says so. A monthly chart of loans and a monthly chart of
 * requests are different numbers, so the label has to say which one this is.
 */
const REQUEST_SUBTITLE = 'كل طلبات الإعارة في الفترة — بما فيها الطلبات المرفوضة'

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipContentProps<number, string>['payload']
  label?: string | number
  unit?: string
}

function ChartTooltip({ active, payload, label, unit = UNIT }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary-200" />
        <span>
          {item.value} {unit}
        </span>
      </div>
    </div>
  )
}

const weekdayLabels: Record<number, string> = {
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
  7: 'الأحد',
}

const WEEKDAY_ORDER = [7, 1, 2, 3, 4, 5, 6]

type WeekdayCount = { day: string; count: number }

/** One weekday row per day of the week, in the RTL order the charts read in. */
function fillWeekdays(
  rows: Array<{ weekday: number } & Record<string, number>>,
  countKey: 'requests' | 'pickups',
): WeekdayCount[] {
  const byDay = new Map(rows.map((row) => [row.weekday, row[countKey] ?? 0]))
  return WEEKDAY_ORDER.map((weekday) => ({
    day: weekdayLabels[weekday],
    count: byDay.get(weekday) ?? 0,
  }))
}

function monthLabel(value: string | Date): string {
  return format(new Date(value), 'MMM yyyy', { locale: arDZ })
}

type BookRow = {
  bookId: number
  title: string
  author: string
  publisher: string | null
  category: string | null
}

function BooksTable({
  books,
  countHeader,
  countKey,
}: {
  books: Array<BookRow & { requests?: number; loans?: number }>
  countHeader: string
  countKey: 'requests' | 'loans'
}) {
  if (books.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
  }
  return (
    <div className="max-h-96 overflow-auto rounded-xl">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b border-border bg-background-2">
            <th className="sticky top-0 z-10 w-[34%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              اسم الكتاب
            </th>
            <th className="sticky top-0 z-10 w-[24%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              المؤلف
            </th>
            <th className="sticky top-0 z-10 w-[20%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              دار النشر
            </th>
            <th className="sticky top-0 z-10 w-[16%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              التصنيف
            </th>
            <th className="sticky top-0 z-10 w-[12%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              {countHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr
              key={book.bookId}
              className="border-b border-border last:border-0 hover:bg-muted/40"
            >
              <td className="truncate px-4 py-3 font-medium text-card-foreground">{book.title}</td>
              <td className="truncate px-4 py-3 text-muted-foreground">{book.author}</td>
              <td className="truncate px-4 py-3 text-muted-foreground">{book.publisher ?? '—'}</td>
              <td className="px-4 py-3">
                <CategoryPill value={book.category} />
              </td>
              <td className="px-4 py-3">{book[countKey]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnalyticsCard({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <Card className="rounded-2xl border border-border bg-background ring-0">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}

function Empty({ message = 'لا توجد بيانات' }: { message?: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
}

/**
 * The weekday and hour histograms each appear twice — once for loan requests and
 * once for pickups (SPEC §7.8 asks for both). Same chart, same axes, different
 * rows and a different unit in the tooltip, so they are one component here
 * rather than four near-identical blocks.
 */
function WeekdayBar({
  data,
  unit = UNIT,
}: {
  data: Array<{ day: string; value: number }>
  unit?: string
}) {
  if (data.every((row) => row.value === 0)) return <Empty />
  return (
    <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            dataKey="day"
            reversed
            interval={0}
            tick={{ style: { fontSize: 10 } }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis width={28} allowDecimals={false} orientation="right" />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey="value" barSize={28} fill="var(--primary-300)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function HourArea({
  data,
  unit = UNIT,
}: {
  data: Array<{ hour: string; value: number }>
  unit?: string
}) {
  if (data.every((row) => row.value === 0)) return <Empty />
  return (
    <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            reversed
            interval={0}
            tick={{ style: { fontSize: 10 } }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis width={28} allowDecimals={false} />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary-300)"
            fill="var(--primary-200)"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CountBar({ data }: { data: Array<{ category: string; value: number }> }) {
  if (data.length === 0) return <Empty />
  return (
    <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main p-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <XAxis
            dataKey="category"
            reversed
            interval={0}
            tick={{ style: { fontSize: 10, fontWeight: 500 } }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis width={28} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--primary-main-10)' }}
            content={<ChartTooltip unit={UNIT} />}
          />
          <Bar dataKey="value" fill="var(--primary-200)" radius={4} barSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MonthArea({ data }: { data: Array<{ month: string; value: number }> }) {
  if (data.length === 0) return <Empty />
  return (
    <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            reversed
            interval={0}
            tick={{ style: { fontSize: 10 } }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis width={28} allowDecimals={false} />
          <Tooltip content={<ChartTooltip unit={UNIT} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary-300)"
            fill="var(--primary-200)"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface AnalyticsViewProps {
  initial: AnalyticsResult
}

export default function AnalyticsView({ initial }: AnalyticsViewProps) {
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<AnalyticsResult>(initial)
  const [period, setPeriod] = useState<AnalyticsPeriod>(PERIOD_OPTIONS[0])

  const changePeriod = (option: AnalyticsPeriod) => {
    setPeriod(option)
    const from = resolveFrom(option.months, option.startOfYear)
    startTransition(async () => {
      setData(await getAdminAnalytics({ from: from.toISOString() }))
    })
  }

  const typeChartData = data.topTypes.map((row) => ({
    category: labelOf(row.type, bookTypesConfig),
    value: row.requests,
  }))

  const categoryChartData = data.topCategories.map((row) => ({
    category: labelOf(row.category, bookCategoriesConfig),
    value: row.requests,
  }))

  const monthlyData = data.monthlyBorrowings.map((row) => ({
    month: monthLabel(row.month),
    value: row.loans,
  }))

  const borrowHourData = Array.from({ length: 10 }, (_, index) => {
    const hour = index + 8
    return {
      hour: `${hour}:00`,
      value: data.busiestHours.find((row) => row.hour === hour)?.requests ?? 0,
    }
  })

  const pickupHourData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    value: data.pickupHours.find((row) => row.hour === hour)?.pickups ?? 0,
  }))

  const borrowWeekdayData = fillWeekdays(data.busiestWeekdays, 'requests').map((row) => ({
    day: row.day,
    value: row.count,
  }))

  const pickupWeekdayData = fillWeekdays(data.pickupWeekdays, 'pickups').map((row) => ({
    day: row.day,
    value: row.count,
  }))

  const periodLabel = period.startOfYear ? 'منذ بداية السنة الحالية' : `آخر ${period.months} شهراً`

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            الفترة المحسوبة: <span className="font-semibold text-foreground">{periodLabel}</span>
            <span className="ms-2 text-xs">
              (من {format(new Date(data.from), 'd MMM yyyy', { locale: arDZ })})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.label}
                size="sm"
                variant={option === period ? 'default' : 'outline'}
                disabled={pending}
                onClick={() => changePeriod(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsCard title="الكتب الأكثر طلباً" subtitle="كل الطلبات، بما فيها المرفوضة">
          <BooksTable books={data.topRequestedBooks} countHeader="الطلبات" countKey="requests" />
        </AnalyticsCard>

        <AnalyticsCard
          title="الكتب الأكثر إعارة"
          subtitle="الكتب التي خرجت فعلاً من المكتبة (مأخوذة أو مُرجَعة)"
        >
          <BooksTable books={data.topBorrowedBooks} countHeader="الإعارات" countKey="loans" />
        </AnalyticsCard>

        <AnalyticsCard title="تطوّر الإعارات الشهري" subtitle={REQUEST_SUBTITLE}>
          <MonthArea data={monthlyData} />
        </AnalyticsCard>

        <AnalyticsCard title="الأصناف الأكثر قراءة" subtitle={REQUEST_SUBTITLE}>
          <CountBar data={categoryChartData} />
        </AnalyticsCard>

        <AnalyticsCard title="أكثر أنواع الكتب طلباً" subtitle={REQUEST_SUBTITLE}>
          <CountBar data={typeChartData} />
        </AnalyticsCard>

        <AnalyticsCard title="الأيام التي تكثر فيها طلبات الإعارة" subtitle={REQUEST_SUBTITLE}>
          <WeekdayBar data={borrowWeekdayData} />
        </AnalyticsCard>

        <AnalyticsCard
          title="ساعات طلبات الإعارة"
          subtitle="من 8 صباحاً إلى 6 مساءً — كل الطلبات في الفترة"
        >
          <HourArea data={borrowHourData} />
        </AnalyticsCard>

        <AnalyticsCard title="أيام ذروة الاستلام" subtitle="اليوم الذي قُبل فيه الاستلام لكل إعارة">
          <WeekdayBar data={pickupWeekdayData} unit="استلام" />
        </AnalyticsCard>

        <AnalyticsCard title="ساعات ذروة الاستلام" subtitle="على مدار 24 ساعة — وقت قبول الاستلام">
          <HourArea data={pickupHourData} unit="استلام" />
        </AnalyticsCard>

        <AnalyticsCard
          title="المقالات الأكثر تفاعلاً"
          subtitle="قراءات الأعضاء (كل الفترات) + التقييمات + المفضلة"
        >
          {data.topArticleByInteraction ? (
            <div className="flex flex-col gap-3">
              <p className="text-base font-medium text-card-foreground">
                «{data.topArticleByInteraction.title}»
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-lg bg-primary-main-15 text-primary-300">
                  {data.topArticleByInteraction.reads} قراءة
                </Badge>
                <Badge className="rounded-lg bg-primary-main-15 text-primary-300">
                  {data.topArticleByInteraction.reviews} تقييم
                </Badge>
                <Badge className="rounded-lg bg-primary-main-15 text-primary-300">
                  {data.topArticleByInteraction.favorites} في المفضلة
                </Badge>
              </div>
            </div>
          ) : (
            <Empty message="لا يوجد تفاعل على المقالات بعد" />
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="المقالات الأكثر قراءة"
          subtitle="القراءات والتقييمات والمفضلة لكل مقال"
        >
          {data.articleEngagement.length === 0 ? (
            <Empty message="لا يوجد تفاعل على المقالات بعد" />
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-2">
                    <th className="sticky top-0 z-10 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      المقال
                    </th>
                    <th className="sticky top-0 z-10 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      القراءات
                    </th>
                    <th className="sticky top-0 z-10 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      التقييمات
                    </th>
                    <th className="sticky top-0 z-10 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      المفضلة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.articleEngagement.map((article) => (
                    <tr
                      key={article.articleId}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="truncate px-4 py-3 font-medium text-card-foreground">
                        {article.title}
                      </td>
                      <td className="px-4 py-3">{article.reads}</td>
                      <td className="px-4 py-3">{article.reviews}</td>
                      <td className="px-4 py-3">{article.favorites}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="الأنشطة الأكثر تسجيلاً" subtitle="عدد التسجيلات في الفترة">
          {data.activityRegistrations.length === 0 ? (
            <Empty message="لا توجد تسجيلات في هذه الفترة" />
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-2">
                    <th className="sticky top-0 z-10 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      النشاط
                    </th>
                    <th className="sticky top-0 z-10 w-32 bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
                      التسجيلات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.activityRegistrations.map((activity) => (
                    <tr
                      key={activity.activityId}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="truncate px-4 py-3 font-medium text-card-foreground">
                        {activity.title}
                      </td>
                      <td className="px-4 py-3">{activity.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="آراء الأنشطة" subtitle="تغذية راجعة إيجابية مقابل سلبية">
          {data.activityFeedback.length === 0 ? (
            <Empty message="لا توجد تغذية راجعة في هذه الفترة" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] bg-[var(--primary-500)]" />
                  إيجابي:{' '}
                  <span className="font-semibold text-foreground">
                    {data.activityFeedback.reduce((sum, row) => sum + row.positive, 0)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] bg-destructive" />
                  سلبي:{' '}
                  <span className="font-semibold text-foreground">
                    {data.activityFeedback.reduce((sum, row) => sum + row.negative, 0)}
                  </span>
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {data.activityFeedback.map((activity) => (
                  <li
                    key={activity.activityId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="truncate text-sm font-medium text-card-foreground">
                      {activity.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Badge className="rounded-lg bg-[#00FF92]/15 text-[#0B7A4B] dark:text-[#7dffc4]">
                        {activity.positive} إيجابي
                      </Badge>
                      <Badge className="rounded-lg bg-destructive/10 text-destructive">
                        {activity.negative} سلبي
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  )
}
