import UserPage from '@/shared/layouts/user/UserPage'
import { getNotifications } from '@/features/notifications'
import NotificationsList from '@/features/notifications/components/NotificationsList'
import { NOTIFICATION_TYPES, type NotificationType } from '@/utils/notifications'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function readSeen(value: string | string[] | undefined): 'all' | 'unread' {
  return value === 'unread' ? 'unread' : 'all'
}

function readType(value: string | string[] | undefined): NotificationType | undefined {
  if (typeof value !== 'string') return undefined
  return NOTIFICATION_TYPES.find((option) => option.value === value)?.value
}

function readPage(value: string | string[] | undefined): number {
  const page = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isNaN(page) || page < 1 ? 1 : page
}

/**
 * The full notifications inbox (#17), served at /user/notifications through
 * the member-portal rewrite.
 */
export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const seen = readSeen(params.seen)
  const type = readType(params.type)
  const page = readPage(params.page)

  const data = await getNotifications({
    seen: seen === 'unread' ? false : undefined,
    type,
    page,
    limit: 10,
  })

  return (
    <UserPage title="الإشعارات">
      <NotificationsList data={data} seen={seen} type={type} />
    </UserPage>
  )
}
