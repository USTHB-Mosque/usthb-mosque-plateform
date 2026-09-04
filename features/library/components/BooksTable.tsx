'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, GripVertical, Layers, Minus, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Book } from '@/payload-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { bookTypesConfigArray } from '@/utils/constants/books'
import { languagesConfigArray } from '@/utils/constants/data'
import { borrowBook } from '@/features/library/server/borrow-book'
import { cn } from '@/shared/lib/utils'

const typeLabelMap = Object.fromEntries(
  bookTypesConfigArray.map((t) => [t.value, t.label]),
)
const languageLabelMap = Object.fromEntries(
  languagesConfigArray.map((l) => [l.value, l.label]),
)

type BooksTableProps = {
  books: Book[]
}

const BooksTable: React.FC<BooksTableProps> = ({ books }) => {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [borrowing, setBorrowing] = useState(false)

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

  const goToDetails = (id: number) => router.push(`/user/library/book/${id}`)

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

  return (
    <div>
      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary-200/10 px-4 py-2">
          <span className="text-sm font-medium text-[#243245]">
            تم تحديد {selected.size} من الكتاب
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={borrowSelected}
              disabled={borrowing}
              className="rounded-lg"
            >
              استعارة المحددة
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="rounded-lg"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>
      ) : null}

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
              <TableRow
                key={book.id}
                className={cn(isSelected && 'bg-primary-200/5')}
              >
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
                <TableCell className="text-muted-foreground">
                  {book.author}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {book.publisher || '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-[#0DEAC2]/10 text-[#0AAFC2] rounded-lg"
                  >
                    {typeLabelMap[book.type] || '—'}
                  </Badge>
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
                      render={
                        <button
                          type="button"
                          aria-label={`خيارات ${book.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                        />
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => goToDetails(book.id)}>
                        تفاصيل الكتاب
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => borrowOne(book)}
                        disabled={!available}
                      >
                        <Layers className="size-4" />
                        استعارة
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
  )
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

export default BooksTable