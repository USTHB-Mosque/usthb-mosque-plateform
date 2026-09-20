import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { CalendarDays, Clock } from 'lucide-react'
import { Activity } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'

interface ActivityScheduleProps {
  schedules: Activity['schedules']
}

const ActivitySchedule = ({ schedules }: ActivityScheduleProps) => {
  if (!schedules || schedules.length === 0) {
    return (
      <Card className="p-4 ring-0 border border-border">
        <div className="flex flex-col gap-4">
          <CardHeader className="text-xl font-bold p-0">البرنامج الزمني</CardHeader>
          <Separator />
          <p className="text-sm text-muted-foreground">لم يُحدد برنامج زمني بعد.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 ring-0 border border-border">
      <div className="flex flex-col gap-4">
        <CardHeader className="text-xl font-bold p-0">البرنامج الزمني</CardHeader>
        <Separator />

        <div className="flex flex-col gap-0">
          {schedules.map((schedule, index) => {
            const date = new Date(schedule.dateAndTime)
            const dayName = format(date, 'EEEE', { locale: arDZ })
            const dayDate = format(date, 'd MMMM yyyy', { locale: arDZ })
            const time = format(date, 'HH:mm', { locale: arDZ })

            return (
              <div key={`${schedule.dateAndTime}-${index}`}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-5 text-primary" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-card-foreground">{dayName}</span>
                      <span className="text-sm text-muted-foreground">{dayDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" />
                    <span className="text-base font-semibold text-card-foreground">{time}</span>
                  </div>
                </div>
                {index < schedules.length - 1 && <Separator />}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default ActivitySchedule
