import { notFound } from 'next/navigation'
import { getAdminUser, getAdminUserHistory } from '@/features/admin/server/users'
import UserDetail from '@/features/admin/components/views/users/UserDetail'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Only the member lookup is allowed to 404. The history below is what makes
  // this page useful (SPEC §7.3), and swallowing its failure into a 404 would
  // hide a member who exists behind a route that says they do not.
  let user
  try {
    user = await getAdminUser(id)
  } catch {
    notFound()
  }

  if (!user) notFound()

  const history = await getAdminUserHistory(user.id)

  const displayName =
    user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || ''

  return (
    <AdminPage title={`المستخدمون / ${displayName}`}>
      <UserDetail user={user} history={history} />
    </AdminPage>
  )
}
