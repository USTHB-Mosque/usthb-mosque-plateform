import { getAdminUsersStats } from '@/features/admin/server/users'
import Users from '@/components/admin-views/users/Users'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function UsersPage() {
  const { stats } = await getAdminUsersStats()

  return (
    <AdminPage title="المستخدمون">
      <Users stats={stats} />
    </AdminPage>
  )
}
