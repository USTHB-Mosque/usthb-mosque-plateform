import { getPendingLoans } from '@/features/admin/server/loans'
import LoanManagement from '@/components/admin-views/loans/LoanManagement'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function PendingLoansPage() {
  const loans = await getPendingLoans()

  return (
    <AdminPage title="طلبات الإعارة المعلقة">
      <LoanManagement loans={loans} mode="pending" />
    </AdminPage>
  )
}
