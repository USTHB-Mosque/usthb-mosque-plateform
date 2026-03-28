import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Activity, ActivityRegistration } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import EmptyData from '@/components/common/EmptyData'
import { CalendarDays, MapPin } from 'lucide-react'

type ProfileRegistrationsListProps = {
  registrations: ActivityRegistration[]
}

const ProfileRegistrationsList: React.FC<ProfileRegistrationsListProps> = ({ registrations }) => {
  if (registrations.length === 0) {
    return (
      <Card className="p-6">
        <CardContent className="py-12">
          <EmptyData title="لم تسجّل في أي نشاط بعد" />
          <div className="flex justify-center mt-4">
            <Link
              href="/activities"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              تصفح الأنشطة
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {registrations.map((reg) => {
        const activity = reg.activity as Activity
        if (!activity?.id) return null

        const start = activity.startDate ? new Date(activity.startDate) : null

        return (
          <Card key={reg.id} className="p-6">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-lg font-dubai leading-snug">{activity.title}</CardTitle>
                {reg.attended ? (
                  <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30">
                    تم الحضور
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-background">
                    مسجّل
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {activity.location ? (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>{activity.location}</span>
                </div>
              ) : null}
              {start ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-primary" />
                  <span>{format(start, 'd MMMM yyyy • HH:mm', { locale: arDZ })}</span>
                </div>
              ) : null}
              <Link
                href={`/activities/${activity.id}`}
                className="inline-flex text-primary font-medium text-sm underline-offset-4 hover:underline"
              >
                تفاصيل النشاط
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ProfileRegistrationsList
