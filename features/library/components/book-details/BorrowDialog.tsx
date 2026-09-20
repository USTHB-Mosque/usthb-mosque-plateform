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
import { Label } from '@/shared/ui/label'
import { Loader2, CalendarDays, Clock, ChevronRight, ChevronLeft } from 'lucide-react'

interface BorrowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: { dueDate: string; pickupDate: string }) => void
  isLoading?: boolean
  bookTitle?: string
}

const periodOptions = [
  { label: '7 أيام', days: 7 },
  { label: '14 يوماً', days: 14 },
  { label: '21 يوماً', days: 21 },
]

const timeSlotOptions = [
  { label: 'من 11 صباحاً إلى الظهر', value: '11:00' },
  { label: 'من الظهر إلى العصر', value: '13:00' },
]

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const MONTHS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

const BorrowDialog: React.FC<BorrowDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  bookTitle,
}) => {
  const [periodDays, setPeriodDays] = useState(14)
  const [timeSlot, setTimeSlot] = useState('13:00')
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 5) d.setDate(d.getDate() + 1)
    return d
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const calendarYear = selectedDate.getFullYear()
  const calendarMonth = selectedDate.getMonth()

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)

  const calendarDays = useMemo(() => {
    const cells: {
      day: number
      date: Date
      isCurrentMonth: boolean
      isFriday: boolean
      isPast: boolean
    }[] = []

    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(prevYear, prevMonth, day)
      cells.push({
        day,
        date,
        isCurrentMonth: false,
        isFriday: date.getDay() === 5,
        isPast: date < today,
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      cells.push({
        day: i,
        date,
        isCurrentMonth: true,
        isFriday: date.getDay() === 5,
        isPast: date < today,
      })
    }

    let nextDay = 1
    while (cells.length < 35) {
      const date = new Date(calendarYear, calendarMonth + 1, nextDay)
      cells.push({
        day: nextDay++,
        date,
        isCurrentMonth: false,
        isFriday: date.getDay() === 5,
        isPast: date < today,
      })
    }

    return cells
  }, [calendarYear, calendarMonth, daysInMonth, firstDay, today])

  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setSelectedDate(new Date(calendarYear - 1, 11, 1))
    } else {
      setSelectedDate(new Date(calendarYear, calendarMonth - 1, 1))
    }
  }

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setSelectedDate(new Date(calendarYear + 1, 0, 1))
    } else {
      setSelectedDate(new Date(calendarYear, calendarMonth + 1, 1))
    }
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const handleConfirm = () => {
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + periodDays)

    const pickupDate = new Date(selectedDate)
    const [h, m] = timeSlot.split(':').map(Number)
    pickupDate.setHours(h, m, 0, 0)

    onConfirm({
      dueDate: dueDate.toISOString(),
      pickupDate: pickupDate.toISOString(),
    })
  }

  const selectedTimeLabel = timeSlotOptions.find((t) => t.value === timeSlot)?.label ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">طلب إعارة</DialogTitle>
          <DialogDescription className="font-alyamama text-sm">
            {bookTitle ? `إعارة: ${bookTitle}` : 'اختر مدة الإعارة ووقت الاستلام'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Loan period */}
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              مدة الإعارة
            </Label>
            <div className="flex gap-2">
              {periodOptions.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setPeriodDays(opt.days)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-alyamama transition-all ${
                    periodDays === opt.days
                      ? 'border-primary bg-primary/10 text-primary-300 font-medium'
                      : 'border-stroke-grey bg-background hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup date - mini calendar */}
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              تاريخ الاستلام
            </Label>
            <div className="rounded-lg border border-stroke-grey bg-background p-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronRight className="size-4" />
                </button>
                <span className="text-sm font-medium font-alyamama">
                  {MONTHS[calendarMonth]} {calendarYear}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-medium text-muted-foreground py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const isSelected = isSameDay(cell.date, selectedDate)
                  const isDisabled = cell.isFriday || cell.isPast || !cell.isCurrentMonth

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`h-8 w-full rounded text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isDisabled
                            ? 'text-muted-foreground/30 cursor-not-allowed'
                            : cell.isFriday
                              ? 'text-destructive/50 cursor-not-allowed'
                              : 'hover:bg-primary/10 text-card-foreground'
                      }`}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Pickup time slot */}
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              وقت الاستلام
            </Label>
            <div className="flex gap-2">
              {timeSlotOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setTimeSlot(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-alyamama transition-all ${
                    timeSlot === opt.value
                      ? 'border-primary bg-primary/10 text-primary-300 font-medium'
                      : 'border-stroke-grey bg-background hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="font-alyamama"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedDate || !timeSlot}
            className="font-alyamama bg-primary text-secondary hover:bg-primary/90 shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جاري...
              </>
            ) : (
              'تأكيد الطلب'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BorrowDialog
