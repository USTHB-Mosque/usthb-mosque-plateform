'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Activity } from '@/payload-types'
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
import { bulkDeleteActivities, deleteActivity } from '@/features/admin'
import { activitiesKeys } from '@/features/activities/api/activities.queries'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import { cn } from '@/shared/lib/utils'

const typeLabelMap = Object.fromEntries(activitiesTypesConfigArray.map((t) => [t.value, t.label]))

interface ActivitiesTableProps {
  activities: Activity[]
  detailHref?: (id: number) => string
  onEdit?: (activity: Activity) => void
}

function activityStatus(activity: Activity): { label: string; className: string } {
  if (activity.openForRegistration) {
    return { label: 'قائم', className: 'bg-[#00FF92] text-[#243245] rounded-lg' }
  }
  const started = activity.startDate ? new Date(activity.startDate).getTime() < Date.now() : false
  if (started) return { label: 'مكتمل', className: 'bg-muted text-muted-foreground rounded-lg' }
  return { label: 'قادم', className: 'bg-[#0DEAC2]/10 text-[#0AAFC2] rounded-lg' }
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })
}

const ActivitiesTable: React.FC<ActivitiesTableProps> = ({
  activities,
  detailHref = (id) => `/admin-panel/activities/${id}`,
  onEdit,
}) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [bulkPending, setBulkPending] = useState(false)
  const [confirm, setConfirm] = useState<Activity | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  const activityIds = useMemo(() => activities.map((a) => a.id), [activities])
  const allSelected = activityIds.length > 0 && activityIds.every((id) => selected.has(id))
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
    setSelected(allSelected ? new Set() : new Set(activityIds))
  }

  const goToDetails = (id: number) => router.push(detailHref(id))

  const copyLink = async (activity: Activity) => {
    const url = new URL(detailHref(activity.id), window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذر نسخ الرابط')
    }
  }

  const bulkDeleteSelected = async () => {
    setBulkPending(true)
    const ids = Array.from(selected)
    const result = await bulkDeleteActivities(ids)
    setBulkPending(false)
    setSelected(new Set())
    if (result.ok) {
      toast.success(`تم حذف ${result.count} ${result.count === 1 ? 'نشاط' : 'أنشطة'}`)
      queryClient.invalidateQueries({ queryKey: activitiesKeys.root })
      router.refresh()
    } else {
      toast.error('تعذر حذف بعض الأنشطة')
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmPending(true)
    try {
      const result = await deleteActivity(confirm.id)
      if (result.ok) {
        toast.success('تم حذف النشاط')
        queryClient.invalidateQueries({ queryKey: activitiesKeys.root })
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setConfirm(null)
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <div>
      <BulkActionsBar
        count={selected.size}
        itemName="من الأنشطة"
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: 'حذف المحددة',
            icon: Trash2,
            onClick: bulkDeleteSelected,
            variant: 'destructive',
            disabled: bulkPending,
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
            <TableHead>النشاط</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>المكان</TableHead>
            <TableHead>المشاركون</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="w-10 text-end">
              <span className="sr-only">إجراءات</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const status = activityStatus(activity)
            const current = activity.currentParticipants ?? 0
            const max = activity.maxParticipants
            const isSelected = selected.has(activity.id)
            return (
              <TableRow key={activity.id} className={cn(isSelected && 'bg-primary-200/5')}>
                <TableCell>
                  <TableCheckbox
                    checked={isSelected}
                    label={`تحديد ${activity.title}`}
                    onChange={() => toggle(activity.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    onClick={() => goToDetails(activity.id)}
                    className="text-start text-foreground hover:text-primary-300 hover:underline"
                  >
                    {activity.title}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-lg bg-[#0DEAC2]/10 text-[#0AAFC2]">
                    {activity.type ? typeLabelMap[activity.type] || '—' : '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(activity.startDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">{activity.location || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {current} / {max ?? '∞'}
                </TableCell>
                <TableCell>
                  <Badge className={cn(status.className)}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`إجراءات ${activity.title}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">فتح قائمة الإجراءات</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>النشاط</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => goToDetails(activity.id)}>
                          <Eye className="size-4" />
                          التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(activity)}>
                          <Pencil className="size-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => copyLink(activity)}>
                          <Copy className="size-4" />
                          نسخ الرابط
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setConfirm(activity)}
                        >
                          <Trash2 className="size-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>

        <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
          <DialogContent className="sm:max-w-md" showCloseButton={!confirmPending}>
            <DialogHeader>
              <DialogTitle className="font-alyamama text-lg">حذف النشاط</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              سيتم حذف «{confirm?.title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirmPending}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={runConfirm} disabled={confirmPending}>
                {confirmPending ? (
                  <span className="me-1 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Trash2 className="me-1 size-4" />
                )}
                تأكيد الحذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Table>
    </div>
  )
}

export default ActivitiesTable
