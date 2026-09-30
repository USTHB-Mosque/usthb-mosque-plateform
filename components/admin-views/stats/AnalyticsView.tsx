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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from 'recharts'
import { toast } from 'sonner'
import { bookCategoriesConfig, bookTypesConfig, BookCategory } from '@/utils/constants/books'
import { getAdminAnalytics, type AnalyticsResult } from '@/features/admin/server/analytics'

const periodOptions = [
  { label: 'منذ بداية السنة', months: 12, startOfYear: true },
  { label: 'آخر 6 أشهر', months: 6 },
  { label: 'آخر 3 أشهر', months: 3 },
  { label: 'آخر شهر', months: 1 },
]

function resolveFrom(months: number, startOfYear: boolean): Date {
  if (startOfYear) return new Date(new Date().getFullYear(), 0, 1)
  return new Date()
}

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

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipContentProps<number, string>['payload']
  label?: string | number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary-200" />
        <span>{item.value} طلباً</span>
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

type WeekdayRow = AnalyticsResult['busiestWeekdays'][number]

function fillWeekdays(rows: WeekdayRow[]): Array<{ day: string; requests: number }> {
  const byDay = new Map(rows.map((row) => [row.weekday, row.requests]))
  return WEEKDAY_ORDER.map((weekday) => ({
    day: weekdayLabels[weekday],
    requests: byDay.get(weekday) ?? 0,
  }))
}

function fillHours(
  rows: AnalyticsResult['busiestHours'],
): Array<{ hour: string; requests: number }> {
  const byHour = new Map(rows.map((row) => [row.hour, row.requests]))
  return Array.from({ length: 10 }, (_, index) => {
    const hour = index + 8
    return { hour: `${hour}:00`, requests: byHour.get(hour) ?? 0 }
  })
}

const attendanceDays = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const

const attendanceByDay: Record<string, { beforeDhuhr: number; beforeAsr: number }> = {
  السبت: { beforeDhuhr: 12, beforeAsr: 9 },
  الأحد: { beforeDhuhr: 15, beforeAsr: 10 },
  الإثنين: { beforeDhuhr: 18, beforeAsr: 14 },
  الثلاثاء: { beforeDhuhr: 14, beforeAsr: 11 },
  الأربعاء: { beforeDhuhr: 20, beforeAsr: 16 },
  الخميس: { beforeDhuhr: 16, beforeAsr: 12 },
  الجمعة: { beforeDhuhr: 10, beforeAsr: 7 },
}

type BookRow = AnalyticsResult['topRequestedBooks'][number]

const topBorrowedBooks: BookRow[] = [
  {
    bookId: 101,
    title: 'تفسير القرآن العظيم',
    author: 'ابن كثير الدمشقي',
    publisher: 'دار طيبة',
    category: BookCategory.Religious,
    requests: 64,
  },
  {
    bookId: 102,
    title: 'صحيح مسلم',
    author: 'مسلم بن الحجاج النيسابوري',
    publisher: 'دار إحياء التراث العربي',
    category: BookCategory.Religious,
    requests: 57,
  },
  {
    bookId: 103,
    title: 'الرحيق المختوم',
    author: 'صفي الرحمن المباركفوري',
    publisher: 'مكتبة الرشد',
    category: BookCategory.Religious,
    requests: 48,
  },
  {
    bookId: 104,
    title: 'في ظلال القرآن',
    author: 'سيد قطب',
    publisher: 'دار الشروق',
    category: BookCategory.Religious,
    requests: 41,
  },
  {
    bookId: 105,
    title: 'مقدمة ابن خلدون',
    author: 'عبد الرحمن بن خلدون',
    publisher: 'مؤسسة المعارف',
    category: BookCategory.Scientific,
    requests: 35,
  },
  {
    bookId: 106,
    title: 'الأحياء',
    author: 'أبو حامد الغزالي',
    publisher: 'دار المعرفة',
    category: BookCategory.Religious,
    requests: 29,
  },
]

interface BooksTableProps {
  books: BookRow[]
  countHeader: string
}

function BooksTable({ books, countHeader }: BooksTableProps) {
  if (books.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
  }
  return (
    <div className="max-h-96 overflow-auto rounded-xl">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b border-border bg-background-2">
            <th className="sticky top-0 z-10 w-[32%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              اسم الكتاب
            </th>
            <th className="sticky top-0 z-10 w-[22%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              المؤلف
            </th>
            <th className="sticky top-0 z-10 w-[18%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              دار النشر
            </th>
            <th className="sticky top-0 z-10 w-[15%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
              التصنيف
            </th>
            <th className="sticky top-0 z-10 w-[13%] bg-background-2 px-4 py-3 text-right font-medium text-muted-foreground">
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
              <td className="px-4 py-3">{book.requests}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface BusyDayBarLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  index?: number
  rows: Array<{ day: string; requests: number }>
}

function BusyDayBarLabel({ x, y, width, height, index, rows }: BusyDayBarLabelProps) {
  const nx = Number(x)
  const ny = Number(y)
  const nw = Number(width)
  const nh = Number(height)
  const entry = index == null ? undefined : rows[index]
  if (
    !Number.isFinite(nx) ||
    !Number.isFinite(ny) ||
    !Number.isFinite(nw) ||
    !Number.isFinite(nh) ||
    !entry
  ) {
    return null
  }
  const barRight = nw >= 0 ? nx + nw : nx
  const barLeft = nw >= 0 ? nx : nx + nw
  const cy = ny + nh / 2
  return (
    <g>
      <text
        x={barRight - 8}
        y={cy}
        textAnchor="start"
        dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 500 }}
        fill="#fff"
      >
        {entry.day}
      </text>
      <text
        x={barLeft - 8}
        y={cy}
        textAnchor="start"
        dominantBaseline="central"
        style={{ fontSize: 12 }}
        fill="var(--foreground)"
      >
        {entry.requests}
      </text>
    </g>
  )
}

interface AnalyticsViewProps {
  initial: AnalyticsResult
}

export default function AnalyticsView({ initial }: AnalyticsViewProps) {
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<AnalyticsResult>(initial)
  const [period, setPeriod] = useState(periodOptions[0])
  const [attendanceDay, setAttendanceDay] = useState<string>('الأحد')

  const attendance = attendanceByDay[attendanceDay]
  const attendanceTotal = attendance.beforeDhuhr + attendance.beforeAsr
  const attendancePieData = [
    { name: 'قبل العصر', value: attendance.beforeAsr },
    { name: 'قبل الظهر', value: attendance.beforeDhuhr },
  ]

  const changePeriod = (option: (typeof periodOptions)[number]) => {
    setPeriod(option)
    const from = resolveFrom(option.months, Boolean(option.startOfYear))
    startTransition(async () => {
      const result = await getAdminAnalytics({ from: from.toISOString() })
      setData(result)
    })
  }

  const categoryChartData = data.topTypes.map((row) => ({
    category: labelOf(row.type, bookTypesConfig),
    value: row.requests,
  }))

  const busiestHoursData = fillHours(data.busiestHours)

  const busiestWeekdaysData = fillWeekdays(data.busiestWeekdays)

  return (
    <div className="flex flex-col gap-6">
      {/* <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            الفترة المحسوبة:{' '}
            <span className="font-semibold text-foreground">
              {period.startOfYear ? 'منذ بداية السنة الحالية' : `آخر ${period.months} شهراً`}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
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
      </Card> */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[repeat(8,1fr)] lg:grid-rows-[auto_400px]">
        <Card className="rounded-xl border border-border bg-background ring-0 lg:col-span-4">
          <CardHeader>
            <CardTitle>الكتب الأكثر طلباً</CardTitle>
          </CardHeader>
          <CardContent>
            <BooksTable books={data.topRequestedBooks} countHeader="عدد الطلبات" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-background ring-0 lg:col-span-4">
          <CardHeader>
            <CardTitle>الأصناف الأكثر قراءة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-5">
            {categoryChartData.length === 0 ? (
              <p className="py-6 text-center text-2 text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="min-h-0 w-full flex-1 rounded-xl bg-fill-main p-5">
                <div className="mx-auto h-full w-4/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      barCategoryGap={8}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <XAxis
                        dataKey="category"
                        tick={{ style: { fontSize: 8, fontWeight: 500 } }}
                        tickMargin={8}
                        reversed
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--primary-main-10)' }}
                        content={<ChartTooltip />}
                      />
                      <Bar dataKey="value" fill="var(--primary-200)" radius={4} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-background ring-0 lg:col-span-5">
          <CardHeader>
            <CardTitle>الأيام التي تكثر فيها طلبات الإعارة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {!busiestHoursData.some((entry) => entry.requests > 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={busiestHoursData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                  >
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
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="var(--primary-300)"
                      fill="var(--primary-200)"
                      fillOpacity={0.4}
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-background ring-0 lg:col-span-3">
          <CardHeader>
            <CardTitle>الأيام التي تكثر فيها طلبات الإعارة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {!busiestWeekdaysData.some((entry) => entry.requests > 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="min-h-64 w-full flex-1 rounded-xl bg-fill-main">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={busiestWeekdaysData}
                    layout="vertical"
                    margin={{ top: 8, right: 8, bottom: 8, left: 32 }}
                  >
                    <XAxis type="number" reversed hide />
                    <YAxis type="category" dataKey="day" hide />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltip />} />
                    <Bar
                      dataKey="requests"
                      barSize={30}
                      fill="var(--primary-300)"
                      radius={4}
                      label={(props: Omit<BusyDayBarLabelProps, 'rows'>) => (
                        <BusyDayBarLabel {...props} rows={busiestWeekdaysData} />
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-background ring-0 lg:col-span-3">
          <CardHeader>
            <CardTitle>أوقات المداومة التي يكثر فيها الاستلام</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {attendanceDays.map((day) => {
                const isSelected = day === attendanceDay
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setAttendanceDay(day)}
                    className={`rounded-lg border px-3.5 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'border-transparent bg-primary-200 font-medium text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-background-2'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <p className="text-right text-sm text-muted-foreground">
              عدد الاستلامات الإجمالي:{' '}
              <span className="font-semibold text-foreground">{attendanceTotal}</span>
            </p>

            <div className="h-72 w-full rounded-xl bg-background">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                  >
                    <Cell fill="var(--primary-500)" />
                    <Cell fill="var(--primary-200)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[var(--primary-500)]" />
                قبل العصر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[var(--primary-200)]" />
                قبل الظهر
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-background ring-0 lg:col-span-5">
          <CardHeader>
            <CardTitle>الكتب الأكثر إعارة</CardTitle>
          </CardHeader>
          <CardContent>
            <BooksTable books={topBorrowedBooks} countHeader="عدد الإعارات" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
