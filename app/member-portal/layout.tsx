import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import UserSidebar from '@/components/layouts/user/UserSidebar'
import RootHtmlShell from '@/components/root-html-shell'
import { getAuthenticatedUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'بوابة العضو',
  robots: { index: false, follow: false },
}

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/auth/login')

  return (
    <RootHtmlShell>
      <UserSidebar userName={user.fullName ?? undefined} userEmail={user.email ?? undefined}>
        {children}
      </UserSidebar>
    </RootHtmlShell>
  )
}
