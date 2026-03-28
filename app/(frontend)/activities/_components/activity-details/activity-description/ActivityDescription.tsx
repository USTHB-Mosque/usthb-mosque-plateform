import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, User } from 'lucide-react'
import ActivityDescriptionLine from './ActivityDescriptionLine'

type Props = {}

const ActivityDescription = (props: Props) => {
  return (
    <Card className="p-6 space-y-6">
      <CardHeader>
        <CardTitle className="text-secondary text-2xl font-bold">التفاصيل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-8">
          <ActivityDescriptionLine
            icon={<User />}
            title="المشرف"
            description="تحت إشراف أحد الطلبة"
          />
          <ActivityDescriptionLine
            icon={<MapPin />}
            title="الموقع"
            description="عن بعد, عبر تطبيق ديسكورد"
          />
          <ActivityDescriptionLine
            icon={<Calendar />}
            title="تاريخ البدء"
            description="الإثنين 15 فيفري 2026"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityDescription
