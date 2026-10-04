import WaitlistQueue from '@/features/admin/components/views/loans/WaitlistQueue'
import AdminPage from '@/shared/layouts/admin/AdminPage'

/**
 * The waitlist queue (#144). Reading happens client-side through React Query,
 * the same way the loans list does, so this page only places the screen.
 */
export default function AdminWaitlistPage() {
  return (
    <AdminPage title="الإعارات / قائمة الانتظار">
      <WaitlistQueue />
    </AdminPage>
  )
}
