import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Activity, Media } from '@/payload-types'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'

interface ActivityCardProps {
  activity: Activity
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const media = activity.image as Media
  return (
    <Card className="">
      <CardContent className="p-0 flex">
        <Image
          src={media.url || ''}
          alt={media.alt || ''}
          width={400}
          height={300}
          className="w-full h-75 object-cover flex-1"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="flex-2 flex flex-col justify-between p-8">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <Calendar className="text-primary size-6" />
              <p className="text-foreground font-bold pt-1">
                {activity.startDate
                  ? format(new Date(activity.startDate), 'EEEE d MMMM yyyy', {
                      locale: arDZ,
                    })
                  : 'تاريخ غير محدد'}
              </p>
            </div>
            <p className="mb-3 text-foreground text-2xl font-bold">{activity.title}</p>
            <p className="text-muted-foreground">{activity.shortDescription}</p>
          </div>
          <div>
            <Link href={`/activities/${activity.id}`}>
              <Button variant="link">
                <span className="text-xl font-bold pt-1">اقرأ المزيد</span>
                <ArrowLeft className="text-primary size-6" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityCard
