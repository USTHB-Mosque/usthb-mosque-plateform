import { getAdminDashboardStats } from '@/features/admin/server/dashboard'
import AdminDashboard from '@/features/admin/components/views/dashboard/Dashboard'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardStats()

  return (
    <AdminPage title="لوحة التحكم">
      <AdminDashboard
        stats={data.stats}
        upcomingReturns={data.upcomingReturns}
        upcomingPickups={data.upcomingPickups}
        latestReviews={data.latestReviews}
        recentActivityLogs={data.recentActivityLogs}
      />
    </AdminPage>
  )
}
