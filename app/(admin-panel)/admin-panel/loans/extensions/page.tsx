import ExtensionsQueue from '@/components/admin-views/loans/ExtensionsQueue'
import LoansSectionNav from '@/components/admin-views/loans/LoansSectionNav'
import AdminPage from '@/shared/layouts/admin/AdminPage'

/**
 * The extension queue (#144). Reading happens client-side through React Query,
 * the same way the loans list does, so this page only places the screen.
 */
export default function AdminExtensionsPage() {
  return (
    <AdminPage title="الإعارات">
      <div className="flex flex-col gap-4">
        <LoansSectionNav />
        <ExtensionsQueue />
      </div>
    </AdminPage>
  )
}
