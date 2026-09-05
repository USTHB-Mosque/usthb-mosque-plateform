import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import UserPage from '../UserPage'
import LoansTable from '@/features/library/components/LoansTable'

export default async function DashboardMyLoansPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="إعاراتي">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="إعاراتي">
      <LoansTable loans={data.loans} />
    </UserPage>
  )
}