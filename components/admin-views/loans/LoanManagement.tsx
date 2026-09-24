'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { CheckCircle2, XCircle, RotateCcw, Clock, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Loan, Book, User as UserType } from '@/payload-types'
import { approveLoan, rejectLoan, markLoanReturned } from '@/features/admin/server/loans'
import { toast } from 'sonner'
import { getImageUrl } from '@/shared/lib/image-utils'

interface LoanManagementProps {
  loans: Loan[]
  mode: 'pending' | 'active' | 'overdue'
}

const LoanManagement: React.FC<LoanManagementProps> = ({ loans, mode }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleApprove = (loanId: number) => {
    startTransition(async () => {
      await approveLoan(loanId)
      toast.success('تم قبول طلب الإعارة')
      router.refresh()
    })
  }

  const handleReject = (loanId: number) => {
    startTransition(async () => {
      await rejectLoan(loanId)
      toast.success('تم رفض طلب الإعارة')
      router.refresh()
    })
  }

  const handleReturn = (loanId: number) => {
    startTransition(async () => {
      await markLoanReturned(loanId)
      toast.success('تم تأكيد الإرجاع')
      router.refresh()
    })
  }

  const titles = {
    pending: 'طلبات الإعارة المعلقة',
    active: 'الإعارات النشطة',
    overdue: 'الإعارات المتأخرة',
  }

  return (
    <div className="flex flex-col gap-6">
      {loans.length === 0 ? (
        <Card className="ring-0 border border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <BookOpen className="size-10 opacity-40" />
              <p className="text-sm">
                {mode === 'pending'
                  ? 'لا توجد طلبات معلقة'
                  : mode === 'active'
                    ? 'لا توجد إعارات نشطة'
                    : 'لا توجد إعارات متأخرة'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {loans.map((loan) => {
            const book = loan.book as Book | undefined
            const user = loan.user as UserType | undefined
            const cover = book?.image as { url?: string } | undefined
            const displayName =
              user?.fullName ||
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.email

            return (
              <Card key={loan.id} className="ring-0 border border-border">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {cover?.url ? (
                      <Image
                        src={getImageUrl(cover.url)}
                        alt={book?.title || 'غلاف الكتاب'}
                        width={48}
                        height={64}
                        className="h-16 w-12 shrink-0 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                        <BookOpen className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{book?.title || 'كتاب'}</p>
                      <p className="truncate text-sm text-muted-foreground">{displayName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          {loan.loanDate
                            ? format(new Date(loan.loanDate), 'd MMM', { locale: arDZ })
                            : '—'}
                          {' ← '}
                          {loan.dueDate
                            ? format(new Date(loan.dueDate), 'd MMM yyyy', { locale: arDZ })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {mode === 'pending' && (
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        disabled={pending}
                        className="bg-[#0DE9C3] text-secondary hover:bg-[#0DE9C3]/90"
                        onClick={() => handleApprove(loan.id)}
                      >
                        <CheckCircle2 className="me-1 size-4" />
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => handleReject(loan.id)}
                      >
                        <XCircle className="me-1 size-4" />
                        رفض
                      </Button>
                    </div>
                  )}

                  {(mode === 'active' || mode === 'overdue') && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleReturn(loan.id)}
                    >
                      <RotateCcw className="me-1 size-4" />
                      تأكيد الإرجاع
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LoanManagement
