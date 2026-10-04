'use client'

import React, { useState, useTransition } from 'react'
import { ArrowUpToLine, BookCopy } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { User, WaitlistEntry } from '@/payload-types'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { Pagination } from '@/shared/common/Pagination'
import { useSearch } from '@/shared/hooks/use-search'
import { adminWaitlistKeys, useGetWaitlistQuery } from '@/features/admin/api/waitlist.queries'
import { booksKeys } from '@/features/library'
import { adminLoansKeys } from '@/features/admin/api/loans.queries'
import {
  assignWaitlistEntry,
  moveWaitlistEntryToFront,
  type WaitlistGroup,
} from '@/features/admin/server/waitlist'

const PAGE_SIZE = 20

type QueueAction = 'assign' | 'front'

type PendingAction = {
  kind: QueueAction
  queue: WaitlistGroup
  entry: WaitlistEntry
} | null

function getDisplayName(user: User | undefined): string {
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: arDZ })
}

function resolveUser(entry: WaitlistEntry): User | undefined {
  return typeof entry.user === 'object' && entry.user !== null ? (entry.user as User) : undefined
}

const dialogCopy: Record<
  QueueAction,
  (
    queue: WaitlistGroup,
    entry: WaitlistEntry,
  ) => {
    title: string
    description: string
    confirmLabel: string
    success: string
  }
> = {
  assign: (queue, entry) => ({
    title: 'إسناد نسخة',
    description: `سيتم إسناد نسخة من «${queue.title}» إلى ${getDisplayName(resolveUser(entry))} وتسجيل إعارة جديدة باسمه.`,
    confirmLabel: 'تأكيد الإسناد',
    success: 'تم إسناد النسخة',
  }),
  front: (queue, entry) => ({
    title: 'نقل إلى رأس الطابور',
    description: `سيتم نقل ${getDisplayName(resolveUser(entry))} إلى المركز 1 في قائمة انتظار «${queue.title}» ليأخذ النسخة التالية.`,
    confirmLabel: 'تأكيد النقل',
    success: 'تم النقل إلى رأس الطابور',
  }),
}

/**
 * The waitlist queue (#144). Two actions, because they answer two different
 * questions: *assign a copy that is free now*, and *make this person take the
 * next copy that frees up*. A queue only exists while nothing is free, so the
 * second is the one the desk reaches for most.
 */
const WaitlistQueue: React.FC = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<PendingAction>(null)

  const { searchValues, values, setValue } = useSearch({
    initialValues: { search: '', page: 1, limit: PAGE_SIZE },
    scope: 'admin-waitlist',
  })

  const {
    data: { docs = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetWaitlistQuery(searchValues)

  const run = () => {
    if (!action) return
    const { kind, entry, queue } = action
    const copy = dialogCopy[kind](queue, entry)

    startTransition(async () => {
      const result =
        kind === 'assign'
          ? await assignWaitlistEntry(entry.id)
          : await moveWaitlistEntryToFront(entry.id)
      setAction(null)

      if (!result.ok) {
        toast.error(result.error || 'تعذر تنفيذ الإجراء')
        return
      }

      toast.success(copy.success)
      queryClient.invalidateQueries({ queryKey: adminWaitlistKeys.root })
      queryClient.invalidateQueries({ queryKey: adminLoansKeys.root })
      if (kind === 'assign') queryClient.invalidateQueries({ queryKey: booksKeys.root })
      router.refresh()
    })
  }

  const copy = action ? dialogCopy[action.kind](action.queue, action.entry) : null

  return (
    <div className="flex flex-col gap-6">
      <ListingToolbar
        onApplyFilters={() => setValue('page', 1)}
        searchProps={{
          enabled: true,
          value: searchValues.search || '',
          onChange: (value) => {
            setValue('search', value)
            setValue('page', 1)
          },
          placeholder: 'الكتاب، المستفيد ...',
        }}
        filterButtonClassName="bg-card"
      />

      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لا توجد قوائم انتظار" />}
        errorFallback={<ErrorData />}
        loader={
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="h-40 animate-pulse rounded-lg bg-background-2" />
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {docs.map((queue) => (
            <div
              key={queue.bookId}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <BookCopy className="size-4 shrink-0 text-primary-300" aria-hidden />
                  <h3 className="truncate font-semibold">{queue.title}</h3>
                  <Badge variant="outline" className="shrink-0">
                    {queue.entries.length} في الانتظار
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={
                    queue.availableBooks > 0
                      ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }
                >
                  {queue.availableBooks > 0
                    ? `${queue.availableBooks} نسخة متاحة`
                    : 'لا توجد نسخ متاحة'}
                </Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">المركز</TableHead>
                    <TableHead>المستفيد</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.entries.map((entry, index) => {
                    const user = resolveUser(entry)
                    const first = index === 0
                    const canAssign = queue.availableBooks > 0

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline" className="tabular-nums">
                            #{entry.position}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <p className="truncate font-medium">{getDisplayName(user)}</p>
                            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={pending || !canAssign}
                              title={
                                canAssign ? 'إسناد نسخة متاحة الآن' : 'لا توجد نسخة متاحة لإسنادها'
                              }
                              onClick={() => setAction({ kind: 'assign', queue, entry })}
                              className="gap-1"
                            >
                              <BookCopy className="size-3" aria-hidden />
                              إسناد نسخة
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={pending || first}
                              title={first ? 'أعلى القائمة بالفعل' : 'النقل إلى المركز الأول'}
                              onClick={() => setAction({ kind: 'front', queue, entry })}
                              className="gap-1"
                            >
                              <ArrowUpToLine className="size-3" aria-hidden />
                              نقل إلى رأس الطابور
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ))}

          {totalPages > 1 ? (
            <div className="flex justify-center">
              <Pagination
                page={values.page}
                totalPages={totalPages}
                onPageChange={(p) => setValue('page', p)}
                dir="rtl"
              />
            </div>
          ) : null}
        </div>
      </ListingRenderer>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => (open ? null : setAction(null))}
        title={copy?.title ?? ''}
        description={copy?.description ?? ''}
        confirmLabel={copy?.confirmLabel ?? ''}
        busy={pending}
        onConfirm={run}
      />
    </div>
  )
}

export default WaitlistQueue
