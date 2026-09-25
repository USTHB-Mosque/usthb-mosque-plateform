import AdminPage from '@/shared/layouts/admin/AdminPage'
import VerificationQueue from '@/components/admin-views/verification/VerificationQueue'
import { getPendingVerifications } from '@/features/admin/server/verification'

export default async function UsersPendingPage() {
  const users = await getPendingVerifications()

  return (
    <AdminPage title="المستخدمون / قيد الانتظار">
      <VerificationQueue initialUsers={users} />
    </AdminPage>
  )
}
