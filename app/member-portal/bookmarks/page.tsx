import { getProfileDashboardData } from '@/actions/profile/dashboard'
import ProfileFavoritesGrid from '../settings/_components/ProfileFavoritesGrid'
import UserPage from '../UserPage'

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
    <UserPage title="المفضلة" description="كتب حفظتها لقراءتها لاحقًا.">
      <ProfileFavoritesGrid favorites={data.favorites} />
    </UserPage>
  )
}
