'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ActivityRegistration, User } from '@/payload-types'
import { decideActivityRegistration } from '@/features/admin'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'

const labels: Record<NonNullable<ActivityRegistration['status']>, string> = {
  pending: 'قيد المراجعة',
  accepted: 'مقبول',
  refused: 'مرفوض',
  quota_rejected: 'اكتمل العدد',
}

export default function AdminRegistrations({
  registrations,
  canDecide,
}: {
  registrations: ActivityRegistration[]
  canDecide: boolean
}) {
  const router = useRouter()
  const [refusing, setRefusing] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  function decide(id: number, status: 'accepted' | 'refused') {
    startTransition(async () => {
      const result = await decideActivityRegistration(id, status, reason)
      if (result.ok) {
        toast.success('تم تحديث التسجيل')
        setRefusing(null)
        setReason('')
        router.refresh()
      } else toast.error(result.error)
    })
  }

  return (
    <section dir="rtl" className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">تسجيلات النشاط ({registrations.length})</h2>
      {registrations.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد تسجيلات بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {registrations.map((registration) => (
            <li
              key={registration.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium">
                  {(registration.user as User).fullName ?? (registration.user as User).email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {labels[registration.status ?? 'pending']}
                  {registration.refusalReason ? ` — ${registration.refusalReason}` : ''}
                </p>
              </div>
              {canDecide && registration.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => decide(registration.id, 'accepted')}
                  >
                    قبول
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setRefusing(registration.id)}
                  >
                    رفض
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={refusing !== null}
        onOpenChange={(open) => {
          if (!open) setRefusing(null)
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض التسجيل</DialogTitle>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            سبب الرفض
            <textarea
              className="w-full rounded-md border border-border p-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefusing(null)}>
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() => {
                if (refusing !== null) decide(refusing, 'refused')
              }}
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
