import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import UserSidebar from '@/components/layouts/user/UserSidebar'
import RootHtmlShell from '@/components/root-html-shell'
import { getAuthenticatedUser } from '@/lib/auth'
import { getProfileDashboardData } from '@/actions/profile/dashboard'

export const metadata: Metadata = {
  title: 'بوابة المستخدم',
  robots: { index: false, follow: false },
}

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/auth/login')

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
