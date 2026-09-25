import { getAdminActivitiesStats } from '@/features/admin'
import Activities from '@/components/admin-views/activities/Activities'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminActivitiesPage() {
  const { stats } = await getAdminActivitiesStats()

  return (
    <AdminPage title="الأنشطة">
      <Activities stats={stats} />
    </AdminPage>
  )
}
