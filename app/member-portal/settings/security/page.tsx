import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import SecuritySection from '@/features/profile/components/settings/SecuritySection'
import UserPage from '@/shared/layouts/user/UserPage'

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
      <div
        dir="rtl"
        className="flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-stroke-grey bg-background lg:border-0 lg:flex-row lg:items-start lg:gap-[33px]"
      >
        <SettingsProfileCard user={data.user} activeTab="security" />
        <SecuritySection user={data.user} />
      </div>
    </UserPage>
  )
}
