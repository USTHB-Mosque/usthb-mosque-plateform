import { getAdminActivitiesStats } from '@/features/admin'
import Activities from '@/features/admin/components/views/activities/Activities'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminActivitiesPage() {
  const { stats, calendarActivities } = await getAdminActivitiesStats()

  return (
    <AdminPage title="الأنشطة">
      <Activities stats={stats} calendarActivities={calendarActivities} />
    </AdminPage>
  )
}
