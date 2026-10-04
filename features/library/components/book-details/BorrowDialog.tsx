'use client'

import React, { useState } from 'react'
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
import { Loader2, CalendarDays, Clock } from 'lucide-react'
import { PICKUP_TIME_SLOTS, pickupDayOptions } from './pickup-days'

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

const PICKUP_DAY_LABELS: Record<number, string> = {
  0: 'اليوم',
  1: 'غداً',
  2: 'بعد غد',
}

const TIME_SLOT_LABELS: Record<string, string> = {
  '11:00': 'من 11 صباحاً إلى الظهر',
  '13:00': 'من الظهر إلى العصر',
}

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

const BorrowDialog: React.FC<BorrowDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  bookTitle,
}) => {
  const [periodDays, setPeriodDays] = useState(14)
  const [timeSlot, setTimeSlot] = useState('13:00')
  const [pickupOptions] = useState(() => pickupDayOptions(new Date()))
  // Default to the first day that is not today. Today is offered, not
  // assumed: being asked to collect within the hour is a decision the member
  // makes, not one the dialog makes for them.
  const [selectedOffset, setSelectedOffset] = useState(
    pickupOptions.find((opt) => opt.offset !== 0)?.offset ?? pickupOptions[0]?.offset ?? 0,
  )

  const selected = pickupOptions.find((opt) => opt.offset === selectedOffset) ?? pickupOptions[0]
  const selectedDate = selected?.date
  // The remembered hour can be one today no longer offers; fall back to the
  // first that is left rather than sending a time that has passed.
  const activeSlot = selected?.slots.includes(timeSlot) ? timeSlot : selected?.slots[0]

  const handleConfirm = () => {
    if (!selectedDate || !activeSlot) return

    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + periodDays)

    const pickupDate = new Date(selectedDate)
    const [h, m] = activeSlot.split(':').map(Number)
    pickupDate.setHours(h, m, 0, 0)

    onConfirm({
      dueDate: dueDate.toISOString(),
      pickupDate: pickupDate.toISOString(),
    })
  }

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

          {/* Pickup day — the open days a window can actually reach */}
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              تاريخ الاستلام
            </Label>
            <div className="flex gap-2">
              {pickupOptions.map((opt) => (
                <button
                  key={opt.offset}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedOffset(opt.offset)}
                  className={`flex-1 rounded-lg border px-3 py-2 transition-all ${
                    selectedOffset === opt.offset
                      ? 'border-primary bg-primary/10'
                      : 'border-stroke-grey bg-background hover:border-primary/40'
                  }`}
                >
                  <span
                    className={`block font-alyamama text-sm font-medium ${
                      selectedOffset === opt.offset ? 'text-primary-300' : 'text-muted-foreground'
                    }`}
                  >
                    {PICKUP_DAY_LABELS[opt.offset]}
                  </span>
                  <span className="block font-alyamama text-xs text-muted-foreground">
                    {WEEKDAYS[opt.date.getDay()]} {opt.date.getDate()} {MONTHS[opt.date.getMonth()]}
                  </span>
                </button>
              ))}
            </div>
            <p className="font-alyamama text-xs text-muted-foreground">
              المعروض ضمن 48 ساعة من قبول الطلب. الجمعة مغلقة، وأوقات اليوم المنقضية لا تُعرض.
            </p>
          </div>

          {/* Pickup time slot */}
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              وقت الاستلام
            </Label>
            <div className="flex gap-2">
              {PICKUP_TIME_SLOTS.map((slot) => {
                const offered = selected?.slots.includes(slot) ?? false
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isLoading || !offered}
                    onClick={() => setTimeSlot(slot)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-alyamama transition-all ${
                      activeSlot === slot
                        ? 'border-primary bg-primary/10 text-primary-300 font-medium'
                        : offered
                          ? 'border-stroke-grey bg-background hover:border-primary/40 text-muted-foreground'
                          : 'border-stroke-grey bg-background text-muted-foreground/30 cursor-not-allowed'
                    }`}
                  >
                    {TIME_SLOT_LABELS[slot]}
                  </button>
                )
              })}
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
            disabled={isLoading || !selectedDate || !activeSlot}
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
