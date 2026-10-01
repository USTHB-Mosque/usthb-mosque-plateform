import ExtensionsQueue from '@/components/admin-views/loans/ExtensionsQueue'
import AdminPage from '@/shared/layouts/admin/AdminPage'

/**
 * The extension queue (#144). Reading happens client-side through React Query,
 * the same way the loans list does, so this page only places the screen.
 */
export default function AdminExtensionsPage() {
  return (
    <AdminPage title="الإعارات / طلبات التمديد">
      <ExtensionsQueue />
    </AdminPage>
  )
}
