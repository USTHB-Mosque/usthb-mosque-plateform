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
import { ArrowRightToLine, Clock, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Loan } from '@/payload-types'
import LoanStatusBadge, { getEffectiveLoanStatus } from './LoanStatusBadge'
import { toast } from 'sonner'

interface LoanStatusDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  onCancel?: (loan: Loan) => void
}

const LoanStatusDetailsDialog: React.FC<LoanStatusDetailsDialogProps> = ({
  open,
  onOpenChange,
  loan,
  onCancel,
}) => {
  const [cancelling, setCancelling] = useState(false)
  const book = loan?.book as { title?: string; author?: string } | undefined
  const loanDate = loan?.loanDate ? new Date(loan.loanDate) : null
  const dueDate = loan?.dueDate ? new Date(loan.dueDate) : null

  const handleCancel = async () => {
    if (!loan || !onCancel) return
    setCancelling(true)
    onCancel(loan)
    setCancelling(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">تفاصيل طلب الإعارة</DialogTitle>
          <DialogDescription className="font-alyamama text-sm">
            {book?.title ?? 'تفاصيل الطلب'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {book?.author && (
            <div className="flex items-center justify-between rounded-lg border border-stroke-grey bg-background px-3 py-2.5">
              <span className="text-xs text-muted-foreground">المؤلف</span>
              <span className="text-xs font-medium text-card-foreground">{book.author}</span>
            </div>
          )}

          {loan && (
            <div className="flex items-center justify-between rounded-lg border border-stroke-grey bg-background px-3 py-2.5">
              <span className="text-xs text-muted-foreground">الحالة</span>
              <LoanStatusBadge loan={loan} />
            </div>
          )}

          {loanDate && (
            <div className="flex items-center justify-between rounded-lg border border-stroke-grey bg-background px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <ArrowRightToLine className="size-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">تاريخ الإعارة</span>
              </div>
              <span className="text-xs font-medium text-card-foreground">
                {format(loanDate, 'd MMM yyyy', { locale: arDZ })}
              </span>
            </div>
          )}

          {dueDate && (
            <div className="flex items-center justify-between rounded-lg border border-stroke-grey bg-background px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-[#FFB020]" />
                <span className="text-xs text-muted-foreground">موعد الإرجاع</span>
              </div>
              <span className="text-xs font-medium text-card-foreground">
                {format(dueDate, 'd MMM yyyy', { locale: arDZ })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-alyamama">
            إغلاق
          </Button>
          {onCancel && (!loan || getEffectiveLoanStatus(loan) !== 'returned') && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
              className="font-alyamama"
            >
              {cancelling ? (
                <>
                  <Loader2 className="me-1 size-4 animate-spin" />
                  جاري...
                </>
              ) : (
                <>
                  <XCircle className="me-1 size-4" />
                  إلغاء الطلب
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LoanStatusDetailsDialog
