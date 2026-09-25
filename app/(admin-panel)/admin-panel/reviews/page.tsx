import AdminPage from '@/shared/layouts/admin/AdminPage'
import ReviewsView from '@/components/admin-views/reviews/ReviewsView'
import { getAdminReviews, getReviewKpis } from '@/features/admin/server/reviews'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const [kpis, reviews] = await Promise.all([
    getReviewKpis(),
    getAdminReviews({ page: 1, limit: 20 }),
  ])

  return (
    <AdminPage title="آراء القرّاء">
      <ReviewsView initialKpis={kpis} initialReviews={reviews} />
    </AdminPage>
  )
}
