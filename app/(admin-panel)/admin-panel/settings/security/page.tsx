import { getAdminSecurityData } from '@/features/admin/server/account'
import { getAdminEmailSettings } from '@/features/admin/server/emails'
import { getAdminTwoFactorSettings } from '@/features/admin/server/security'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import SecurityHub from '@/features/admin/components/settings/SecurityHub'

export default async function AdminSecuritySettingsPage() {
  const [data, emails, twoFactor] = await Promise.all([
    getAdminSecurityData(),
    getAdminEmailSettings(),
    getAdminTwoFactorSettings(),
  ])
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
        <SecurityHub
          verifiedEmails={emails?.verifiedCount ?? 0}
          enabled={twoFactor?.enabled ?? false}
          sessions={
            (data.user.sessions ?? []).filter((session) => new Date(session.expiresAt) > new Date())
              .length
          }
          logs={data.accountLogs.length}
        />
      </SettingsView>
    </AdminPage>
  )
}
