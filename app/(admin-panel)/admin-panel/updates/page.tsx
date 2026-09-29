import AdminPage from '@/shared/layouts/admin/AdminPage'
import { getNotifications } from '@/features/notifications'
import NotificationsList from '@/features/notifications/components/NotificationsList'
import DigestButton from '@/features/notifications/components/DigestButton'
import { getAdminCtx } from '@/features/admin/server/ctx'
import { NOTIFICATION_TYPES, type NotificationType } from '@/utils/notifications'

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await getAdminCtx()
  const params = await searchParams
  const seen = params.seen === 'unread' ? 'unread' : 'all'
  const type: NotificationType | undefined = NOTIFICATION_TYPES.find(
    (item) => item.value === params.type,
  )?.value
  const page = Math.max(1, Number(params.page) || 1)
  const data = await getNotifications({
    seen: seen === 'unread' ? false : undefined,
    type,
    page,
    limit: 10,
  })
  return (
    <AdminPage title="آخر التحديثات">
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <DigestButton />
        </div>
        <NotificationsList
          data={data}
          seen={seen}
          type={type}
          now={new Date().toISOString()}
          inboxHref="/admin-panel/updates"
        />
      </div>
    </AdminPage>
  )
}
