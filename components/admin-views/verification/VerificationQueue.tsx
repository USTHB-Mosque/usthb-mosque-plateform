'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/textarea'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { User, Media } from '@/payload-types'
import { approveUser, rejectUser } from '@/features/admin/server/verification'
import { usersKeys } from '@/features/users/api/users.queries'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getImageUrl } from '@/shared/lib/image-utils'

interface VerificationQueueProps {
  initialUsers?: User[]
}

const VerificationQueue: React.FC<VerificationQueueProps> = ({ initialUsers }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const users = initialUsers ?? []
  const [pending, startTransition] = useTransition()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null)

  const handleApprove = (userId: number) => {
    startTransition(async () => {
      await approveUser(userId)
      toast.success('تم قبول المستخدم')
      queryClient.invalidateQueries({ queryKey: usersKeys.root })
      router.refresh()
    })
  }

  const handleReject = () => {
    if (!rejectingUserId) return
    startTransition(async () => {
      await rejectUser(rejectingUserId, rejectNote)
      toast.success('تم رفض المستخدم')
      setRejectDialogOpen(false)
      setRejectNote('')
      setRejectingUserId(null)
      queryClient.invalidateQueries({ queryKey: usersKeys.root })
      router.refresh()
    })
  }

  const openRejectDialog = (userId: number) => {
    setRejectingUserId(userId)
    setRejectNote('')
    setRejectDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {users.length === 0 ? (
        <Card className="ring-0 border border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-10 opacity-40" />
              <p className="text-sm">لا يوجد مستخدمون بانتظار التحقق</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {users.map((user) => {
            const doc = user.verificationDocument as Media | undefined
            const docUrl = getImageUrl(doc?.url)
            const displayName =
              user.fullName ||
              [user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.email

            return (
              <Card key={user.id} className="ring-0 border border-border">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-main-15">
                      <span className="text-lg font-bold text-primary-300 font-khalid">
                        {displayName?.charAt(0) || 'م'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold">{displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.faculty && (
                        <p className="text-xs text-muted-foreground">
                          {user.faculty} — سنة {user.studyYear}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.createdAt
                          ? format(new Date(user.createdAt), 'd MMM yyyy', { locale: arDZ })
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary-300 hover:underline"
                      >
                        <FileText className="size-4" />
                        وثيقة التحقق
                      </a>
                    )}
                    <Button
                      size="sm"
                      disabled={pending}
                      className="bg-[#0DE9C3] text-secondary hover:bg-[#0DE9C3]/90"
                      onClick={() => handleApprove(user.id)}
                    >
                      <CheckCircle2 className="me-1 size-4" />
                      قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => openRejectDialog(user.id)}
                    >
                      <XCircle className="me-1 size-4" />
                      رفض
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
    </div>
  )
}

export default VerificationQueue
