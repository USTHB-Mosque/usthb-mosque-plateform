import React from 'react'
import UserPageHeader from '@/shared/layouts/user/UserPageHeader'

type UserPageProps = React.PropsWithChildren<{
  title: string
  description?: string
}>

const UserPage: React.FC<UserPageProps> = ({ title, description, children }) => {
  return (
    <div className="flex min-h-0 h-full flex-col">
      <UserPageHeader title={title} />
      <div className="flex-1 min-h-0 space-y-6 overflow-y-auto rounded-2xl border border-tabs-active bg-background p-3 sm:p-4 lg:p-5 [contain:layout]">
        {description ? (
          <p className="mb-4 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default UserPage
