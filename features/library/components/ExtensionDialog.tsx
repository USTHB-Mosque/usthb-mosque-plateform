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
import { Loader2, Clock } from 'lucide-react'

interface ExtensionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (days: number) => void
  isLoading?: boolean
  bookTitle?: string
}

const extensionOptions = [
  { label: '7 أيام', days: 7 },
  { label: '14 يوماً', days: 14 },
  { label: '21 يوماً', days: 21 },
]

const ExtensionDialog: React.FC<ExtensionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  bookTitle,
}) => {
  const [selectedDays, setSelectedDays] = useState(7)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">طلب تمديد الإعارة</DialogTitle>
          <DialogDescription className="font-alyamama text-sm">
            {bookTitle ? `تمديد إعارة: ${bookTitle}` : 'اختر مدة التمديد'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="font-alyamama text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              مدة التمديد
            </Label>
            <div className="flex gap-2">
              {extensionOptions.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedDays(opt.days)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-alyamama transition-all ${
                    selectedDays === opt.days
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
            onClick={() => onConfirm(selectedDays)}
            disabled={isLoading}
            className="font-alyamama bg-primary text-secondary hover:bg-primary/90 shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جاري...
              </>
            ) : (
              'تأكيد التمديد'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExtensionDialog
