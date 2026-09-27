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
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import { Loader2 } from 'lucide-react'

interface RejectLoanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemLabel: string
  busy?: boolean
  onConfirm: (reason?: string) => void
  // Overridable so a caller can frame the same transition as a cancellation
  // (an accepted loan the member never collects) rather than a rejection.
  title?: string
  description?: string
  confirmLabel?: string
  placeholder?: string
}

const RejectLoanDialog: React.FC<RejectLoanDialogProps> = ({
  open,
  onOpenChange,
  itemLabel,
  busy = false,
  onConfirm,
  title = 'رفض طلب الإعارة',
  description = `سيتم رفض ${itemLabel}. يمكنك إضافة سبب يظهر للمستفيد في سجلّ إعاراته.`,
  confirmLabel = 'تأكيد الرفض',
  placeholder = 'اكتب سبب الرفض هنا ...',
}) => {
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>السبب (اختياري)</Label>
          <Textarea
            dir="rtl"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            تراجع
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            className="gap-2"
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RejectLoanDialog
