import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import UserSidebar from '@/shared/layouts/user/UserSidebar'
import RootHtmlShell from '@/shared/root-html-shell'
import { getAuthenticatedUser } from '@/shared/lib/auth'
import { getProfileDashboardData } from '@/features/profile/server/dashboard'

export const metadata: Metadata = {
  title: 'بوابة المستخدم',
  robots: { index: false, follow: false },
}

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (!user) redirect('/auth/login?redirect=/user/dashboard')
  if (user.role === 'admin') redirect('/admin')

  const dashboard = await getProfileDashboardData()
  const activeLoans = dashboard?.loans.filter((loan) => loan.status !== 'returned').length ?? 0

  return (
    <RootHtmlShell>
      <UserSidebar
        userName={user.fullName ?? undefined}
        userEmail={user.email ?? undefined}
        loansBadge={activeLoans}
      >
        {children}
      </UserSidebar>
    </RootHtmlShell>
  )
}
