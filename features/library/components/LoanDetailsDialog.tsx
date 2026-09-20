'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { CalendarDays, ChevronRight, ChevronLeft, Clock, BookOpen, ArrowRightToLine, ArrowLeftFromLine } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Loan } from '@/payload-types'
import LoanStatusBadge, { getEffectiveLoanStatus } from './LoanStatusBadge'

interface LoanDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
}

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isDateInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

const LoanDetailsDialog: React.FC<LoanDetailsDialogProps> = ({
  open,
  onOpenChange,
  loan,
}) => {
  const loanDate = loan?.loanDate ? new Date(loan.loanDate) : null
  const dueDate = loan?.dueDate ? new Date(loan.dueDate) : null
  const returnDate = loan?.returnDate ? new Date(loan.returnDate) : null

  const displayDate = returnDate || dueDate

  const [viewDate, setViewDate] = useState(() => {
    if (loanDate) return new Date(loanDate.getFullYear(), loanDate.getMonth(), 1)
    return new Date()
  })

  const calendarYear = viewDate.getFullYear()
  const calendarMonth = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)

  const calendarDays = useMemo(() => {
    const cells: { day: number; date: Date; isCurrentMonth: boolean }[] = []

    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(prevYear, prevMonth, day)
      cells.push({ day, date, isCurrentMonth: false })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      cells.push({ day: i, date, isCurrentMonth: true })
    }

    let nextDay = 1
    while (cells.length < 35) {
      const date = new Date(calendarYear, calendarMonth + 1, nextDay)
      cells.push({ day: nextDay++, date, isCurrentMonth: false })
    }

    return cells
  }, [calendarYear, calendarMonth, daysInMonth, firstDay])

  const goToPrevMonth = () => {
    if (calendarMonth === 0) setViewDate(new Date(calendarYear - 1, 11, 1))
    else setViewDate(new Date(calendarYear, calendarMonth - 1, 1))
  }

  const goToNextMonth = () => {
    if (calendarMonth === 11) setViewDate(new Date(calendarYear + 1, 0, 1))
    else setViewDate(new Date(calendarYear, calendarMonth + 1, 1))
  }

  const effectiveStatus = loan ? getEffectiveLoanStatus(loan) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">تفاصيل الإعارة</DialogTitle>
          <DialogDescription className="font-alyamama text-sm">
            {(loan?.book as { title?: string } | undefined)?.title ?? 'تفاصيل الإعارة'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Status badge */}
          {loan && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">الحالة:</span>
              <LoanStatusBadge loan={loan} />
            </div>
          )}

          {/* Loan interval calendar */}
          {loanDate && dueDate && (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-3.5 text-primary" />
                فترة الإعارة
              </span>
              <div className="rounded-lg border border-stroke-grey bg-background p-3">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={goToPrevMonth} className="rounded p-1 hover:bg-muted">
                    <ChevronRight className="size-4" />
                  </button>
                  <span className="text-sm font-medium font-alyamama">
                    {MONTHS[calendarMonth]} {calendarYear}
                  </span>
                  <button type="button" onClick={goToNextMonth} className="rounded p-1 hover:bg-muted">
                    <ChevronLeft className="size-4" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    const isLoanStart = loanDate && isSameDay(cell.date, loanDate)
                    const isLoanEnd = dueDate && isSameDay(cell.date, dueDate)
                    const isReturnDay = returnDate && isSameDay(cell.date, returnDate)
                    const isInRange = loanDate && dueDate && isDateInRange(cell.date, loanDate, dueDate) && cell.isCurrentMonth

                    let bgClass = ''
                    if (isLoanStart) bgClass = 'bg-primary text-primary-foreground font-bold'
                    else if (isLoanEnd) bgClass = 'bg-[#FFB020] text-white font-bold'
                    else if (isReturnDay) bgClass = 'bg-[#0DE9C3] text-secondary font-bold'
                    else if (isInRange) bgClass = 'bg-primary/15 text-primary-300'
                    else bgClass = cell.isCurrentMonth ? 'text-card-foreground' : 'text-muted-foreground/30'

                    return (
                      <div
                        key={idx}
                        className={`h-8 w-full rounded text-center text-xs font-medium leading-8 transition-all ${bgClass}`}
                      >
                        {cell.day}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-primary" />
                    بداية الإعارة
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-[#FFB020]" />
                    موعد الإرجاع
                  </span>
                  {returnDate && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-2 rounded-full bg-[#0DE9C3]" />
                      تاريخ الإرجاع الفعلي
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loan info rows */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-stroke-grey bg-background p-3">
            <div className="flex items-center gap-2">
              <ArrowRightToLine className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">تاريخ الإعارة</span>
              <span className="me-auto text-xs font-medium text-card-foreground">
                {loanDate ? format(loanDate, 'd MMM yyyy', { locale: arDZ }) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#FFB020]" />
              <span className="text-xs text-muted-foreground">موعد الإرجاع</span>
              <span className="me-auto text-xs font-medium text-card-foreground">
                {dueDate ? format(dueDate, 'd MMM yyyy', { locale: arDZ }) : '—'}
              </span>
            </div>
            {returnDate && (
              <div className="flex items-center gap-2">
                <ArrowLeftFromLine className="size-4 text-[#0DE9C3]" />
                <span className="text-xs text-muted-foreground">تم الإرجاع</span>
                <span className="me-auto text-xs font-medium text-card-foreground">
                  {format(returnDate, 'd MMM yyyy', { locale: arDZ })}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-alyamama"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LoanDetailsDialog
