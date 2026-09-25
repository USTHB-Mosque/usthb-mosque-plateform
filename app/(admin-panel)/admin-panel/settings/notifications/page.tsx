import { getAdminSettingsData } from '@/features/admin/server/account'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import AdminSettingsNotificationPreferences from '@/components/admin-views/settings/AdminSettingsNotificationPreferences'

export default async function AdminNotificationsSettingsPage() {
  const data = await getAdminSettingsData()
  if (!data) {
    return (
      <AdminPage title="الإشعارات">
        <div className="text-sm text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </AdminPage>
    )
  }

  const prefs = data.user.notificationPreferences
  const initialPreferences = {
    loanRequests: prefs?.loanRequests ?? true,
    accountRequests: prefs?.accountRequests ?? true,
    loanExtensions: prefs?.loanExtensions ?? true,
    overdueReturns: prefs?.overdueReturns ?? true,
    newReviews: prefs?.newReviews ?? true,
    activityLogEvents: prefs?.activityLogEvents ?? true,
  }

  return (
    <AdminPage title="الإشعارات">
      <SettingsView user={data.user} activeTab="notifications">
        <AdminSettingsNotificationPreferences initialPreferences={initialPreferences} />
      </SettingsView>
    </AdminPage>
  )
}
