'use client'

import React from 'react'
import Layout from '@/components/layouts'
import UserSidebar from '@/components/layouts/user/UserSidebar'

type LibraryShellProps = React.PropsWithChildren<{
  user?: { fullName?: string | null; email?: string | null } | null
}>

const LibraryShell: React.FC<LibraryShellProps> = ({ user, children }) => {
  if (!user) {
    return <Layout>{children}</Layout>
  }

  return (
    <UserSidebar userName={user.fullName ?? undefined} userEmail={user.email ?? undefined}>
      {children}
    </UserSidebar>
  )
}

export default LibraryShell
