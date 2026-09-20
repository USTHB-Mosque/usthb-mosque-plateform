import { Bookmark, CalendarCheck, LibraryBig, Newspaper } from 'lucide-react'
import type { Activity, ActivityRegistration, Media } from '@/payload-types'
import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import UserPage from '@/shared/layouts/user/UserPage'
import StatCard from '@/features/profile/components/dashboard/StatCard'
import BookReturnTable from '@/features/profile/components/dashboard/BookReturnTable'
import CalendarWidget from '@/features/profile/components/dashboard/CalendarWidget'
import ActivityStatusTable from '@/features/profile/components/dashboard/ActivityStatusTable'
import LoanStatusTable from '@/features/profile/components/dashboard/LoanStatusTable'
import { getImageUrl } from '@/shared/lib/image-utils'

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

  const registeredActivityIds = new Set(
    data.registrations.map((r) => {
      const activity = r.activity as Activity | undefined
      return activity?.id
    }),
  )

  const calendarEvents = data.activities.map((activity) => {
    const image = activity.image as Media | undefined
    return {
      date: activity.startDate,
      label: activity.title,
      image: getImageUrl(image?.url, ''),
      isRegistered: registeredActivityIds.has(activity.id),
      type: activity.type,
      location: activity.location ?? undefined,
    }
  })

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.href} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <CalendarWidget events={calendarEvents} />
        <BookReturnTable loans={activeLoans} className="lg:col-span-2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityStatusTable registrations={upcomingRegistrations} />
        <LoanStatusTable loans={activeLoans} />
      </div>
    </UserPage>
  )
}