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
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:rounded-ss-xl lg:p-8">
        {description ? (
          <p className="mb-4 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default UserPage
