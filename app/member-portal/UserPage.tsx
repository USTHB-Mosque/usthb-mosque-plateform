import React from 'react'
import UserPageHeader from '@/components/layouts/user/UserPageHeader'

type UserPageProps = React.PropsWithChildren<{
  title: string
  description?: string
}>

const UserPage: React.FC<UserPageProps> = ({ title, description, children }) => {
  return (
    <div className="flex min-h-full flex-col">
      <UserPageHeader title={title} />
      <div className="flex-1 space-y-6 rounded-2xl border border-tabs-active bg-background p-3 sm:p-4 lg:p-5">
        {description ? (
          <p className="mb-4 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default UserPage
