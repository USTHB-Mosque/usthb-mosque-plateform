import { getProfileDashboardData } from '@/actions/profile/dashboard'
import ProfileLoansList from '../profile/_components/ProfileLoansList'
import UserPage from '../UserPage'

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
    <UserPage title="إعاراتي" description="تتبع حالة إعاراتك من المكتبة.">
      <ProfileLoansList loans={data.loans} />
    </UserPage>
  )
}
