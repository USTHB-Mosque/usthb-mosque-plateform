import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Bookmark, CalendarCheck, LibraryBig, Newspaper } from 'lucide-react'
import type { Activity, ActivityRegistration } from '@/payload-types'
import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import UserPage from '../UserPage'
import StatCard from '@/features/profile/components/dashboard/StatCard'
import LoansPreview from '@/features/profile/components/dashboard/LoansPreview'
import RegistrationsPreview from '@/features/profile/components/dashboard/RegistrationsPreview'
import ArticlesPreview from '@/features/profile/components/dashboard/ArticlesPreview'

function isUpcomingRegistration(registration: ActivityRegistration): boolean {
  if (registration.attended) return false
  const activity = registration.activity as Activity | undefined
  const start = activity?.startDate
    ? new Date(activity.startDate).getTime()
    : Number.POSITIVE_INFINITY
  return start >= Date.now()
}

export default async function MemberDashboardPage() {
  const data = await getProfileDashboardData()
  if (!data) {
    return (
      <UserPage title="لوحة التحكم">
        <div className="text-muted-foreground">لا يمكن تحميل البيانات.</div>
      </UserPage>
    )
  }

  const activeLoans = data.loans.filter(
    (loan) => loan.status === 'pending' || loan.status === 'approved' || loan.status === 'overdue',
  )
  const upcomingRegistrations = data.registrations.filter(isUpcomingRegistration)

  const stats = [
    {
      label: 'إعاراتي',
      value: activeLoans.length,
      icon: LibraryBig,
      href: '/user/my-loans',
    },
    {
      label: 'تسجيلاتي',
      value: upcomingRegistrations.length,
      icon: CalendarCheck,
      href: '/user/my-registrations',
    },
    {
      label: 'مفضّلتي',
      value: data.favorites.length,
      icon: Bookmark,
      href: '/user/bookmarks',
    },
    {
      label: 'المقالات',
      value: data.articles.length,
      icon: Newspaper,
      href: '/user/articles',
    },
  ]

  return (
    <UserPage title="لوحة التحكم">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-card-foreground">
          مرحباً، {data.user.fullName || 'عزيزي العضو'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: arDZ })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.href} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <LoansPreview loans={activeLoans} className="lg:col-span-2" />
        <div className="flex flex-col gap-6">
          <RegistrationsPreview registrations={upcomingRegistrations} />
          <ArticlesPreview articles={data.articles} />
        </div>
      </div>
    </UserPage>
  )
}