import { getMyBookRequests } from '@/features/library/server/book-requests'
import BookRequestsPanel from '@/features/library/components/BookRequestsPanel'
import { requireUser } from '@/shared/lib/auth'

export const dynamic = 'force-dynamic'

export default async function BookRequestsPage() {
  await requireUser('/auth/login', { allowAdmin: true })
  const requests = await getMyBookRequests()
  return <BookRequestsPanel requests={requests} />
}
