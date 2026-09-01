import { getProfileDashboardData } from '@/actions/profile/dashboard'
import ProfileRegistrationsList from '../profile/_components/ProfileRegistrationsList'
import UserPage from '../UserPage'

export default async function DashboardMyActivitiesPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="أنشطتي">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="أنشطتي" description="الأنشطة التي سجّلت فيها.">
      <ProfileRegistrationsList registrations={data.registrations} />
    </UserPage>
  )
}
