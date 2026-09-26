import { notFound } from 'next/navigation'
import { getAdminActivity } from '@/features/admin'
import AdminActivityDetail from '@/components/admin-views/activities/AdminActivityDetail'
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

  return (
    <AdminPage title={`الأنشطة / ${activity.title}`}>
      <AdminActivityDetail activity={activity} />
    </AdminPage>
  )
}
