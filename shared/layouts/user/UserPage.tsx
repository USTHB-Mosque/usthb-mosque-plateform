import React from 'react'
import UserPageHeader from '@/shared/layouts/user/UserPageHeader'

type UserPageProps = React.PropsWithChildren<{
  title: string
  description?: string
}>

const UserPage: React.FC<UserPageProps> = ({ title, description, children }) => {
  return (
    <div className="flex min-h-0 h-full flex-col bg-background-2">
      <UserPageHeader title={title} />
      <div className="md:mt-0 min-h-0 flex-1 overflow-y-auto">
        <div className="min-h-full space-y-6 rounded-2xl border border-tabs-active bg-background p-3 sm:p-4 lg:p-5">
          {description ? <p className="mb-4 text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export default UserPage
