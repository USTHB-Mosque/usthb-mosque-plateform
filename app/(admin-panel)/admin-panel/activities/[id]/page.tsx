import { notFound } from 'next/navigation'
import { getAdminActivity, getAdminActivityRegistrations } from '@/features/admin'
import AdminActivityDetail from '@/features/admin/components/views/activities/AdminActivityDetail'
import AdminRegistrations from '@/features/admin/components/views/activities/AdminRegistrations'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let activity
  try {
    activity = await getAdminActivity(id)
  } catch {
    notFound()
  }

  if (!activity) notFound()
  const { registrations, canDecide } = await getAdminActivityRegistrations(activity.id)

  return (
    <AdminPage title={`الأنشطة / ${activity.title}`}>
      <AdminActivityDetail activity={activity} />
      <AdminRegistrations registrations={registrations} canDecide={canDecide} />
    </AdminPage>
  )
}
