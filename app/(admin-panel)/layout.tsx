import { redirect } from 'next/navigation'
import RootHtmlShell from '@/shared/root-html-shell'
import AdminSidebar from '@/shared/layouts/admin/AdminSidebar'
import AdminRouteGuard from '@/shared/layouts/admin/AdminRouteGuard'
import { getAuthenticatedUser } from '@/shared/lib/auth'
import { getPendingLoansCount } from '@/features/admin/server/loans'

export const dynamic = 'force-dynamic'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (!user) redirect('/auth/login?redirect=/admin-panel/dashboard')
  if (user.role === 'user') redirect('/user/dashboard')

  // #65: the sidebar's loan badge. Only admins get one — a librarian's nav is
  // filtered to the library, so they have no الإعارات row to badge and
  // `getPendingLoansCount` would refuse them anyway.
  const badges =
    user.role === 'admin' ? { '/admin-panel/loans': await getPendingLoansCount() } : undefined

  return (
    <RootHtmlShell>
      <AdminRouteGuard role={user.role}>
        <AdminSidebar
          userName={user.fullName ?? undefined}
          userEmail={user.email ?? undefined}
          role={user.role}
          badges={badges}
        >
          {children}
        </AdminSidebar>
      </AdminRouteGuard>
    </RootHtmlShell>
  )
}
