import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, User } from 'lucide-react'
import ActivityDescriptionLine from './ActivityDescriptionLine'
import { Button } from '@/components/ui/button'
import { Activity } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'

interface ActivityDescriptionProps {
  supervisor: Activity['supervisor']
  location: Activity['location']
  startDate: Activity['startDate']
}

const ActivityDescription = ({ supervisor, location, startDate }: ActivityDescriptionProps) => {
  return (
    <Card className="p-6 space-y-6">
      <CardHeader>
        <CardTitle className="text-secondary text-2xl font-bold">التفاصيل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="space-y-8">
          <ActivityDescriptionLine
            icon={<User />}
            title="المشرف"
            description={`تحت إشراف ${supervisor}`}
          />
          <ActivityDescriptionLine icon={<MapPin />} title="الموقع" description={location || ''} />
          <ActivityDescriptionLine
            icon={<Calendar />}
            title="تاريخ البدء"
            description={
              startDate
                ? format(new Date(startDate), 'EEEE d MMMM yyyy', {
                    locale: arDZ,
                  })
                : 'تاريخ غير محدد'
            }
          />
        </div>
        <Separator />
        <div>
          <Button className="w-full text-xl text-foreground" size="lg">
            سجل الآن
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityDescription
