import { getProfileDashboardData } from '@/actions/profile/dashboard'
import ProfileOverview from './_components/ProfileOverview'
import UserPage from '../UserPage'

export default async function DashboardProfilePage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="الملف الشخصي">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="الملف الشخصي">
      <ProfileOverview data={data} />
    </UserPage>
  )
}
