import React from 'react'
import AdminPageHeader from '@/shared/layouts/admin/AdminPageHeader'

type AdminPageProps = React.PropsWithChildren<{
  title: string
}>

const AdminPage: React.FC<AdminPageProps> = ({ title, children }) => {
  return (
    <div className="flex min-h-0 h-full flex-col">
      <AdminPageHeader title={title} />
      <div className="flex-1 min-h-0 space-y-6 overflow-y-auto rounded-2xl border border-tabs-active bg-background p-3 sm:p-4 lg:p-5 [contain:layout]">
        {children}
      </div>
    </div>
  )
}

export default AdminPage
