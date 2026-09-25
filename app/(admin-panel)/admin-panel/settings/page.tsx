import { getAdminSettingsData, updateAdminPhone } from '@/features/admin/server/account'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import AccountInfoSection from '@/features/profile/components/settings/AccountInfoSection'

export default async function AdminSettingsPage() {
  const data = await getAdminSettingsData()
  if (!data) {
    return (
      <AdminPage title="الإعدادات">
        <div className="text-sm text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </AdminPage>
    )
  }

  return (
    <AdminPage title="الإعدادات">
      <SettingsView user={data.user} activeTab="info">
        <AccountInfoSection user={data.user} onSavePhone={updateAdminPhone} />
      </SettingsView>
    </AdminPage>
  )
}
