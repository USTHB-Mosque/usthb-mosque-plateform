'use client'

import React, { useState, useTransition } from 'react'
import { Check, MoreVertical, RotateCcw, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Loan, Book, User } from '@/payload-types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { LoanStatusBadge, LoanDetailsDialog } from '@/features/library'
import { approveLoan, rejectLoan, markLoanReturned } from '@/features/admin/server/loans'
import type { LoanStatus } from '@/utils/constants/loans'

type LoansTableProps = {
  loans: Loan[]
  activeStatus: LoanStatus
}

function getDisplayName(user: User | undefined): string {
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: arDZ })
}

const LoansTable: React.FC<LoansTableProps> = ({ loans, activeStatus }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const openDetails = (loan: Loan) => {
    setDetailsLoan(loan)
    setDetailsOpen(true)
  }

  const handleApprove = (loanId: number) => {
    startTransition(async () => {
      const result = await approveLoan(loanId)
      if (result.ok) {
        toast.success('تم قبول طلب الإعارة')
      } else {
        toast.error(result.error || 'تعذر قبول الطلب')
      }
      router.refresh()
    })
  }

  const handleReject = (loanId: number) => {
    startTransition(async () => {
      const result = await rejectLoan(loanId)
      if (result.ok) {
        toast.success('تم رفض طلب الإعارة')
      } else {
        toast.error(result.error || 'تعذر رفض الطلب')
      }
      router.refresh()
    })
  }

  const handleReturn = (loanId: number) => {
    startTransition(async () => {
      const result = await markLoanReturned(loanId)
      if (result.ok) {
        toast.success('تم تأكيد الإرجاع')
      } else {
        toast.error(result.error || 'تعذر تأكيد الإرجاع')
      }
      router.refresh()
    })
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستفيد</TableHead>
            <TableHead>الكتاب</TableHead>
            <TableHead>الرمز</TableHead>
            <TableHead>حالة الكتاب</TableHead>
            <TableHead>تاريخ أخذ الكتاب</TableHead>
            <TableHead>تاريخ الإرجاع</TableHead>
            <TableHead>حالة الإعارة</TableHead>
            {activeStatus === 'refused' ? <TableHead>السبب</TableHead> : null}
            <TableHead className="w-10 text-end">
              <span className="sr-only">إجراءات</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => {
            const book = loan.book as Book | undefined
            const user = loan.user as User | undefined
            const available = (book?.availableBooks ?? 0) > 0

            return (
              <TableRow key={loan.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getDisplayName(user)}</p>
                    {user?.email ? (
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="min-w-40">
                  <p className="truncate font-medium">{book?.title || '—'}</p>
                  {book?.author ? (
                    <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{book?.code || '—'}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      available
                        ? 'bg-[#00FF92] text-[#243245] rounded-lg'
                        : 'bg-muted text-muted-foreground rounded-lg'
                    }
                  >
                    {available ? 'متوفر' : 'غير متوفر'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.pickupDate
                    ? `${formatDate(loan.pickupDate)}${
                        loan.pickupHour ? ` — ${loan.pickupHour}` : ''
                      }`
                    : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.status === 'returned'
                    ? formatDate(loan.returnDate)
                    : formatDate(loan.dueDate)}
                </TableCell>

                {activeStatus === 'pending' ? (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="قبول الطلب"
                        aria-label={`قبول طلب ${getDisplayName(user)}`}
                        disabled={pending}
                        onClick={() => handleApprove(loan.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-[#00FF92]/10 text-emerald-600 transition-colors hover:bg-[#00FF92]/20 disabled:opacity-50"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="رفض الطلب"
                        aria-label={`رفض طلب ${getDisplayName(user)}`}
                        disabled={pending}
                        onClick={() => handleReject(loan.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                ) : (
                  <TableCell>
                    <LoanStatusBadge loan={loan} />
                  </TableCell>
                )}

                {activeStatus === 'refused' ? (
                  <TableCell className="max-w-48 text-muted-foreground">
                    <span className="line-clamp-2">{loan.refusalReason || '—'}</span>
                  </TableCell>
                ) : null}

                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`إجراءات إعارة ${getDisplayName(user)}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">فتح قائمة الإجراءات</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                      <DropdownMenuLabel>الإعارة</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openDetails(loan)}>
                        <Eye className="size-4" />
                        تفاصيل الإعارة
                      </DropdownMenuItem>
                      {activeStatus === 'pending' ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleApprove(loan.id)}
                            disabled={pending}
                          >
                            <Check className="size-4" />
                            قبول الطلب
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleReject(loan.id)}
                            disabled={pending}
                          >
                            <X className="size-4" />
                            رفض الطلب
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {activeStatus === 'picked_up' ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleReturn(loan.id)}
                            disabled={pending}
                          >
                            <RotateCcw className="size-4" />
                            تأكيد الإرجاع
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <LoanDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} loan={detailsLoan} />
    </div>
  )
}

export default LoansTable
