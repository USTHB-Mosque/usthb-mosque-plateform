import { getPendingVerifications } from '@/features/admin/server/verification'
import VerificationQueue from '@/features/admin/components/views/verification/VerificationQueue'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function VerificationPage() {
  const users = await getPendingVerifications()

  return (
    <AdminPage title="قائمة التحقق">
      <VerificationQueue initialUsers={users} />
    </AdminPage>
  )
}
