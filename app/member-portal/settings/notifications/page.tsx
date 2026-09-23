import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import NotificationsSection from '@/features/profile/components/settings/NotificationsSection'
import UserPage from '@/shared/layouts/user/UserPage'

export default async function NotificationsSettingsPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="الإشعارات">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  const preferences = {
    loanRequests: data.user.notificationPreferences?.loanRequests ?? true,
    activityRegistrations: data.user.notificationPreferences?.activityRegistrations ?? true,
    loanExtensions: data.user.notificationPreferences?.loanExtensions ?? true,
    loanReturnReminder: data.user.notificationPreferences?.loanReturnReminder ?? true,
  }

  return (
    <UserPage title="الإشعارات">
      <div
        dir="rtl"
        className="flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-stroke-grey bg-background lg:border-0 lg:flex-row lg:items-start lg:gap-[33px]"
      >
        <SettingsProfileCard user={data.user} activeTab="notifications" />
        <NotificationsSection initialPreferences={preferences} />
      </div>
    </UserPage>
  )
}
