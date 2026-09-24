'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Loader2, Plus, Search } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { addLoan } from '@/features/admin/server/loans'
import { adminLoansKeys } from '@/features/admin/api/loans.queries'
import { useGetUsersQuery } from '@/features/users/api/users.queries'
import { useGetBooksQuery, booksKeys } from '@/features/library/api/books.queries'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { DEFAULT_LOAN_DURATION_DAYS, MAX_EXTENSION_DAYS } from '@/utils/constants/loans'
import type { BookSearchParams } from '@/features/library/types'

interface AddLoanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PickerOption {
  id: number
  disabled?: boolean
}

function SearchablePicker({
  placeholder,
  loading,
  options,
  term,
  onTermChange,
  onSelect,
  getLabel,
  getSub,
  getDisabled,
}: {
  placeholder: string
  loading: boolean
  options: PickerOption[]
  term: string
  onTermChange: (term: string) => void
  onSelect: (id: number) => void
  getLabel: (option: PickerOption) => string
  getSub?: (option: PickerOption) => string
  getDisabled?: (option: PickerOption) => boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          dir="rtl"
          placeholder={selectedLabel || placeholder}
          className="ps-9"
          onChange={(e) => {
            onTermChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جاري التحميل...
            </div>
          ) : options.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا توجد نتائج</p>
          ) : (
            <ul>
              {options.map((option) => {
                const disabled = getDisabled?.(option) ?? false
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onMouseDown={(e) => {
                        if (disabled) {
                          toast.error('لا توجد نسخ متاحة من هذا الكتاب')
                          return
                        }
                        e.preventDefault()
                        onSelect(option.id)
                        setSelectedLabel(getLabel(option))
                        onTermChange('')
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start hover:bg-muted',
                        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                      )}
                    >
                      <span className="truncate">
                        <span className="block truncate text-sm font-medium">
                          {getLabel(option)}
                        </span>
                        {getSub ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {getSub(option)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

const USER_LIMIT = 10
const BOOK_LIMIT = 10

const DUE_PRESETS = [
  { value: 7, label: '7 أيام' },
  { value: DEFAULT_LOAN_DURATION_DAYS, label: `${DEFAULT_LOAN_DURATION_DAYS} أيام` },
  { value: MAX_EXTENSION_DAYS, label: `${MAX_EXTENSION_DAYS} يوم` },
  { value: 'custom', label: 'تاريخ محدد' },
] as const

type DuePreset = (typeof DUE_PRESETS)[number]['value'] | 'custom'

function toDateInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function todayInput(): string {
  return toDateInput(new Date())
}

function dateFromInput(input: string): Date {
  return new Date(`${input}T12:00:00`)
}

const AddLoanDialog: React.FC<AddLoanDialogProps> = ({ open, onOpenChange }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [userId, setUserId] = useState<number | null>(null)
  const [bookId, setBookId] = useState<number | null>(null)
  const [userTerm, setUserTerm] = useState('')
  const [bookTerm, setBookTerm] = useState('')
  const [pickupDate, setPickupDate] = useState(todayInput)
  const [duePreset, setDuePreset] = useState<DuePreset>(DEFAULT_LOAN_DURATION_DAYS)
  const [customDue, setCustomDue] = useState('')

  const { data: usersData, isFetching: usersLoading } = useGetUsersQuery({
    page: 1,
    limit: USER_LIMIT,
    search: userTerm,
  })
  const { data: booksData, isFetching: booksLoading } = useGetBooksQuery({
    page: 1,
    limit: BOOK_LIMIT,
    search: bookTerm,
  } as BookSearchParams)

  const users = useMemo(() => (usersData?.docs as PickerOption[]) ?? [], [usersData])
  const books = useMemo(() => (booksData?.docs as PickerOption[]) ?? [], [booksData])

  const effectiveDueDate = useMemo(() => {
    if (duePreset === 'custom') return customDue
    return toDateInput(addDays(dateFromInput(pickupDate), duePreset))
  }, [duePreset, pickupDate, customDue])

  const resetForm = () => {
    setUserId(null)
    setBookId(null)
    setUserTerm('')
    setBookTerm('')
    setPickupDate(todayInput())
    setDuePreset(DEFAULT_LOAN_DURATION_DAYS)
    setCustomDue('')
  }

  const handleClose = () => {
    if (pending) return
    onOpenChange(false)
    resetForm()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !bookId) {
      toast.error('يرجى اختيار المستفيد والكتاب')
      return
    }
    if (duePreset === 'custom') {
      if (!customDue) {
        toast.error('يرجى تحديد تاريخ الإرجاع')
        return
      }
      if (dateFromInput(customDue) < dateFromInput(pickupDate)) {
        toast.error('تاريخ الإرجاع يجب أن يكون بعد تاريخ الأخذ')
        return
      }
    }

    startTransition(async () => {
      const result = await addLoan(bookId, userId, {
        pickupDate: dateFromInput(pickupDate).toISOString(),
        dueDate: dateFromInput(effectiveDueDate).toISOString(),
      })
      if (result.ok) {
        toast.success('تمت إضافة الإعارة بنجاح')
        handleClose()
        queryClient.invalidateQueries({ queryKey: adminLoansKeys.root })
        queryClient.invalidateQueries({ queryKey: booksKeys.root })
        router.refresh()
      } else {
        toast.error(result.error || 'تعذر إضافة الإعارة')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">إضافة إعارة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>المستفيد *</Label>
              <SearchablePicker
                placeholder="ابحث باسم المستفيد أو بريده ..."
                loading={usersLoading}
                options={users}
                term={userTerm}
                onTermChange={setUserTerm}
                onSelect={(id) => setUserId(id)}
                getLabel={(option) => {
                  const u = option as unknown as {
                    fullName?: string
                    firstName?: string
                    lastName?: string
                    email?: string
                  }
                  return (
                    u.fullName ||
                    [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                    u.email ||
                    ''
                  )
                }}
                getSub={(option) => {
                  const u = option as unknown as { email?: string }
                  return u.email || ''
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>الكتاب *</Label>
              <SearchablePicker
                placeholder="ابحث باسم الكتاب أو المؤلف ..."
                loading={booksLoading}
                options={books}
                term={bookTerm}
                onTermChange={setBookTerm}
                onSelect={(id) => setBookId(id)}
                getLabel={(option) => {
                  const b = option as unknown as { title?: string }
                  return b.title || ''
                }}
                getSub={(option) => {
                  const b = option as unknown as { author?: string; availableBooks?: number }
                  return `${b.availableBooks ?? 0} نسخة متاحة — ${b.author || ''}`
                }}
                getDisabled={(option) => {
                  const b = option as unknown as { availableBooks?: number }
                  return (b.availableBooks ?? 0) <= 0
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loan-pickup-date">تاريخ أخذ الكتاب *</Label>
                <Input
                  id="loan-pickup-date"
                  type="date"
                  dir="ltr"
                  value={pickupDate}
                  min={todayInput()}
                  onChange={(e) => {
                    setPickupDate(e.target.value || todayInput())
                    if (duePreset !== 'custom' && customDue && e.target.value) {
                      const newDue = toDateInput(
                        addDays(dateFromInput(e.target.value), duePreset as number),
                      )
                      if (dateFromInput(customDue) < dateFromInput(newDue)) setCustomDue(newDue)
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>تاريخ الإرجاع *</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {DUE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDuePreset(preset.value)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        duePreset === preset.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary-200',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {duePreset === 'custom' ? (
                  <Input
                    type="date"
                    dir="ltr"
                    value={customDue}
                    min={pickupDate}
                    placeholder="تاريخ الإرجاع"
                    onChange={(e) => setCustomDue(e.target.value)}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    تاريخ الإرجاع: <span className="font-medium">{effectiveDueDate || '—'}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddLoanDialog
