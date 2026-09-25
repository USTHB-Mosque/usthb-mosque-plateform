import { getAdminArticlesStats } from '@/features/admin'
import Articles from '@/components/admin-views/articles/Articles'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminArticlesPage() {
  const { stats } = await getAdminArticlesStats()

  return (
    <AdminPage title="المقالات">
      <Articles stats={stats} />
    </AdminPage>
  )
}
