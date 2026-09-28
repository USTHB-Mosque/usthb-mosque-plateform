import { requireUser } from '@/shared/lib/auth'
import { getMyBookRequests } from '@/features/library/server/book-requests'
import BookRequestsPanel from '@/features/library/components/BookRequestsPanel'

export default async function BookRequestsPage() {
  await requireUser('/auth/login', { allowAdmin: true })
  const requests = await getMyBookRequests()
  return <BookRequestsPanel requests={requests} />
}
