'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react'
import { ChevronRight, ChevronLeft, ChevronDown, RotateCcw } from 'lucide-react'
import { createPortal } from 'react-dom'
import { activitiesTypesConfig } from '@/utils/constants/activities'

const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
]

const GREGORIAN_MONTHS = [
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

const WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

// --- Hijri ↔ Gregorian conversion ---

function toJD(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function fromJD(jd: number): Date {
  const l = jd + 68569
  const n = Math.floor((4 * l) / 146097)
  const l2 = l - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor((4000 * (l2 + 1)) / 1461001)
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31
  const j = Math.floor((80 * l3) / 2447)
  const day = l3 - Math.floor((2447 * j) / 80)
  const l4 = Math.floor(j / 11)
  const month = j + 2 - 12 * l4
  const year = 100 * (n - 49) + i + l4
  return new Date(year, month - 1, day)
}

export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const jd = toJD(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor(
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238),
  )
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  return { year, month: month - 1, day }
}

function hijriToGregorian(year: number, month: number, day: number): Date {
  const m = month + 1
  const jd =
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * m -
    Math.floor((m - 1) / 2) +
    day +
    1948440 -
    385
  return fromJD(jd)
}

function getDaysInHijriMonth(year: number, month: number): number {
  const daysInMonth = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29]
  if (month === 11 && (11 * year + 14) % 30 < 11) return 30
  return daysInMonth[month] ?? 29
}

function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getGregorianFirstDayOfWeek(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 1) % 7
}

function getHijriFirstDayOfWeek(year: number, month: number): number {
  const firstDay = hijriToGregorian(year, month, 1)
  if (isNaN(firstDay.getTime())) return 0
  return (firstDay.getDay() + 1) % 7
}

// --- Component ---

type CalendarMode = 'hijri' | 'gregorian'

interface CalendarEvent {
  date: string
  label: string
  image?: string
  isRegistered?: boolean
  type?: string
  location?: string
}

interface HoveredDay {
  day: number
  events: CalendarEvent[]
  anchor: HTMLElement
}

interface CalendarWidgetProps {
  events?: CalendarEvent[]
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ events = [] }) => {
  const today = new Date()
  const hijriToday = gregorianToHijri(today)

  const [calendarMode, setCalendarMode] = useState<CalendarMode>('hijri')
  const [currentMonth, setCurrentMonth] = useState(hijriToday.month)
  const [currentYear, setCurrentYear] = useState(hijriToday.year)
  const [hoveredDay, setHoveredDay] = useState<HoveredDay | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const daysInMonth =
    calendarMode === 'hijri'
      ? getDaysInHijriMonth(currentYear, currentMonth)
      : getDaysInGregorianMonth(currentYear, currentMonth)

  const firstDay =
    calendarMode === 'hijri'
      ? getHijriFirstDayOfWeek(currentYear, currentMonth)
      : getGregorianFirstDayOfWeek(currentYear, currentMonth)

  const monthName =
    calendarMode === 'hijri' ? HIJRI_MONTHS[currentMonth] : GREGORIAN_MONTHS[currentMonth]

  const todayLabel =
    calendarMode === 'hijri'
      ? `${hijriToday.day} ${HIJRI_MONTHS[hijriToday.month]} ${hijriToday.year}`
      : `${today.getDate()} ${GREGORIAN_MONTHS[today.getMonth()]} ${today.getFullYear()}`

  const calendarDays = useMemo(() => {
    const cells: { day: number; prevMonth?: boolean; nextMonth?: boolean }[] = []

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const daysInPrevMonth =
      calendarMode === 'hijri'
        ? getDaysInHijriMonth(prevYear, prevMonth)
        : getDaysInGregorianMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, prevMonth: true })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i })
    }

    let nextDay = 1
    while (cells.length < 35) {
      cells.push({ day: nextDay++, nextMonth: true })
    }

    return cells
  }, [firstDay, daysInMonth, currentMonth, currentYear, calendarMode])

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goPrev = () => {
    goToPrevMonth()
  }

  const goNext = () => {
    goToNextMonth()
  }

  const goToToday = () => {
    if (calendarMode === 'hijri') {
      setCurrentMonth(hijriToday.month)
      setCurrentYear(hijriToday.year)
    } else {
      setCurrentMonth(today.getMonth())
      setCurrentYear(today.getFullYear())
    }
  }

  const isNavigatedAway =
    calendarMode === 'hijri'
      ? currentMonth !== hijriToday.month || currentYear !== hijriToday.year
      : currentMonth !== today.getMonth() || currentYear !== today.getFullYear()

  const cellDate = (idx: number) => new Date(currentYear, currentMonth, 1 - firstDay + idx)

  const isTodayCell = (idx: number) => {
    const date = cellDate(idx)
    if (calendarMode === 'hijri') {
      const h = gregorianToHijri(date)
      return h.day === hijriToday.day && h.month === hijriToday.month && h.year === hijriToday.year
    }
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  const getEventsForDay = (idx: number): CalendarEvent[] => {
    const date = cellDate(idx)
    return events.filter((e) => {
      if (!e.date) return false
      const eventDate = new Date(e.date)
      if (isNaN(eventDate.getTime())) return false
      if (calendarMode === 'hijri') {
        const eventHijri = gregorianToHijri(eventDate)
        const cellHijri = gregorianToHijri(date)
        return (
          eventHijri.day === cellHijri.day &&
          eventHijri.month === cellHijri.month &&
          eventHijri.year === cellHijri.year
        )
      }
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }

  const handleModeChange = (mode: CalendarMode) => {
    setCalendarMode(mode)
    if (mode === 'hijri') {
      setCurrentMonth(hijriToday.month)
      setCurrentYear(hijriToday.year)
    } else {
      setCurrentMonth(today.getMonth())
      setCurrentYear(today.getFullYear())
    }
  }

  const handleDayMouseEnter = useCallback(
    (day: number, dayEvents: CalendarEvent[], element: HTMLElement) => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      setHoveredDay({ day, events: dayEvents, anchor: element })
    },
    [],
  )

  const handleDayMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredDay(null), 100)
  }, [])

  return (
    <section className="w-full rounded-xl border border-border pt-[21px] px-[21px] pb-[21px]">
      <div className="mb-3.5 flex items-center justify-between self-stretch px-1">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm text-card-foreground">اليوم:</span>
          <span className="text-base font-semibold text-card-foreground">{todayLabel}</span>
          {isNavigatedAway && (
            <button
              onClick={goToToday}
              className="rounded-lg border border-border p-1 transition-colors hover:bg-primary/10 active:scale-95"
              aria-label="العودة لليوم"
            >
              <RotateCcw className="size-4 text-card-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={calendarMode}
              onChange={(e) => handleModeChange(e.target.value as CalendarMode)}
              className="appearance-none rounded-lg border border-border bg-transparent py-1 pl-6 pr-2 text-xs font-medium text-card-foreground cursor-pointer transition-colors hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="hijri">هجري</option>
              <option value="gregorian">ميلادي</option>
            </select>
            <ChevronDown className="pointer-events-none absolute left-1.5 top-1/2 size-3.5 -translate-y-1/2 text-card-foreground" />
          </div>
          <button
            onClick={goPrev}
            className="flex items-center rounded-lg p-1 transition-colors hover:bg-primary/10 active:scale-95"
            aria-label="السابق"
          >
            <ChevronRight className="size-4 text-card-foreground" />
          </button>
          <button
            onClick={goNext}
            className="flex items-center rounded-lg p-1 transition-colors hover:bg-primary/10 active:scale-95"
            aria-label="التالي"
          >
            <ChevronLeft className="size-4 text-card-foreground" />
          </button>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center rounded-lg border border-border py-2 text-xs text-card-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 pb-[1px] mb-10">
        {calendarDays.map((cell, idx) => {
          const todayCell = isTodayCell(idx)
          const dayEvents = getEventsForDay(idx)
          const hasActivity = dayEvents.length > 0
          const hasRegistered = dayEvents.some((e) => e.isRegistered)
          const showImage = hasRegistered && dayEvents[0]?.image

          return (
            <div
              key={idx}
              onMouseEnter={(e) => {
                if (hasActivity) {
                  handleDayMouseEnter(cell.day, dayEvents, e.currentTarget)
                }
              }}
              onMouseLeave={handleDayMouseLeave}
              className={`relative flex flex-col items-center justify-start rounded-[10px] py-3.5 ${
                todayCell
                  ? 'border border-primary bg-primary-main-30'
                  : cell.prevMonth || cell.nextMonth
                    ? 'bg-[#E2EFF7]/50'
                    : 'bg-[#E2EFF7]'
              } ${hasActivity ? 'cursor-pointer' : ''}`}
            >
              <span
                className={`text-xs ${cell.prevMonth || cell.nextMonth ? 'text-card-foreground/40' : 'text-card-foreground'}`}
              >
                {cell.day}
              </span>
              {showImage ? (
                <img
                  src={dayEvents[0].image}
                  alt=""
                  className="absolute bottom-1.5 left-1/2 size-3.5 -translate-x-1/2 rounded object-cover"
                />
              ) : hasActivity ? (
                <div className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#0099FF]" />
              ) : null}
            </div>
          )
        })}
      </div>

      {hoveredDay &&
        hoveredDay.events.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const event = hoveredDay.events[0]
            const typeLabel = event.type ? (activitiesTypesConfig[event.type] ?? event.type) : null
            const rect = hoveredDay.anchor.getBoundingClientRect()

            return (
              <div
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                }}
                onMouseLeave={handleDayMouseLeave}
                className="fixed z-[9999] w-[200px]"
                style={{
                  top: rect.bottom + 4,
                  left: rect.left + rect.width / 2,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="relative">
                  <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rotate-45">
                    <div className="h-2.5 w-2.5 border border-b-0 border-r-0 border-border bg-card" />
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
                    <div className="flex flex-col gap-1.5">
                      {typeLabel && (
                        <span className="inline-flex w-fit items-center rounded-full bg-primary-main-15 px-2 py-0.5 text-[10px] font-medium text-primary-300">
                          {typeLabel}
                        </span>
                      )}
                      <p className="text-sm font-semibold leading-tight text-card-foreground line-clamp-2">
                        {event.label}
                      </p>
                      {event.location && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })(),
          document.body,
        )}
    </section>
  )
}

export default CalendarWidget
