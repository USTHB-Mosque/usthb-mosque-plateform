import { getActiveLoans } from '@/features/admin/server/loans'
import LoanManagement from '@/components/admin-views/loans/LoanManagement'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function ActiveLoansPage() {
  const loans = await getActiveLoans()

  return (
    <AdminPage title="الإعارات النشطة">
      <LoanManagement loans={loans} mode="active" />
    </AdminPage>
  )
}
