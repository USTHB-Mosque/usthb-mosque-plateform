'use client'

import React, { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Loan, LoanExtension, User } from '@/payload-types'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { Pagination } from '@/shared/common/Pagination'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import {
  adminExtensionsKeys,
  useGetAdminExtensionsQuery,
} from '@/features/admin/api/extensions.queries'
import {
  approveExtension,
  refuseExtension,
  type ExtensionStatus,
} from '@/features/admin/server/extensions'
import RejectLoanDialog from './RejectLoanDialog'

const PAGE_SIZE = 20

// Borrower's own labels from the collection, kept verbatim so the tab and the
// row say the same words the member sees in their history.
const STATUS_TABS: Array<{ value: ExtensionStatus; label: string }> = [
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'refused', label: 'مرفوض' },
  { value: 'withdrawn', label: 'مسحوب' },
]

const STATUS_LABEL: Record<ExtensionStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  refused: 'مرفوض',
  withdrawn: 'مسحوب',
}

const STATUS_BADGE: Record<ExtensionStatus, string> = {
  pending: 'border-primary/30 bg-primary/10 text-primary-300',
  approved:
    'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300',
  refused: 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40',
  withdrawn: 'border-border bg-background-2 text-muted-foreground',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: arDZ })
}

/** depth 2 populated these; a plain id means the relation was missing. */
function resolveLoan(extension: LoanExtension): Loan | undefined {
  return typeof extension.loan === 'object' && extension.loan !== null
    ? (extension.loan as Loan)
    : undefined
}

function resolveUser(extension: LoanExtension): User | undefined {
  return typeof extension.user === 'object' && extension.user !== null
    ? (extension.user as User)
    : undefined
}

function bookTitle(extension: LoanExtension): string {
  const book = resolveLoan(extension)?.book
  if (typeof book === 'object' && book !== null) return book.title
  return '—'
}

function borrowerLabel(user: User | undefined): string {
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

const ExtensionsQueue: React.FC = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<ExtensionStatus>('pending')
  const [page, setPage] = useState(1)
  const [approving, setApproving] = useState<LoanExtension | null>(null)
  const [refusing, setRefusing] = useState<LoanExtension | null>(null)

  const {
    data: { docs = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetAdminExtensionsQuery({ status, page, limit: PAGE_SIZE })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminExtensionsKeys.root })
    router.refresh()
  }

  const handleApprove = () => {
    const target = approving
    if (!target) return
    startTransition(async () => {
      const result = await approveExtension(target.id)
      setApproving(null)
      if (result.ok) {
        toast.success('تم قبول طلب التمديد')
        refresh()
      } else {
        toast.error(result.error || 'تعذر قبول الطلب')
      }
    })
  }

  const handleRefuse = (reason?: string) => {
    const target = refusing
    if (!target) return
    startTransition(async () => {
      const result = await refuseExtension(target.id, reason)
      setRefusing(null)
      if (result.ok) {
        toast.success('تم رفض طلب التمديد')
        refresh()
      } else {
        toast.error(result.error || 'تعذر رفض الطلب')
      }
    })
  }

  const borrowerOf = (extension: LoanExtension) => borrowerLabel(resolveUser(extension))

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as ExtensionStatus)
          setPage(1)
        }}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لا توجد طلبات تمديد في هذه الحالة" />}
        errorFallback={<ErrorData />}
        loader={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="h-48 animate-pulse bg-background-2" />
          </div>
        }
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستفيد</TableHead>
                <TableHead>الكتاب</TableHead>
                <TableHead>تاريخ الإرجاع الأصلي</TableHead>
                <TableHead>تاريخ الإرجاع الجديد</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>الحالة</TableHead>
                {status === 'pending' ? <TableHead>إجراءات</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((extension) => {
                const user = resolveUser(extension)
                const state: ExtensionStatus = extension.status ?? 'pending'
                const originalDue = extension.originalDueDate
                const newDue = extension.newDueDate

                return (
                  <TableRow key={extension.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <p className="truncate font-medium">{borrowerOf(extension)}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">{bookTitle(extension)}</TableCell>
                    {/* Side by side is the whole point of the screen: the admin
                        reads the move, not two isolated dates. */}
                    <TableCell>{formatDate(originalDue)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{formatDate(newDue)}</span>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-primary/30 bg-primary/10 text-primary-300"
                        >
                          ‎+{extension.days} يوم
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">
                      {extension.reason || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[state]}>
                        {STATUS_LABEL[state]}
                      </Badge>
                    </TableCell>
                    {status === 'pending' ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="قبول التمديد"
                            aria-label={`قبول تمديد ${borrowerOf(extension)}`}
                            disabled={pending}
                            onClick={() => setApproving(extension)}
                            className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-[#00FF92]/10 text-emerald-600 transition-colors hover:bg-[#00FF92]/20 disabled:opacity-50 dark:text-emerald-300"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            title="رفض التمديد"
                            aria-label={`رفض تمديد ${borrowerOf(extension)}`}
                            disabled={pending}
                            onClick={() => setRefusing(extension)}
                            className="flex size-8 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              dir="rtl"
            />
          </div>
        ) : null}
      </ListingRenderer>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(open) => (open ? null : setApproving(null))}
        title="قبول طلب التمديد"
        description={
          approving
            ? `سيتم تمديد إرجاع «${bookTitle(approving)}» إلى ${formatDate(approving.newDueDate)} وإشعار ${borrowerOf(approving)}.`
            : ''
        }
        confirmLabel="تأكيد القبول"
        busy={pending}
        onConfirm={handleApprove}
      />

      <RejectLoanDialog
        open={refusing !== null}
        onOpenChange={(open) => (open ? null : setRefusing(null))}
        itemLabel={refusing ? `طلب تمديد «${bookTitle(refusing)}»` : ''}
        busy={pending}
        title="رفض طلب التمديد"
        description={
          refusing
            ? `سيتم رفض طلب تمديد «${bookTitle(refusing)}». يمكنك إضافة سبب يظهر للمستفيد في سجلّ إعاراته.`
            : ''
        }
        confirmLabel="تأكيد الرفض"
        onConfirm={handleRefuse}
      />
    </div>
  )
}

export default ExtensionsQueue
