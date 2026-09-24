'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import {
  GraduationCap,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import type { Media, User } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import AccountInfoSection from '@/features/profile/components/settings/AccountInfoSection'
import { approveUser, rejectUser } from '@/features/admin/server/verification'
import { softDeleteUser, updateUserRole } from '@/features/admin/server/users'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'قيد الانتظار',
  verified: 'مفعل',
  rejected: 'مرفوض',
}

const STATUS_CLASSES: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-700',
  verified: 'bg-[#00FF92] text-[#243245]',
  rejected: 'bg-destructive/10 text-destructive',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مشرف',
  librarian: 'أمين مكتبة',
  user: 'مستخدم',
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-[#E8F2F8] px-4 py-2.5">
        <Icon className="size-5 flex-none text-grey-400" />
        <span className="flex-1 text-right text-base font-alyamama text-[#243245]">
          {value || 'غير محدد'}
        </span>
      </div>
    </div>
  )
}

interface UserDetailProps {
  user: User
}

const UserDetail: React.FC<UserDetailProps> = ({ user }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const docMedia = user.verificationDocument as Media | undefined
  const docUrl = getImageUrl(docMedia?.url)

  const displayName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    'مستخدم'
  const status = user.verificationStatus || 'pending_verification'

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveUser(user.id)
      if (result.ok) {
        toast.success('تم قبول المستخدم')
        router.refresh()
      }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectUser(user.id, rejectNote)
      if (result.ok) {
        toast.success('تم رفض المستخدم')
        setRejectDialogOpen(false)
        setRejectNote('')
        router.refresh()
      }
    })
  }

  const handleRoleChange = (role: 'admin' | 'librarian' | 'user') => {
    startTransition(async () => {
      const result = await updateUserRole(user.id, role)
      if (result.ok) {
        toast.success('تم تحديث الدور')
        router.refresh()
      } else {
        toast.error(result.error || 'تعذر تحديث الدور')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await softDeleteUser(user.id)
      if (result.ok) {
        toast.success('تم حذف المستخدم')
        router.push('/admin-panel/users')
      }
    })
  }

  return (
    <div dir="rtl" className="flex items-start gap-[33px] overflow-hidden">
      <SettingsProfileCard user={user} activeTab="info" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <AccountInfoSection user={user} canEditPhone={false} />

        {/* Role / actions */}
        <Card className="ring-0 border border-border">
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex-1 text-lg font-bold font-dubai text-[#243245]">
                إجراءات المسؤول
              </h3>
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
              <Badge
                className={`rounded-lg ${STATUS_CLASSES[status] || 'bg-muted text-muted-foreground'}`}
              >
                {STATUS_LABELS[status] || status}
              </Badge>
            </div>

            {status === 'rejected' && user.verificationNote ? (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                <span className="font-semibold">سبب الرفض: </span>
                {user.verificationNote}
              </div>
            ) : null}

            {docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-1.5 text-sm text-primary-300 hover:underline"
              >
                <FileText className="size-4" />
                وثيقة التحقق
              </a>
            ) : null}

            {status === 'pending_verification' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={handleApprove}
                  className="bg-[#0DE9C3] text-secondary hover:bg-[#0DE9C3]/90"
                >
                  <UserCheck className="me-1 size-4" />
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setRejectDialogOpen(true)}
                >
                  <UserX className="me-1 size-4" />
                  رفض
                </Button>
              </div>
            ) : null}

            <Separator />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">الدور</span>
              <Select
                value={user.role}
                onValueChange={(v) => v && handleRoleChange(v as 'admin' | 'librarian' | 'user')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مشرف</SelectItem>
                  <SelectItem value="librarian">أمين مكتبة</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Shield className="size-4" />
                المشرف: كامل الصلاحيات
              </p>
              <p className="flex items-center gap-2 ps-6">أمناء المكتبة: إدارة المكتبة فقط</p>
              <p className="flex items-center gap-2 ps-6">المستخدمون: بوابة المستخدم فقط</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoRow label="الكلية" value={user.faculty || ''} icon={GraduationCap} />
              <InfoRow
                label="سنة الدراسة"
                value={user.studyYear ? `السنة ${user.studyYear}` : ''}
                icon={GraduationCap}
              />
              <InfoRow
                label="الموافقة"
                value={
                  user.consentGiven
                    ? `ممنوحة ${user.consentTimestamp ? format(new Date(user.consentTimestamp), 'd MMM yyyy', { locale: arDZ }) : ''}`
                    : 'غير ممنوحة'
                }
                icon={CheckCircle2}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-fit"
            >
              <Trash2 className="me-1 size-4" />
              حذف المستخدم
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">رفض المستخدم</DialogTitle>
          </DialogHeader>
          <Textarea
            dir="rtl"
            placeholder="سبب الرفض (اختياري)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={pending}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={pending}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">حذف المستخدم</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف «{displayName}»؟ يمكنك التراجع لاحقاً عبر إعادة تفعيل الحساب.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={pending}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserDetail
