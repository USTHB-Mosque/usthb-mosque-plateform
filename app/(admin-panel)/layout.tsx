import { redirect } from 'next/navigation'
import RootHtmlShell from '@/shared/root-html-shell'
import AdminSidebar from '@/shared/layouts/admin/AdminSidebar'
import AdminRouteGuard from '@/shared/layouts/admin/AdminRouteGuard'
import { getAuthenticatedUser } from '@/shared/lib/auth'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (!user) redirect('/auth/login?redirect=/admin-panel/dashboard')
  if (user.role === 'user') redirect('/user/dashboard')

  return (
    <RootHtmlShell>
      <AdminRouteGuard role={user.role}>
        <AdminSidebar
          userName={user.fullName ?? undefined}
          userEmail={user.email ?? undefined}
          role={user.role}
        >
          {children}
        </AdminSidebar>
      </AdminRouteGuard>
    </RootHtmlShell>
  )
}
