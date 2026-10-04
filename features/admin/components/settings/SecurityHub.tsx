import Link from 'next/link'
import { Mail, KeyRound, ShieldCheck, Monitor, History } from 'lucide-react'

export default function SecurityHub({
  verifiedEmails,
  enabled,
  sessions,
  logs,
}: {
  verifiedEmails: number
  enabled: boolean
  sessions: number
  logs: number
}) {
  const groups = [
    {
      title: 'خيارات تسجيل الدخول',
      items: [
        {
          slug: 'email',
          label: 'البريد الإلكتروني',
          subtitle: `البريد الإلكتروني المُوَثَّق: ${verifiedEmails}`,
          icon: Mail,
          action: 'إدارة',
        },
        {
          slug: 'password',
          label: 'كلمة السر',
          subtitle: 'مُعَدَّة',
          icon: KeyRound,
          action: 'تغيير',
        },
        {
          slug: '2fa',
          label: 'المصادقة الثنائية (2FA)',
          subtitle: enabled ? 'مُفَعَّلة' : 'غير مفعلة',
          icon: ShieldCheck,
          action: 'إدارة',
        },
      ],
    },
    {
      title: 'نشاط الحساب',
      items: [
        {
          slug: 'linked-devices',
          label: 'الأجهزة المرتبطة',
          subtitle: `عدد الجلسات النشطة: ${sessions}`,
          icon: Monitor,
          action: 'إدارة',
        },
        {
          slug: 'logs',
          label: 'سجل أحداث الحساب',
          subtitle: `الأحداث المسجلة: ${logs}`,
          icon: History,
          action: 'تفقد',
        },
      ],
    },
  ]
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 sm:p-6 lg:px-0">
      {groups.map((group) => (
        <section key={group.title} className="space-y-6">
          <h2 className="text-xl font-bold text-foreground">{group.title}</h2>
          <div className="divide-y divide-stroke-grey rounded-xl border border-stroke-grey bg-background-2">
            {group.items.map(({ slug, label, subtitle, icon: Icon, action }) => (
              <div key={slug} className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <Icon className="size-9 shrink-0 text-primary-300" aria-hidden="true" />
                  <div className="min-w-0 space-y-2">
                    <h3 className="text-base font-khalid">{label}</h3>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  </div>
                </div>
                <Link
                  href={`/admin-panel/settings/security/${slug}`}
                  aria-label={`${action} ${label}`}
                  className="shrink-0 rounded-lg bg-primary-main-15 px-6 py-2 text-sm font-bold text-primary-300 hover:bg-primary-main-20"
                >
                  {action}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
