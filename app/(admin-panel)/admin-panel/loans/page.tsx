import { getAdminLoansStats } from '@/features/admin/server/loans'
import Loans from '@/components/admin-views/loans/Loans'
import LoansSectionNav from '@/components/admin-views/loans/LoansSectionNav'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function LoansPage() {
  const { stats } = await getAdminLoansStats()

  return (
    <AdminPage title="الإعارات">
      <div className="flex flex-col gap-4">
        <LoansSectionNav />
        <Loans stats={stats} />
      </div>
    </AdminPage>
  )
}
