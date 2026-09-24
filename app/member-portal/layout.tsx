import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import UserSidebar from '@/shared/layouts/user/UserSidebar'
import RootHtmlShell from '@/shared/root-html-shell'
import { getAuthenticatedUser } from '@/shared/lib/auth'
import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'

export const metadata: Metadata = {
  title: 'بوابة المستخدم',
  robots: { index: false, follow: false },
}

// Auth state depends on request cookies; prerendering at build time would
// force a database connection during the build (which the Docker build does
// not have).
export const dynamic = 'force-dynamic'

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (!user) redirect('/auth/login?redirect=/user/dashboard')
  if (user.role === 'admin') redirect('/admin')

  const dashboard = await getProfileDashboardData()
  const activeLoans =
    dashboard?.loans.filter((loan) => ACTIVE_LOAN_STATUSES.includes(loan.status as never)).length ??
    0

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
