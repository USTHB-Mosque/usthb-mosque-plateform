import AdminPage from '@/shared/layouts/admin/AdminPage'
import AnalyticsView from '@/components/admin-views/stats/AnalyticsView'
import { getAdminAnalytics } from '@/features/admin/server/analytics'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const from = new Date(new Date().getFullYear(), 0, 1)
  const analytics = await getAdminAnalytics({ from: from.toISOString() })

  return (
    <AdminPage title="الإحصائيات">
      <AnalyticsView initial={analytics} />
    </AdminPage>
  )
}
