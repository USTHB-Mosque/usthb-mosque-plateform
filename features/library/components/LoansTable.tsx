'use client'

import React, { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FileText, LibraryBig, MoreVertical, SlidersHorizontal, Undo2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Book, Loan, LoanExtension, Media } from '@/payload-types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Pagination } from '@/shared/common/Pagination'
import EmptyData from '@/shared/common/EmptyData'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import { useSearch } from '@/shared/hooks/use-search'
import { getImageUrl } from '@/shared/lib/image-utils'
import { resolveRelationId } from '@/shared/lib/relations'
import { canMemberCancel, canWithdrawExtension } from '@/shared/lib/loan-gates'
import LoanStatusBadge, {
  getDueUrgency,
  getEffectiveLoanStatus,
  statusConfig,
} from './LoanStatusBadge'
import ExtensionDialog from './ExtensionDialog'
import LoanDetailsDialog from './LoanDetailsDialog'
import LoanRequestDetailsDialog from './LoanRequestDetailsDialog'
import {
  requestLoanExtension,
  withdrawLoanExtension,
} from '@/features/library/server/loan-extensions'
import { cancelLoan } from '@/features/library/server/cancel-loan'

type LoansFilters = {
  period: 'current' | 'past'
  status: string
  search: string
  page: number
}

type LoansTableProps = {
  loans: Loan[]
  /**
   * D6 (#153): the member's extension requests, newest first, so the three-dot
   * menu can offer "withdraw" instead of "request" while one is still pending.
   * Read by the same dashboard query as `loans`, so the two cannot go stale.
   */
  extensions?: LoanExtension[]
}

const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'picked_up', label: 'تم الأخذ' },
  { value: 'overdue', label: 'متأخر' },
  { value: 'returned', label: 'تم الإرجاع' },
  { value: 'refused', label: 'مرفوض' },
  { value: 'cancelled', label: 'ملغى' },
]

/** One confirmation at a time; the wording is decided by the member's action. */
type ConfirmAction =
  { kind: 'cancel'; loan: Loan } | { kind: 'withdraw'; loan: Loan; extensionId: number } | null

const LoansTable: React.FC<LoansTableProps> = ({ loans, extensions = [] }) => {
  const router = useRouter()
  const [isRequestingExtension, startExtensionRequest] = useTransition()
  const [isCancelling, startCancel] = useTransition()
  const [isWithdrawing, startWithdraw] = useTransition()
  const [extensionLoan, setExtensionLoan] = useState<Loan | null>(null)
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [requestDetailsLoan, setRequestDetailsLoan] = useState<Loan | null>(null)
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  const openLoanDetails = (loan: Loan) => {
    const effective = getEffectiveLoanStatus(loan)
    if (effective === 'pending') {
      setRequestDetailsLoan(loan)
      setRequestDetailsOpen(true)
    } else {
      setDetailsLoan(loan)
      setDetailsOpen(true)
    }
  }

  const bookTitleOf = (loan: Loan) => (loan.book as Book | undefined)?.title ?? 'الإعارة'

  /** The loan's latest request; the dashboard returns them newest first. */
  const extensionFor = (loan: Loan) =>
    extensions.find((extension) => resolveRelationId(extension.loan) === loan.id)

  /**
   * D6 (#153): cancelling and withdrawing are member actions on rows whose
   * update rules are admin-only, so the server action owns the checks. The
   * dialog stays open on failure — the toast says why, and the member can try
   * again rather than losing the context they were in.
   */
  const runCancel = (loan: Loan) => {
    const loanId = loan.id
    startCancel(async () => {
      const result = await cancelLoan(loanId)
      if (result.success) {
        toast.success(result.message)
        setConfirmAction(null)
        setDetailsOpen(false)
        setRequestDetailsOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const runWithdraw = (extensionId: number) => {
    startWithdraw(async () => {
      const result = await withdrawLoanExtension(extensionId)
      if (result.success) {
        toast.success(result.message)
        setConfirmAction(null)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const confirmContent = confirmAction
    ? confirmAction.kind === 'withdraw'
      ? {
          title: 'سحب طلب التمديد',
          description: `سيتم سحب طلب تمديد «${bookTitleOf(confirmAction.loan)}». يمكنك طلبه مجدداً في أي وقت.`,
          confirmLabel: 'تأكيد السحب',
        }
      : // D6 says cancelling is never punished, so the dialog says so up front:
        // an accepted Loan also warns that the reserved copy goes back at once.
        getEffectiveLoanStatus(confirmAction.loan) === 'accepted'
        ? {
            title: 'إلغاء طلب الإعارة',
            description: `سيتم تحرير النسخة المخصصة لـ«${bookTitleOf(confirmAction.loan)}» فوراً وإتاحتها لقائمة الانتظار، ولن يُحتسب هذا الإجراء غياباً.`,
            confirmLabel: 'تأكيد الإلغاء',
          }
        : {
            title: 'إلغاء طلب الإعارة',
            description: `سيتم إلغاء طلب «${bookTitleOf(confirmAction.loan)}» ولن يُحتسب هذا الإجراء غياباً.`,
            confirmLabel: 'تأكيد الإلغاء',
          }
    : { title: '', description: '', confirmLabel: '' }

  const { values, searchValues, setValue, reset } = useSearch<LoansFilters>({
    initialValues: {
      period: 'current',
      status: '',
      search: '',
      page: 1,
    },
    scope: 'member-loans',
  })

  const { period, status, search } = searchValues

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = loans.filter((loan) => {
      const effective = getEffectiveLoanStatus(loan)
      const isPast = effective === 'returned'
      if (period === 'past' ? !isPast : isPast) return false
      if (status) {
        if (effective !== status) return false
      }
      if (q) {
        const book = loan.book as Book | undefined
        const hay = [book?.title, book?.author].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const dateKey = (loan: Loan) =>
      loan.loanDate ? new Date(loan.loanDate).getTime() : new Date(loan.createdAt).getTime()

    return [...list].sort((a, b) => dateKey(b) - dateKey(a))
  }, [loans, period, status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(values.page || 1, totalPages)
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  if (loans.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="py-12">
          <EmptyData title="لا توجد إعارات مسجّلة" />
          <p className="mt-2 text-center text-sm text-muted-foreground">
            ابدأ رحلتك مع كنوز المكتبة واطلب أول كتاب اليوم.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => router.push('/user/library')}
              className="gap-2 rounded-lg"
            >
              <LibraryBig className="size-4" />
              تصفح المكتبة
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Tabs
          value={values.period}
          onValueChange={(v) => {
            setValue('period', v as LoansFilters['period'])
            setValue('page', 1)
          }}
        >
          <TabsList>
            <TabsTrigger value="current">طلباتي الحالية</TabsTrigger>
            <TabsTrigger value="past">طلباتي السابقة</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ListingToolbar
        onApplyFilters={() => setValue('page', 1)}
        quickFilterSections={[
          {
            id: 'status-quick',
            multiple: false,
            options: statusOptions,
            value: values.status || '',
            onChange: (v) => setValue('status', v as string),
          },
        ]}
        searchProps={{
          enabled: true,
          value: searchValues.search || '',
          onChange: (value) => {
            setValue('search', value)
            setValue('page', 1)
          },
          placeholder: 'اسم الكتاب، المؤلف ...',
        }}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="py-12">
            <EmptyData title="لا توجد نتائج مطابقة للتصفية" />
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="gap-2 rounded-lg"
              >
                <SlidersHorizontal className="size-4" />
                مسح التصفية
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card lg:hidden">
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-background-2 px-4 py-3 text-right">
                <span className="flex-1 whitespace-nowrap font-medium text-muted-foreground">
                  الكتاب
                </span>
                <span className="w-[92px] shrink-0 whitespace-nowrap font-medium text-muted-foreground">
                  تاريخ الإعارة
                </span>
                <span className="w-[92px] shrink-0 whitespace-nowrap font-medium text-muted-foreground">
                  موعد الإرجاع
                </span>
              </li>
              {pageItems.map((loan) => {
                const book = loan.book as Book | undefined
                const status = getEffectiveLoanStatus(loan)
                const config = statusConfig[status]
                const mobileLoanDate = loan.loanDate ? new Date(loan.loanDate) : null
                const mobileDueDate = loan.returnDate
                  ? new Date(loan.returnDate)
                  : loan.dueDate
                    ? new Date(loan.dueDate)
                    : null
                return (
                  <li
                    key={loan.id}
                    onClick={() => {
                      openLoanDetails(loan)
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 ${config.tintClassName}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-card-foreground">
                      {book?.title || '—'}
                    </span>
                    <span className="w-[92px] shrink-0 text-start text-sm text-muted-foreground">
                      {mobileLoanDate
                        ? format(mobileLoanDate, 'd MMM yyyy', { locale: arDZ })
                        : '—'}
                    </span>
                    <span className="w-[92px] shrink-0 text-start text-sm text-muted-foreground">
                      {mobileDueDate ? format(mobileDueDate, 'd MMM yyyy', { locale: arDZ }) : '—'}
                    </span>
                    <span className="sr-only">{config.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
            <Table style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4 xl:w-1/5">الكتاب</TableHead>
                  <TableHead className="lg:w-1/5 xl:w-1/5">تاريخ الإعارة</TableHead>
                  <TableHead className="lg:w-1/5 xl:w-1/5">موعد الإرجاع</TableHead>
                  <TableHead className="w-1/4 px-4 py-3 text-center lg:w-1/5 lg:text-right xl:w-1/5 xl:text-right">
                    الحالة
                  </TableHead>
                  <TableHead className="hidden px-3 py-3 text-center lg:table-cell lg:w-[15%] xl:w-1/5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((loan) => {
                  const book = loan.book as Book | undefined
                  const cover = book?.image as Media | undefined
                  const extension = extensionFor(loan)
                  const bookId = book?.id
                  const loanDate = loan.loanDate ? new Date(loan.loanDate) : null
                  const displayDate = loan.returnDate
                    ? new Date(loan.returnDate)
                    : loan.dueDate
                      ? new Date(loan.dueDate)
                      : null
                  const urgency = getDueUrgency(loan)
                  const dueTextColor =
                    urgency === 'overdue'
                      ? 'text-[#C0392B] dark:text-[#ffb9b2]'
                      : urgency === 'soon'
                        ? 'text-[#B45309] dark:text-[#ffcaa2]'
                        : 'text-muted-foreground'

                  return (
                    <TableRow
                      key={loan.id}
                      className="cursor-pointer"
                      onClick={() => {
                        openLoanDetails(loan)
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getImageUrl(cover?.url, '/static/images/quran.png')}
                            alt={book?.title || 'غلاف الكتاب'}
                            width={40}
                            height={56}
                            className="h-14 w-10 shrink-0 rounded-md border border-border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => router.push(`/user/library/book/${bookId}`)}
                            className="min-w-0 text-start text-foreground hover:text-primary-300 hover:underline"
                          >
                            <span className="block max-w-[220px] truncate">
                              {book?.title || '—'}
                            </span>
                            {book?.author ? (
                              <span className="block max-w-[220px] truncate text-xs font-normal text-muted-foreground">
                                {book.author}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loanDate ? format(loanDate, 'd MMM yyyy', { locale: arDZ }) : '—'}
                      </TableCell>
                      <TableCell className={dueTextColor}>
                        {displayDate ? format(displayDate, 'd MMM yyyy', { locale: arDZ }) : '—'}
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge loan={loan} />
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`إجراءات ${book?.title || 'الإعارة'}`}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">فتح قائمة الإجراءات</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>الإعارة</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  openLoanDetails(loan)
                                }}
                              >
                                <FileText className="size-4" />
                                تفاصيل الإعارة
                              </DropdownMenuItem>
                              {/* D6 (#153): offered only while cancelling still
                                  leaves the queue no worse off than inaction
                                  would — `pending` or `accepted`, never once
                                  the book has changed hands. */}
                              {canMemberCancel(getEffectiveLoanStatus(loan)) && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    setConfirmAction({ kind: 'cancel', loan })
                                  }}
                                >
                                  <XCircle className="size-4" />
                                  إلغاء الطلب
                                </DropdownMenuItem>
                              )}
                              {getEffectiveLoanStatus(loan) === 'picked_up' && (
                                <>
                                  <DropdownMenuSeparator />
                                  {extension && canWithdrawExtension(extension.status) ? (
                                    <DropdownMenuItem
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        setConfirmAction({
                                          kind: 'withdraw',
                                          loan,
                                          extensionId: extension.id,
                                        })
                                      }}
                                    >
                                      <Undo2 className="size-4" />
                                      سحب طلب التمديد
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        setExtensionLoan(loan)
                                        setExtensionOpen(true)
                                      }}
                                    >
                                      طلب تمديد الإعارة
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
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

          {totalPages > 1 ? (
            <Pagination
              totalPages={totalPages}
              page={clampedPage}
              onPageChange={(page) => setValue('page', page)}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          ) : null}
        </>
      )}

      <ExtensionDialog
        open={extensionOpen}
        onOpenChange={setExtensionOpen}
        isLoading={isRequestingExtension}
        onConfirm={(days) => {
          if (!extensionLoan) return
          const loanId = extensionLoan.id
          startExtensionRequest(async () => {
            const result = await requestLoanExtension(loanId, days)
            if (result.success) {
              toast.success(result.message)
              setExtensionOpen(false)
              setExtensionLoan(null)
              router.refresh()
            } else {
              toast.error(result.message)
            }
          })
        }}
        bookTitle={(extensionLoan?.book as Book | undefined)?.title}
      />

      <LoanDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        loan={detailsLoan}
        onCancel={(loan) => setConfirmAction({ kind: 'cancel', loan })}
      />

      <LoanRequestDetailsDialog
        open={requestDetailsOpen}
        onOpenChange={setRequestDetailsOpen}
        loan={requestDetailsLoan}
        onCancel={(loan) => setConfirmAction({ kind: 'cancel', loan })}
      />

      {/* D6 (#153): SPEC asks for a confirmation on every mutating action, so
          both entry points — the three-dot menu and the details dialog — land
          on this same one rather than each growing its own. */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmAction(null)
        }}
        title={confirmContent.title}
        description={confirmContent.description}
        confirmLabel={confirmContent.confirmLabel}
        busy={isCancelling || isWithdrawing}
        onConfirm={() => {
          if (!confirmAction) return
          if (confirmAction.kind === 'cancel') runCancel(confirmAction.loan)
          else runWithdraw(confirmAction.extensionId)
        }}
      />
    </div>
  )
}

export default LoansTable
