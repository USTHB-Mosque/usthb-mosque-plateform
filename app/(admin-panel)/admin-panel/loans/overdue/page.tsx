import { getOverdueLoans } from '@/features/admin/server/loans'
import LoanManagement from '@/components/admin-views/loans/LoanManagement'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function OverdueLoansPage() {
  const loans = await getOverdueLoans()

  return (
    <AdminPage title="الإعارات المتأخرة">
      <LoanManagement loans={loans} mode="overdue" />
    </AdminPage>
  )
}
