import { getAdminLoansStats } from '@/features/admin/server/loans'
import Loans from '@/components/admin-views/loans/Loans'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function LoansPage() {
  const { stats } = await getAdminLoansStats()

  return (
    <AdminPage title="الإعارات">
      <Loans stats={stats} />
    </AdminPage>
  )
}
