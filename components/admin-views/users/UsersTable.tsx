'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { Check, Minus, MoreVertical, Trash2, Eye, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { User } from '@/payload-types'
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
import BulkActionsBar from '@/shared/common/BulkActionsBar'
import { softDeleteUser } from '@/features/admin/server/users'
import { approveUser } from '@/features/admin/server/verification'
import { cn } from '@/shared/lib/utils'

type UsersTableProps = {
  users: User[]
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'قيد الانتظار',
  verified: 'مفعل',
  rejected: 'مرفوض',
}

const STATUS_CLASSES: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-700 rounded-lg',
  verified: 'bg-[#00FF92] text-[#243245] rounded-lg',
  rejected: 'bg-destructive/10 text-destructive rounded-lg',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مشرف',
  librarian: 'أمين مكتبة',
  user: 'مستخدم',
}

function getDisplayName(user: User): string {
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
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

const UsersTable: React.FC<UsersTableProps> = ({ users }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())

  const userIds = useMemo(() => users.map((u) => u.id), [users])
  const allSelected = userIds.length > 0 && userIds.every((id) => selected.has(id))
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
    setSelected(allSelected ? new Set() : new Set(userIds))
  }

  const handleSoftDelete = (userId: number) => {
    startTransition(async () => {
      await softDeleteUser(userId)
      toast.success('تم حذف المستخدم')
      router.refresh()
    })
  }

  const handleApprove = (userId: number) => {
    startTransition(async () => {
      const result = await approveUser(userId)
      if (result.ok) {
        toast.success('تم قبول المستخدم')
        router.refresh()
      }
    })
  }

  const handleBulkApprove = () => {
    const pendingIds = users
      .filter(
        (u) =>
          selected.has(u.id) &&
          (u.verificationStatus || 'pending_verification') === 'pending_verification',
      )
      .map((u) => u.id)
    if (pendingIds.length === 0) {
      toast.error('لا يوجد مستخدمون محددون بانتظار التحقق')
      return
    }
    startTransition(async () => {
      let done = 0
      for (const id of pendingIds) {
        const result = await approveUser(id)
        if (result.ok) done++
      }
      if (done > 0) {
        toast.success(`تم قبول ${done} ${done === 1 ? 'مستخدم' : 'مستخدمين'}`)
        setSelected(new Set())
        router.refresh()
      }
    })
  }

  const handleBulkDelete = () => {
    const ids = Array.from(selected)
    startTransition(async () => {
      for (const id of ids) {
        await softDeleteUser(id)
      }
      toast.success(`تم حذف ${ids.length} ${ids.length === 1 ? 'مستخدم' : 'مستخدمين'}`)
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div>
      <BulkActionsBar
        count={selected.size}
        itemName="من المستخدمين"
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: 'قبول المحددين',
            icon: UserCheck,
            onClick: handleBulkApprove,
            disabled: pending,
          },
          {
            label: 'حذف المحددين',
            icon: Trash2,
            onClick: handleBulkDelete,
            variant: 'destructive',
            disabled: pending,
          },
        ]}
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
            <TableHead>الاسم</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>الكلية</TableHead>
            <TableHead>الدور</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الانضمام</TableHead>
            <TableHead className="w-10 text-end">
              <span className="sr-only">إجراءات</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelected = selected.has(user.id)
            const displayName = getDisplayName(user)
            const status = user.verificationStatus || 'pending_verification'

            return (
              <TableRow
                key={user.id}
                className={cn(isSelected && 'bg-primary-200/5', 'cursor-pointer')}
                onClick={() => router.push(`/admin-panel/users/${user.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <TableCheckbox
                    checked={isSelected}
                    label={`تحديد ${displayName}`}
                    onChange={() => toggle(user.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{displayName}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.phone || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.faculty
                    ? user.studyYear
                      ? `${user.faculty} — سنة ${user.studyYear}`
                      : user.faculty
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      user.role === 'admin'
                        ? 'bg-[#0DEAC2]/10 text-[#0AAFC2] rounded-lg'
                        : 'bg-muted text-muted-foreground rounded-lg'
                    }
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      STATUS_CLASSES[status] || 'bg-muted text-muted-foreground rounded-lg'
                    }
                  >
                    {STATUS_LABELS[status] || status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.createdAt
                    ? format(new Date(user.createdAt), 'd MMM yyyy', { locale: arDZ })
                    : '—'}
                </TableCell>
                <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`إجراءات ${displayName}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">فتح قائمة الإجراءات</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                      <DropdownMenuLabel>المستخدم</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin-panel/users/${user.id}`)}
                      >
                        <Eye className="size-4" />
                        تفاصيل المستخدم
                      </DropdownMenuItem>
                      {status === 'pending_verification' ? (
                        <DropdownMenuItem onClick={() => handleApprove(user.id)} disabled={pending}>
                          <UserCheck className="size-4" />
                          قبول المستخدم
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleSoftDelete(user.id)}
                        disabled={pending}
                      >
                        <Trash2 className="size-4" />
                        حذف
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

export default UsersTable
