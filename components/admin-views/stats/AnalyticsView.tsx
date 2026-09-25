'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { BookOpen, TrendingUp, Layers, Type } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { toast } from 'sonner'
import { bookCategoriesConfig, bookTypesConfig } from '@/utils/constants/books'
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

function dayLabel(value: string | number | Date): string {
  return format(new Date(value), 'd MMM', { locale: arDZ })
}

interface AnalyticsViewProps {
  initial: AnalyticsResult
}

export default function AnalyticsView({ initial }: AnalyticsViewProps) {
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<AnalyticsResult>(initial)
  const [period, setPeriod] = useState(periodOptions[0])

  const changePeriod = (option: (typeof periodOptions)[number]) => {
    setPeriod(option)
    const from = resolveFrom(option.months, Boolean(option.startOfYear))
    startTransition(async () => {
      const result = await getAdminAnalytics({ from: from.toISOString() })
      setData(result)
    })
  }

  const chartData = data.busiestDays.map((day) => ({
    day: dayLabel(day.day),
    requests: day.requests,
  }))

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl">
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
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary-300" />
              الأصناف الأكثر قراءة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.topCategories.map((item) => (
                  <li
                    key={item.category ?? 'none'}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{labelOf(item.category, bookCategoriesConfig)}</span>
                    <Badge variant="secondary">{item.requests} طلباً</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="size-4 text-primary-300" />
              أنواع الكتب الشرعية الأكثر قراءة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topTypes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.topTypes.map((item) => (
                  <li
                    key={item.type ?? 'none'}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{labelOf(item.type, bookTypesConfig)}</span>
                    <Badge variant="secondary">{item.requests} طلباً</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-primary-300" />
            الكتب الأكثر طلباً
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topRequestedBooks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.topRequestedBooks.map((book) => (
                <div
                  key={book.bookId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">«{book.title}»</p>
                    <p className="text-xs text-muted-foreground">
                      {book.author}
                      {book.publisher ? ` · ${book.publisher}` : ''}
                      {book.category ? ` · ${labelOf(book.category, bookCategoriesConfig)}` : ''}
                    </p>
                  </div>
                  <Badge>{book.requests} طلباً</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary-300" />
            الأيام التي تكثر فيها طلبات الإعارة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} reversed />
                  <YAxis allowDecimals={false} fontSize={10} width={28} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value) => [`${value} طلباً`, 'الطلبات']}
                  />
                  <Bar dataKey="requests" fill="var(--primary-300)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
