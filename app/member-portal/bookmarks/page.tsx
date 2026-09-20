import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import ProfileFavoritesGrid from '@/features/profile/components/settings/ProfileFavoritesGrid'
import ProfileArticleFavoritesGrid from '@/features/profile/components/settings/ProfileArticleFavoritesGrid'
import UserPage from '../UserPage'
import BookmarksTabs from './BookmarksTabs'

export default async function DashboardBookmarksPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="المفضلة">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="المفضلة">
      <BookmarksTabs
        booksTab={<ProfileFavoritesGrid favorites={data.favorites} />}
        articlesTab={<ProfileArticleFavoritesGrid favorites={data.articleFavorites} />}
      />
    </UserPage>
  )
}
