import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminPage from '@/shared/layouts/admin/AdminPage'
import SettingsView from '@/components/admin-views/settings/SettingsView'
import { getAdminSecurityData } from '@/features/admin/server/account'
import { getAdminEmailSettings } from '@/features/admin/server/emails'
import {
  getAdminReauthenticationStatus,
  getAdminTwoFactorSettings,
} from '@/features/admin/server/security'
import SecurityGate from '@/features/admin/components/settings/SecurityGate'
import EmailSettings from '@/features/admin/components/settings/EmailSettings'
import PasswordForm from '@/features/admin/components/settings/PasswordForm'
import TwoFactorSettings from '@/features/admin/components/settings/TwoFactorSettings'
import LinkedDevices from '@/features/admin/components/settings/LinkedDevices'
import AccountLogs from '@/features/admin/components/settings/AccountLogs'

const titles: Record<string, string> = {
  email: 'البريد الإلكتروني',
  password: 'تغيير كلمة السر',
  '2fa': 'المصادقة الثنائية (2FA)',
  'linked-devices': 'الأجهزة المرتبطة',
  logs: 'سجل أحداث الحساب',
}

export default async function AdminSecuritySectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (!Object.hasOwn(titles, section)) notFound()
  const [data, emails, twoFactor, reauthentication] = await Promise.all([
    getAdminSecurityData(),
    getAdminEmailSettings(),
    getAdminTwoFactorSettings(),
    getAdminReauthenticationStatus(),
  ])
  if (!data || !emails || !twoFactor) notFound()
  const title = titles[section]
  return (
    <AdminPage title={title}>
      <SettingsView user={data.user} activeTab="security">
        <div className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:px-0">
          <nav
            aria-label="مسار إعدادات الحماية"
            className="flex flex-wrap gap-2 text-sm text-muted-foreground"
          >
            <Link href="/admin-panel/settings">الإعدادات</Link>
            <span aria-hidden="true">›</span>
            <Link href="/admin-panel/settings/security">الحماية</Link>
            <span aria-hidden="true">›</span>
            <span className="text-primary-300">{title}</span>
          </nav>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <SecurityGate expiresAt={reauthentication.expiresAt}>
            {section === 'email' && <EmailSettings addresses={emails.addresses} />}
            {section === 'password' && <PasswordForm />}
            {section === '2fa' && <TwoFactorSettings {...twoFactor} />}
            {section === 'linked-devices' && (
              <LinkedDevices
                sessions={data.user.sessions}
                currentSessionId={data.currentSessionId}
              />
            )}
            {section === 'logs' && <AccountLogs entries={data.accountLogs} user={data.user} />}
          </SecurityGate>
        </div>
      </SettingsView>
    </AdminPage>
  )
}
