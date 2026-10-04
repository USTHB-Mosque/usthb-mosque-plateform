import { getAdminSettingsData } from '@/features/admin/server/account'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/features/admin/components/views/settings/SettingsView'
import AccountInfoForm from '@/features/admin/components/settings/AccountInfoForm'

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
        <AccountInfoForm user={data.user} />
      </SettingsView>
    </AdminPage>
  )
}
