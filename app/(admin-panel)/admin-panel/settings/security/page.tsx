import { changeAdminPassword, getAdminSettingsData } from '@/features/admin/server/account'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import SecuritySection from '@/features/profile/components/settings/SecuritySection'

export default async function AdminSecuritySettingsPage() {
  const data = await getAdminSettingsData()
  if (!data) {
    return (
      <AdminPage title="الحماية">
        <div className="text-sm text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </AdminPage>
    )
  }

  return (
    <AdminPage title="الحماية">
      <SettingsView user={data.user} activeTab="security">
        <SecuritySection user={data.user} onChangePassword={changeAdminPassword} />
      </SettingsView>
    </AdminPage>
  )
}
