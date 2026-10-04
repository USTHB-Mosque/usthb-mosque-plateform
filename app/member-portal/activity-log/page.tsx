import UserPage from '@/shared/layouts/user/UserPage'
import { ActivityLogTimeline, getActivityLog } from '@/features/profile'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function readPage(value: string | string[] | undefined): number {
  const page = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isNaN(page) || page < 1 ? 1 : page
}

/**
 * The member's history (#165), served at /user/activity-log through the
 * member-portal rewrite. Everything is derived and read server-side; the page
 * only carries the page number.
 */
export default async function ActivityLogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const data = await getActivityLog({ page: readPage(params.page), limit: 15 })

  return (
    <UserPage title="سجل الأحداث" description="سجل نشاطك وحركتك داخل بوابة المستخدم">
      <ActivityLogTimeline data={data} />
    </UserPage>
  )
}
