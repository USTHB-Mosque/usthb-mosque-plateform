'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { BookOpen, Info, XCircle } from 'lucide-react'
import type { Loan } from '@/payload-types'
import { canMemberCancel } from '@/shared/lib/loan-gates'
import LoanStatusBadge, { getEffectiveLoanStatus } from './LoanStatusBadge'

interface LoanRequestDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  /** D6 (#153): second entry point to the same confirmation as the table menu. */
  onCancel?: (loan: Loan) => void
}

const LoanRequestDetailsDialog: React.FC<LoanRequestDetailsDialogProps> = ({
  open,
  onOpenChange,
  loan,
  onCancel,
}) => {
  const book = loan?.book as { title?: string; author?: string } | undefined
  const showCancel = Boolean(onCancel && loan && canMemberCancel(getEffectiveLoanStatus(loan)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">تفاصيل طلب الإعارة</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Book info */}
          {book && (
            <div className="flex items-center gap-3 rounded-lg border border-stroke-grey bg-background p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-main-15">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-card-foreground">{book.title}</p>
                {book.author && (
                  <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          {loan && (
            <div className="flex items-center justify-between rounded-lg border border-stroke-grey bg-background p-3">
              <span className="text-sm text-muted-foreground">حالة الطلب</span>
              <LoanStatusBadge loan={loan} />
            </div>
          )}

          {/* Info message */}
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              سيتم مراجعة طلبك من طرف الإدارة. ستتلقى إشعاراً فوراً عند اتخاذ قرار بقبول أو رفض
              طلبك.
            </p>
          </div>
        </div>

        <DialogFooter>
          {showCancel && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => loan && onCancel?.(loan)}
              className="font-alyamama"
            >
              <XCircle className="me-1 size-4" />
              إلغاء الطلب
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-alyamama">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LoanRequestDetailsDialog
