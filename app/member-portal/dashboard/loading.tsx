import { Skeleton } from '@/shared/ui/skeleton'
import UserPage from '../UserPage'

export default function MemberDashboardLoading() {
  return (
    <UserPage title="لوحة التحكم">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </UserPage>
  )
}