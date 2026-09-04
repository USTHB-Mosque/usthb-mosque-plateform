import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import RegistrationsTable from '@/features/activities/components/RegistrationsTable'
import UserPage from '../UserPage'

export default async function DashboardMyRegistrationsPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="تسجيلاتي">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="تسجيلاتي">
      <RegistrationsTable registrations={data.registrations} />
    </UserPage>
  )
}