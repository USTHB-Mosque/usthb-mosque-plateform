'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import ActivityHeader from '@/features/activities/components/activity-details/ActivityHeader'
import ActivityInformations from '@/features/activities/components/activity-details/ActivityInformations'
import ActivityDescription from '@/features/activities/components/activity-details/activity-description/ActivityDescription'
import ActivitySchedule from '@/features/activities/components/activity-details/ActivitySchedule'
import AddActivityDialog from './AddActivityDialog'
import { deleteActivity } from '@/features/admin'
import { activitiesKeys } from '@/features/activities/api/activities.queries'
import type { Activity } from '@/payload-types'

interface AdminActivityDetailProps {
  activity: Activity
}

const AdminActivityDetail: React.FC<AdminActivityDetailProps> = ({ activity }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)

  const runDelete = async () => {
    setConfirmPending(true)
    try {
      const result = await deleteActivity(activity.id)
      if (result.ok) {
        toast.success('تم حذف النشاط')
        queryClient.invalidateQueries({ queryKey: activitiesKeys.root })
        router.push('/admin-panel/activities')
      } else {
        toast.error(result.error)
      }
      setConfirmOpen(false)
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ReturnToIndex title="فهرس الأنشطة" value={activity.title} href="/admin-panel/activities" />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="gap-2"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          حذف
        </Button>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-3 flex-col gap-8">
          <ActivityHeader
            title={activity.title}
            supervisor={activity.supervisor}
            image={activity.image}
            type={activity.type}
          />
          <ActivityInformations longDescription={activity.longDescription} />
        </div>

        <div className="flex flex-1 flex-col gap-8">
          <ActivityDescription
            activityId={String(activity.id)}
            supervisor={activity.supervisor}
            location={activity.location}
            startDate={activity.startDate}
            openForRegistration={activity.openForRegistration || false}
            hideRegister
          />
          <ActivitySchedule schedules={activity.schedules} />
        </div>
      </div>

      <AddActivityDialog
        key={`edit-${activity.id}`}
        activity={activity}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!confirmPending}>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">حذف النشاط</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف «{activity.title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={confirmPending}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={runDelete} disabled={confirmPending}>
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
    </div>
  )
}

export default AdminActivityDetail
