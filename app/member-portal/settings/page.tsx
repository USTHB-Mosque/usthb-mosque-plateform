import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import ProfileAccountForm from '@/features/profile/components/settings/ProfileAccountForm'
import ProfilePasswordForm from '@/features/profile/components/settings/ProfilePasswordForm'
import UserPage from '../UserPage'

export default async function DashboardSettingsPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="الإعدادات">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="الإعدادات" description="إدارة بياناتك الشخصية وكلمة المرور.">
      <div className="max-w-xl space-y-6">
        <ProfileAccountForm defaultFullName={data.user.fullName || ''} />
        <ProfilePasswordForm />
      </div>
    </UserPage>
  )
}
