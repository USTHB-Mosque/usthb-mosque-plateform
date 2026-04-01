import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Activity } from '@/payload-types'

interface ActivityScheduleProps {
  schedules: Activity['schedules']
}

const ActivitySchedule = ({ schedules }: ActivityScheduleProps) => {
  console.log({ schedules })
  return (
    <Card className="p-6 space-y-6">
      <CardHeader>
        <CardTitle className="text-secondary text-2xl font-bold">البرنامج الزمني</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex">
            <p className="flex-1 text-muted-foreground">اليوم</p>
            <p className="flex-1 text-muted-foreground">التوقيت</p>
          </div>
          <Separator />
        </div>
        <div className="flex flex-col gap-6">
          {schedules?.map((schedule) => {
            const date = new Date(schedule.dateAndTime)
            const day = date.toLocaleDateString('ar-DZ', { weekday: 'long' })
            const time = date.toLocaleTimeString('ar-DZ', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
            return (
              <div key={schedule.dateAndTime} className="flex">
                <p className="flex-1 font-bold">{day}</p>
                <div className="flex-1 text-primary">{time}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivitySchedule
