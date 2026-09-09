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
  const [pickupDatetime, setPickupDatetime] = useState(() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return toLocalDatetimeString(now)
  })

  const minPickup = toLocalDatetimeString(new Date())

  const handleConfirm = () => {
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + periodDays)

    onConfirm({
      dueDate: dueDate.toISOString(),
      pickupDate: new Date(pickupDatetime).toISOString(),
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

          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              وقت الاستلام
            </Label>
            <input
              type="datetime-local"
              value={pickupDatetime}
              min={minPickup}
              disabled={isLoading}
              onChange={(e) => setPickupDatetime(e.target.value)}
              className="w-full rounded-lg border border-stroke-grey bg-background px-3 py-2.5 text-sm font-alyamama text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              dir="rtl"
            />
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
            disabled={isLoading || !pickupDatetime}
            className="font-alyamama bg-primary text-secondary hover:bg-primary/90 shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جاري...
              </>
            ) : (
              'تأكيد الإعارة'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BorrowDialog
