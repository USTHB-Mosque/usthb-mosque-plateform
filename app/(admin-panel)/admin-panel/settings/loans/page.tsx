import { getAdminSettingsData } from '@/features/admin/server/account'
import { getAdminLoanSettings } from '@/features/admin/server/loan-settings'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import AdminLoanSettingsForm from '@/components/admin-views/settings/AdminLoanSettingsForm'

export default async function AdminLoanSettingsPage() {
  const data = await getAdminSettingsData()
  if (!data) {
    return (
      <AdminPage title="إعدادات الإعارة">
        <div className="text-sm text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </AdminPage>
    )
  }

  // Read through the same helper the loan gates use, so the form shows exactly
  // what will be enforced (and what the named constants fall back to if the
  // row is empty).
  const settings = await getAdminLoanSettings()

  return (
    <AdminPage title="إعدادات الإعارة">
      <SettingsView user={data.user} activeTab="loans">
        <AdminLoanSettingsForm
          initialSettings={{
            defaultLoanDurationDays: settings.defaultLoanDurationDays,
            borrowLimit: settings.borrowLimit,
          }}
        />
      </SettingsView>
    </AdminPage>
  )
}
