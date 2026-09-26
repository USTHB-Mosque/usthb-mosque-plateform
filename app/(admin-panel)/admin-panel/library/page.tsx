import { getAdminLibraryStats } from '@/features/admin/server/library'
import Library from '@/components/admin-views/library/Library'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function LibraryPage() {
  const { stats } = await getAdminLibraryStats()

  return (
    <AdminPage title="المكتبة">
      <Library stats={stats} />
    </AdminPage>
  )
}
