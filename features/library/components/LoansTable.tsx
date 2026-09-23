'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LibraryBig, MoreVertical, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Book, Loan, Media } from '@/payload-types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Pagination } from '@/shared/common/Pagination'
import EmptyData from '@/shared/common/EmptyData'
import { useSearch } from '@/shared/hooks/use-search'
import { getImageUrl } from '@/shared/lib/image-utils'
import { getDueUrgency, getEffectiveLoanStatus, statusConfig } from './LoanStatusBadge'
import ExtensionDialog from './ExtensionDialog'
import LoanDetailsDialog from './LoanDetailsDialog'
import LoanRequestDetailsDialog from './LoanRequestDetailsDialog'

type LoansFilters = {
  period: 'current' | 'past'
  status: string
  search: string
  page: number
}

type LoansTableProps = {
  loans: Loan[]
}

const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'approved', label: 'موافق عليه' },
  { value: 'overdue', label: 'متأخر' },
  { value: 'returned', label: 'مُعاد' },
]

const LoansTable: React.FC<LoansTableProps> = ({ loans }) => {
  const router = useRouter()
  const [extensionLoan, setExtensionLoan] = useState<Loan | null>(null)
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [requestDetailsLoan, setRequestDetailsLoan] = useState<Loan | null>(null)
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false)

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
                <span className="flex-1 font-medium text-muted-foreground">الكتاب</span>
                <span className="w-[92px] shrink-0 font-medium text-muted-foreground">
                  تاريخ الإعارة
                </span>
                <span className="w-[92px] shrink-0 font-medium text-muted-foreground">
                  موعد الإرجاع
                </span>
                <span className="size-2 shrink-0" />
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
                    className="flex cursor-pointer items-center justify-between gap-3 bg-background px-4 py-3"
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
                    <span
                      className={`size-2 shrink-0 rounded-full ${config.dotClassName}`}
                      title={config.label}
                      aria-label={config.label}
                    />
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
                      ? 'text-[#C0392B]'
                      : urgency === 'soon'
                        ? 'text-[#B45309]'
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
                      <TableCell className="py-3 pr-1 text-right">
                        {(() => {
                          const status = getEffectiveLoanStatus(loan)
                          const config = statusConfig[status]
                          return (
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${config.className}`}
                            >
                              {config.label}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="hidden px-3 py-3 text-center lg:table-cell">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="ms-auto flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                openLoanDetails(loan)
                              }}
                            >
                              تفاصيل الإعارة
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                setExtensionLoan(loan)
                                setExtensionOpen(true)
                              }}
                            >
                              طلب تمديد الإعارة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 lg:hidden">
            <span className="text-xs font-medium text-muted-foreground">الحالة:</span>
            {Object.entries(statusConfig).map(([status, config]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-card-foreground">
                <span className={`inline-block size-2.5 rounded-full ${config.dotClassName}`} />
                {config.label}
              </span>
            ))}
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
        onConfirm={(days) => {
          console.log('Extension requested:', { loanId: extensionLoan?.id, days })
          setExtensionOpen(false)
          setExtensionLoan(null)
        }}
        bookTitle={(extensionLoan?.book as Book | undefined)?.title}
      />

      <LoanDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} loan={detailsLoan} />

      <LoanRequestDetailsDialog
        open={requestDetailsOpen}
        onOpenChange={setRequestDetailsOpen}
        loan={requestDetailsLoan}
      />
    </div>
  )
}

export default LoansTable
