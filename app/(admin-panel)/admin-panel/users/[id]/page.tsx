import { notFound } from 'next/navigation'
import { getAdminUser } from '@/features/admin/server/users'
import UserDetail from '@/components/admin-views/users/UserDetail'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let user
  try {
    user = await getAdminUser(id)
  } catch {
    notFound()
  }

  if (!user) notFound()

  const displayName =
    user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || ''

  return (
    <AdminPage title={`المستخدمون / ${displayName}`}>
      <UserDetail user={user} />
    </AdminPage>
  )
}
