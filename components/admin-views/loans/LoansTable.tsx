'use client'

import React, { useState, useTransition } from 'react'
import {
  Ban,
  Bell,
  Check,
  Eye,
  Minus,
  MoreVertical,
  PackageCheck,
  RotateCcw,
  X,
} from 'lucide-react'
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import BulkActionsBar, { type BulkAction } from '@/shared/common/BulkActionsBar'
import { cn } from '@/shared/lib/utils'
import { LoanStatusBadge, LoanDetailsDialog } from '@/features/library'
import {
  approveLoan,
  markLoanPickedUp,
  markLoanReturned,
  rejectLoan,
  sendLoanReminder,
} from '@/features/admin/server/loans'
import { adminLoansKeys } from '@/features/admin/api/loans.queries'
import { booksKeys } from '@/features/library/api/books.queries'
import { useQueryClient } from '@tanstack/react-query'
import type { LoanStatus } from '@/utils/constants/loans'
import LoanConfirmDialog from './LoanConfirmDialog'
import RejectLoanDialog from './RejectLoanDialog'

type LoansTableProps = {
  loans: Loan[]
  activeStatus: LoanStatus
}

type LoanBulkAction = 'approve' | 'pickup' | 'return' | 'reminder'

type BulkActionResult = { ok: boolean; error?: string }

function getDisplayName(user: User | undefined): string {
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: arDZ })
}

function plural(count: number, one: string, two: string, many: string): string {
  if (count <= 2) return count === 1 ? one : two
  return many
}

function TableCheckbox({
  checked,
  partial = false,
  label,
  onChange,
}: {
  checked: boolean
  partial?: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
        checked || partial
          ? 'border-primary-200 bg-primary-200 text-[#243245]'
          : 'border-muted bg-card hover:border-primary-200',
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : partial ? <Minus className="h-3 w-3" /> : null}
    </button>
  )
}

const LoansTable: React.FC<LoansTableProps> = ({ loans, activeStatus }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirm, setConfirm] = useState<{
    action: LoanBulkAction
    loanIds: number[]
    loanLabel?: string
  } | null>(null)
  const [reject, setReject] = useState<{ loanIds: number[]; loanLabel: string } | null>(null)

  const loanIds = loans.map((l) => l.id)
  const allSelected = loanIds.length > 0 && loanIds.every((id) => selected.has(id))
  const someSelected = !allSelected && selected.size > 0

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(loanIds))
  }

  const labeled = (loanIds: number[]) => {
    if (loanIds.length === 1) {
      const loan = loans.find((l) => l.id === loanIds[0])
      return getDisplayName(loan?.user as User | undefined)
    }
    return `${loanIds.length} ${plural(loanIds.length, 'إعارة', 'إعارتين', 'إعارات')}`
  }

  const openConfirm = (action: LoanBulkAction, loanIds: number[]) => {
    setConfirm({ action, loanIds, loanLabel: labeled(loanIds) })
  }

  const openReject = (loanIds: number[]) => {
    setReject({ loanIds, loanLabel: labeled(loanIds) })
  }

  const confirmContent: Record<
    LoanBulkAction,
    {
      title: string
      description: string
      confirmLabel: string
      success: string
      run: (id: number) => Promise<BulkActionResult>
    }
  > = {
    approve: {
      title: 'قبول طلب الإعارة',
      description: 'سيتم قبول الطلب وإنشاء رمز الاستلام وإخطار المستفيد.',
      confirmLabel: 'قبول الطلب',
      success: 'تم قبول الطلب',
      run: approveLoan,
    },
    pickup: {
      title: 'تسجيل أخذ الكتاب',
      description: 'سيتم تسجيل أخذ الكتاب وحساب تاريخ الإرجاع ابتداءً من اليوم.',
      confirmLabel: 'تسجيل الأخذ',
      success: 'تم تسجيل أخذ الكتاب',
      run: markLoanPickedUp,
    },
    return: {
      title: 'تأكيد إرجاع الكتاب',
      description: 'سيتم تأكيد إرجاع الكتاب وإعادة النسخة إلى المخزون.',
      confirmLabel: 'تأكيد الإرجاع',
      success: 'تم تأكيد الإرجاع',
      run: markLoanReturned,
    },
    reminder: {
      title: 'إرسال تذكير',
      description: 'سيتم إرسال إشعار وبريد إلكتروني لتذكير المستفيد.',
      confirmLabel: 'إرسال التذكير',
      success: 'تم إرسال التذكير',
      run: sendLoanReminder,
    },
  }

  const runLoansAction = async (action: LoanBulkAction, ids: number[]) => {
    const { run, success } = confirmContent[action]
    let done = 0
    for (const id of ids) {
      const result = await run(id)
      if (result.ok) done++
      else toast.error(result.error || 'تعذر تنفيذ الإجراء')
    }
    setConfirm(null)
    setSelected(new Set())
    if (done > 0) {
      toast.success(`${success} — ${done} ${plural(done, 'إعارة', 'إعارتين', 'إعارات')}`)
      queryClient.invalidateQueries({ queryKey: adminLoansKeys.root })
      if (action === 'pickup' || action === 'return') {
        queryClient.invalidateQueries({ queryKey: booksKeys.root })
      }
      router.refresh()
    }
  }

  const handleReject = async (ids: number[], reason?: string) => {
    let done = 0
    for (const id of ids) {
      const result = await rejectLoan(id, reason)
      if (result.ok) done++
      else toast.error(result.error || 'تعذر رفض الطلب')
    }
    setReject(null)
    setSelected(new Set())
    if (done > 0) {
      toast.success(`تم الرفض — ${done} ${plural(done, 'إعارة', 'إعارتين', 'إعارات')}`)
      queryClient.invalidateQueries({ queryKey: adminLoansKeys.root })
      router.refresh()
    }
  }

  const openDetails = (loan: Loan) => {
    setDetailsLoan(loan)
    setDetailsOpen(true)
  }

  const bulkActions: BulkAction[] = (() => {
    if (activeStatus === 'pending') {
      return [
        {
          label: 'قبول المحددين',
          icon: Check,
          onClick: () => openConfirm('approve', Array.from(selected)),
        },
        {
          label: 'رفض المحددين',
          icon: X,
          variant: 'destructive',
          onClick: () => openReject(Array.from(selected)),
        },
      ]
    }
    if (activeStatus === 'accepted') {
      return [
        {
          label: 'تسجيل الأخذ',
          icon: PackageCheck,
          onClick: () => openConfirm('pickup', Array.from(selected)),
        },
        {
          label: 'إلغاء الإعارة',
          icon: Ban,
          variant: 'destructive',
          onClick: () => openReject(Array.from(selected)),
        },
      ]
    }
    if (activeStatus === 'picked_up') {
      return [
        {
          label: 'تسجيل الإرجاع',
          icon: RotateCcw,
          onClick: () => openConfirm('return', Array.from(selected)),
        },
        {
          label: 'تنبيه المحددين',
          icon: Bell,
          onClick: () => openConfirm('reminder', Array.from(selected)),
        },
      ]
    }
    return []
  })()

  const hasBulkActions = bulkActions.length > 0

  return (
    <div>
      {hasBulkActions ? (
        <BulkActionsBar
          count={selected.size}
          itemName="من الإعارات"
          onClear={() => setSelected(new Set())}
          actions={bulkActions}
        />
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {hasBulkActions ? (
                <TableHead className="w-10">
                  <span className="sr-only">تحديد</span>
                  <TableCheckbox
                    checked={allSelected}
                    partial={someSelected}
                    label="تحديد الكل"
                    onChange={toggleAll}
                  />
                </TableHead>
              ) : null}
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
              const isSelected = selected.has(loan.id)

              return (
                <TableRow key={loan.id} className={cn(isSelected && 'bg-primary-200/5')}>
                  {hasBulkActions ? (
                    <TableCell>
                      <TableCheckbox
                        checked={isSelected}
                        label={`تحديد إعارة ${getDisplayName(user)}`}
                        onChange={() => toggle(loan.id)}
                      />
                    </TableCell>
                  ) : null}
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
                          onClick={() => openConfirm('approve', [loan.id])}
                          className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-[#00FF92]/10 text-emerald-600 transition-colors hover:bg-[#00FF92]/20 disabled:opacity-50"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="رفض الطلب"
                          aria-label={`رفض طلب ${getDisplayName(user)}`}
                          disabled={pending}
                          onClick={() => openReject([loan.id])}
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
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>الإعارة</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDetails(loan)}>
                            <Eye className="size-4" />
                            تفاصيل الإعارة
                          </DropdownMenuItem>
                          {activeStatus === 'pending' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => openConfirm('approve', [loan.id])}
                                disabled={pending}
                              >
                                <Check className="size-4" />
                                قبول الطلب
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openReject([loan.id])}
                                disabled={pending}
                              >
                                <X className="size-4" />
                                رفض الطلب
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {activeStatus === 'accepted' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => openConfirm('pickup', [loan.id])}
                                disabled={pending}
                              >
                                <PackageCheck className="size-4" />
                                تسجيل الأخذ
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openConfirm('reminder', [loan.id])}
                                disabled={pending}
                              >
                                <Bell className="size-4" />
                                إرسال تذكير بالاستلام
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openReject([loan.id])}
                                disabled={pending}
                              >
                                <Ban className="size-4" />
                                إلغاء الإعارة
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {activeStatus === 'picked_up' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => openConfirm('return', [loan.id])}
                                disabled={pending}
                              >
                                <RotateCcw className="size-4" />
                                تسجيل الإرجاع
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openConfirm('reminder', [loan.id])}
                                disabled={pending}
                              >
                                <Bell className="size-4" />
                                إرسال تذكير بالإرجاع
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {confirm ? (
        <LoanConfirmDialog
          open
          onOpenChange={() => setConfirm(null)}
          title={confirmContent[confirm.action].title}
          description={confirmContent[confirm.action].description}
          confirmLabel={confirmContent[confirm.action].confirmLabel}
          busy={pending}
          onConfirm={() => {
            startTransition(() => runLoansAction(confirm.action, confirm.loanIds))
          }}
        />
      ) : null}

      {reject ? (
        <RejectLoanDialog
          open
          onOpenChange={() => setReject(null)}
          itemLabel={reject.loanLabel}
          busy={pending}
          onConfirm={(reason) => {
            startTransition(() => handleReject(reject.loanIds, reason))
          }}
        />
      ) : null}

      <LoanDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} loan={detailsLoan} />
    </div>
  )
}

export default LoansTable
