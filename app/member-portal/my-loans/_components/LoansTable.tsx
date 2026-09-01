'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LibraryBig, MoreVertical, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Book, Loan, Media } from '@/payload-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/common/Pagination'
import EmptyData from '@/components/common/EmptyData'
import { useSearch } from '@/hooks/use-search'
import { getImageUrl } from '@/utils/image-utils'
import LoanStatusBadge, {
  getDueUrgency,
  getEffectiveLoanStatus,
} from './LoanStatusBadge'

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
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكتاب</TableHead>
                  <TableHead>تاريخ الإعارة</TableHead>
                  <TableHead>موعد الإرجاع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-16 text-end">
                    <span className="sr-only">إجراءات</span>
                  </TableHead>
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
                <TableRow key={loan.id}>
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
                        <span className="block max-w-[220px] truncate">{book?.title || '—'}</span>
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
                        render={
                          <button
                            type="button"
                            aria-label={`خيارات ${book?.title ?? 'الإعارة'}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          />
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => router.push(`/user/library/book/${bookId}`)}
                        >
                          تفاصيل الكتاب
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
    </div>
  )
}

export default LoansTable