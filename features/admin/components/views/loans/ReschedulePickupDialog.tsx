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
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { CalendarClock, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Loan } from '@/payload-types'

interface ReschedulePickupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  busy?: boolean
  /** `pickupDate` as an ISO instant, built by the caller from date + hour. */
  onConfirm: (pickupDate: string) => void
}

/**
 * D1 (#153): rescheduling a collection is unlimited, so this dialog asks only
 * for the new slot. The server — not this form — re-opens the Pickup Window
 * from the moment of the reschedule, using the Settings window, so the form
 * cannot promise a deadline the backend will not honour.
 *
 * Mounted only while a loan is selected, so the slot seeds itself once from
 * that loan rather than being pushed in by an effect.
 */
const ReschedulePickupDialog: React.FC<ReschedulePickupDialogProps> = ({
  open,
  onOpenChange,
  loan,
  busy = false,
  onConfirm,
}) => {
  const [date, setDate] = useState(() =>
    loan?.pickupDate ? format(new Date(loan.pickupDate), 'yyyy-MM-dd') : '',
  )
  const [hour, setHour] = useState(() => loan?.pickupHour || '09:00')

  const ready = Boolean(date && hour && loan)

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>إعادة جدولة الاستلام</DialogTitle>
          <DialogDescription>
            اختر موعداً جديداً لأخذ الكتاب. تُفتح نافذة استلام جديدة من لحظة إعادة الجدولة، ولا
            تُحتسب إعادة الجدولة غياباً.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-date">تاريخ الاستلام الجديد *</Label>
            <Input
              id="reschedule-date"
              type="date"
              dir="ltr"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-hour">الساعة *</Label>
            <Input
              id="reschedule-hour"
              type="time"
              dir="ltr"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            disabled={busy || !ready}
            className="gap-2"
            onClick={() => {
              if (!ready || !loan) return
              onConfirm(new Date(`${date}T${hour}:00`).toISOString())
            }}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarClock className="size-4" />
            )}
            إعادة الجدولة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReschedulePickupDialog
