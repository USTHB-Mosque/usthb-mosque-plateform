import AdminPage from '@/shared/layouts/admin/AdminPage'
import ActivityLogView from '@/components/admin-views/logs/ActivityLogView'
import { getAdminLogs } from '@/features/admin/server/logs'

export const dynamic = 'force-dynamic'

export default async function ActivityLogPage() {
  const logs = await getAdminLogs({ page: 1, limit: 50 })

  return (
    <AdminPage title="سجل الأحداث">
      <ActivityLogView initial={logs} />
    </AdminPage>
  )
}
