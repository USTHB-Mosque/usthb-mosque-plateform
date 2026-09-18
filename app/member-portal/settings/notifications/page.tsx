import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'
import NotificationsSection from '@/features/profile/components/settings/NotificationsSection'
import UserPage from '../../UserPage'

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
      <div dir="rtl" className="flex items-start gap-[33px] overflow-hidden">
        <SettingsProfileCard user={data.user} activeTab="notifications" />
        <NotificationsSection initialPreferences={preferences} />
      </div>
    </UserPage>
  )
}
