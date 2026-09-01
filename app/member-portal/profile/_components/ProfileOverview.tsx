'use client'

import React from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, ClipboardList, CalendarDays, Settings, ChevronLeft } from 'lucide-react'
import type { ActivityRegistration, BookFavorite, Loan, Media, User } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'

export type ProfileOverviewData = {
  user: User
  favorites: BookFavorite[]
  registrations: ActivityRegistration[]
  loans: Loan[]
}

type ProfileOverviewProps = {
  data: ProfileOverviewData
}

const sectionLinks = [
  {
    href: '/user/bookmarks',
    icon: Heart,
    title: 'المفضلة',
    description: 'الكتب التي حفظتها',
    getCount: (d: ProfileOverviewData) => d.favorites.length,
  },
  {
    href: '/user/my-loans',
    icon: ClipboardList,
    title: 'إعاراتي',
    description: 'إعاراتك من المكتبة',
    getCount: (d: ProfileOverviewData) => d.loans.length,
  },
  {
    href: '/user/my-registrations',
    icon: CalendarDays,
    title: 'تسجيلاتي',
    description: 'تسجيلاتك في الأنشطة',
    getCount: (d: ProfileOverviewData) => d.registrations.length,
  },
  {
    href: '/user/settings',
    icon: Settings,
    title: 'الإعدادات',
    description: 'البيانات وكلمة المرور',
    getCount: () => 0,
  },
]

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ data }) => {
  const { user, favorites, registrations, loans } = data
  const media = user.profilePicture as Media | undefined
  const avatarUrl = getImageUrl(media?.url)

  const overview = {
    user,
    favorites,
    registrations,
    loans,
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center gap-6 border-b border-border/60 bg-background-2/80 py-6 px-6">
          <Avatar className="h-20 w-20 border-2 border-primary/20 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={media?.alt || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold font-dubai">
              {user.fullName?.substring(0, 2).toUpperCase() ||
                user.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-2xl font-bold font-dubai truncate">
              {user.fullName || '—'}
            </CardTitle>
            <p className="text-base text-foreground/80 break-all">{user.email}</p>
          </div>
          <Link
            href="/user/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            تعديل البيانات
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sectionLinks.map((section) => {
          const Icon = section.icon
          const count = section.getCount(overview)
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/30">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
                      <Icon className="size-5 text-primary" />
                    </div>
                    {count > 0 ? (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-sm font-bold text-primary">
                        {count}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold font-dubai text-base">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default ProfileOverview
