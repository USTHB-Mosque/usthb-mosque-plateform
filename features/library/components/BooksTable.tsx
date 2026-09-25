'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  Copy,
  Eye,
  FileDown,
  GripVertical,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Book } from '@/payload-types'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import BulkActionsBar from '@/shared/common/BulkActionsBar'
import TableCheckbox from '@/components/admin-views/shared/TableCheckbox'
import { bookTypesConfigArray } from '@/utils/constants/books'
import { languagesConfigArray } from '@/utils/constants/data'
import { borrowBook } from '@/features/library/server/borrow-book'
import { bulkSoftDeleteBooks, deleteBook, softDeleteBook } from '@/features/admin'
import { booksKeys } from '@/features/library/api/books.queries'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'

const typeLabelMap = Object.fromEntries(bookTypesConfigArray.map((t) => [t.value, t.label]))
const languageLabelMap = Object.fromEntries(languagesConfigArray.map((l) => [l.value, l.label]))

type BooksTableProps = {
  books: Book[]
  detailHref?: (id: number) => string
  showBorrowAction?: boolean
  showBulkDelete?: boolean
  onEdit?: (book: Book) => void
}

type ConfirmAction = {
  book: Book
  kind: 'archive' | 'delete'
}

const BooksTable: React.FC<BooksTableProps> = ({
  books,
  detailHref = (id) => `/user/library/book/${id}`,
  showBorrowAction = true,
  showBulkDelete = false,
  onEdit,
}) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [borrowing, setBorrowing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  const bookIds = useMemo(() => books.map((b) => b.id), [books])
  const allSelected = bookIds.length > 0 && bookIds.every((id) => selected.has(id))
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
    setSelected(allSelected ? new Set() : new Set(bookIds))
  }

  const goToDetails = (id: number) => router.push(detailHref(id))

  const borrowOne = async (book: Book) => {
    if ((book.availableBooks ?? 0) <= 0) {
      toast.error('الكتاب غير متوفر حالياً')
      return
    }
    const result = await borrowBook(String(book.id))
    if (result.success) {
      toast.success(result.message)
      router.push('/user/my-loans')
    } else {
      toast.error(result.message)
    }
  }

  const borrowSelected = async () => {
    setBorrowing(true)
    let done = 0
    const errors: string[] = []
    for (const id of selected) {
      const result = await borrowBook(String(id))
      if (result.success) done++
      else errors.push(result.message)
    }
    setBorrowing(false)
    setSelected(new Set())
    if (done > 0) {
      toast.success(`تم تقديم ${done} ${done === 1 ? 'طلب إعارة' : 'طلبات إعارة'}`)
      router.push('/user/my-loans')
    }
    if (errors.length > 0) toast.error(errors[0])
  }

  const bulkDeleteSelected = async () => {
    setBorrowing(true)
    const ids = Array.from(selected)
    const result = await bulkSoftDeleteBooks(ids)
    setBorrowing(false)
    setSelected(new Set())
    if (result.ok) {
      toast.success(`تم حذف ${result.count} ${result.count === 1 ? 'كتاب' : 'كتب'}`)
      queryClient.invalidateQueries({ queryKey: booksKeys.root })
      router.refresh()
    } else {
      toast.error('تعذر حذف بعض الكتب')
    }
  }

  const typeLabels = (book: Book) => (book.type ?? []).map((t) => typeLabelMap[t]).filter(Boolean)

  const exportCsv = (book: Book) => {
    const rows = [
      [
        'العنوان',
        'المؤلف',
        'التصنيف',
        'الفئة',
        'اللغة',
        'الناشر',
        'ISBN',
        'الموقع',
        'إجمالي الكتب',
        'الكتب المتوفرة',
        'الوصف المختصر',
      ],
      [
        book.title,
        book.author,
        typeLabels(book).join('، '),
        book.category ?? '',
        book.language ? (languageLabelMap[book.language] ?? '') : '',
        book.publisher ?? '',
        book.isbn ?? '',
        book.location ?? '',
        String(book.totalBooks ?? 0),
        String(book.availableBooks ?? 0),
        book.shortDescription ?? '',
      ],
    ]
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = '\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${book.title}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير الكتاب كملف CSV')
  }

  const copyLink = async (book: Book) => {
    const url = new URL(detailHref(book.id), window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذر نسخ الرابط')
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmPending(true)
    try {
      if (confirm.kind === 'archive') {
        const result = await softDeleteBook(confirm.book.id)
        if (result.ok) {
          toast.success('تمت أرشفة الكتاب')
          setSelected((prev) => {
            const next = new Set(prev)
            next.delete(confirm.book.id)
            return next
          })
          queryClient.invalidateQueries({ queryKey: booksKeys.root })
          router.refresh()
        } else {
          toast.error('تعذر أرشفة الكتاب')
        }
      } else {
        const result = await deleteBook(confirm.book.id)
        if (result.ok) {
          toast.success('تم حذف الكتاب نهائياً')
          setSelected((prev) => {
            const next = new Set(prev)
            next.delete(confirm.book.id)
            return next
          })
          queryClient.invalidateQueries({ queryKey: booksKeys.root })
          router.refresh()
        } else {
          toast.error(result.error)
        }
      }
      setConfirm(null)
    } finally {
      setConfirmPending(false)
    }
  }

  const bulkActions = [
    ...(showBorrowAction
      ? [
          {
            label: 'استعارة المحددة',
            icon: Layers,
            onClick: borrowSelected,
            disabled: borrowing,
          },
        ]
      : []),
    ...(showBulkDelete
      ? [
          {
            label: 'حذف المحددة',
            icon: Trash2,
            onClick: bulkDeleteSelected,
            variant: 'destructive' as const,
            disabled: borrowing,
          },
        ]
      : []),
  ]

  return (
    <div>
      <BulkActionsBar
        count={selected.size}
        itemName="من الكتب"
        onClear={() => setSelected(new Set())}
        actions={bulkActions}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">تحديد</span>
              <TableCheckbox
                checked={allSelected}
                partial={someSelected}
                label="تحديد الكل"
                onChange={toggleAll}
              />
            </TableHead>
            <TableHead>إسم الكتاب</TableHead>
            <TableHead>المؤلف</TableHead>
            <TableHead>دار النشر</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>اللغة</TableHead>
            <TableHead>العدد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="w-10 text-end">
              <GripVertical className="inline-block h-4 w-4 text-muted-foreground" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => {
            const available = (book.availableBooks ?? 0) > 0
            const isSelected = selected.has(book.id)
            return (
              <TableRow key={book.id} className={cn(isSelected && 'bg-primary-200/5')}>
                <TableCell>
                  <TableCheckbox
                    checked={isSelected}
                    label={`تحديد ${book.title}`}
                    onChange={() => toggle(book.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    onClick={() => goToDetails(book.id)}
                    className="text-start text-foreground hover:text-primary-300 hover:underline"
                  >
                    {book.title}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{book.author}</TableCell>
                <TableCell className="text-muted-foreground">{book.publisher || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {typeLabels(book).length > 0 ? (
                      typeLabels(book).map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className="bg-[#0DEAC2]/10 text-[#0AAFC2] rounded-lg"
                        >
                          {label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {book.language ? languageLabelMap[book.language] || '—' : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {book.availableBooks ?? 0} / {book.totalBooks ?? 0}
                </TableCell>
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
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`إجراءات ${book.title}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">فتح قائمة الإجراءات</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                      {showBulkDelete ? (
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>الكتاب</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit?.(book)}>
                            <Pencil className="size-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportCsv(book)}>
                            <FileDown className="size-4" />
                            تصدير كملف CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(book)}>
                            <Copy className="size-4" />
                            نسخ الرابط
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setConfirm({ book, kind: 'archive' })}>
                            <Archive className="size-4" />
                            أرشفة
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirm({ book, kind: 'delete' })}
                          >
                            <Trash2 className="size-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      ) : (
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>الكتاب</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => goToDetails(book.id)}>
                            <Eye className="size-4" />
                            تفاصيل الكتاب
                          </DropdownMenuItem>
                          {showBorrowAction ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => borrowOne(book)}
                                disabled={!available}
                              >
                                <Layers className="size-4" />
                                استعارة
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuGroup>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!confirmPending}>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">
              {confirm?.kind === 'archive' ? 'أرشفة الكتاب' : 'حذف الكتاب'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.kind === 'archive' ? (
              <>
                سيتم نقل «{confirm.book.title}» إلى الأرشيف مع الاحتفاظ بسجل الإعارات والتقييمات
                المرتبطة به. يمكنك التراجع لاحقاً عبر إعادة تفعيل الكتاب.
              </>
            ) : confirm ? (
              <>
                سيتم حذف «{confirm.book.title}» نهائياً من المكتبة. لا يمكن التراجع عن هذا الإجراء.
              </>
            ) : null}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirmPending}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={runConfirm} disabled={confirmPending}>
              {confirmPending ? (
                <span className="me-1 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : confirm?.kind === 'archive' ? (
                <Archive className="me-1 size-4" />
              ) : (
                <Trash2 className="me-1 size-4" />
              )}
              {confirm?.kind === 'archive' ? 'تأكيد الأرشفة' : 'تأكيد الحذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BooksTable
