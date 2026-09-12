import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import SecuritySection from '@/features/profile/components/settings/SecuritySection'
import UserPage from '../../UserPage'

export default async function SecuritySettingsPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="الحماية">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  return (
    <UserPage title="الحماية">
      <div dir="rtl" className="flex items-start gap-[33px] overflow-hidden">
        <SettingsProfileCard user={data.user} activeTab="security" />
        <SecuritySection />
      </div>
    </UserPage>
  )
}
