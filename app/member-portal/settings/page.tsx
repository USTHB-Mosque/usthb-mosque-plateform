import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import AccountInfoSection from '@/features/profile/components/settings/AccountInfoSection'
import UserPage from '@/shared/layouts/user/UserPage'

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
    <UserPage title="الإعدادات">
      <div dir="rtl" className="flex items-start gap-[33px] overflow-hidden">
        <SettingsProfileCard user={data.user} activeTab="info" />
        <AccountInfoSection user={data.user} />
      </div>
    </UserPage>
  )
}
