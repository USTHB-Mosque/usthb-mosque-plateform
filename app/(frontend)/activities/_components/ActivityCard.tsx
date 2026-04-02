import React from 'react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Activity, Media } from '@/payload-types'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { getImageUrl } from '@/utils/image-utils'

interface ActivityCardProps {
  activity: Activity
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const media = activity.image as Media
  const imageUrl = getImageUrl(media?.url)
  return (
    <Card className="flex flex-col md:flex-row">
      <div className="relative w-full md:w-[400px] h-48 md:h-75 flex-shrink-0">
        <Image
          src={imageUrl}
          alt={media?.alt || ''}
          fill
          className="object-cover rounded-t-xl md:rounded-l-xl md:rounded-tr-none"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="flex flex-col justify-between p-4 md:p-8 flex-1">
        <div>
          <div className="mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="text-primary size-4 sm:size-5 md:size-6" />
            <p className="text-foreground text-xs sm:text-sm md:text-base font-bold">
              {activity.startDate
                ? format(new Date(activity.startDate), 'EEEE d MMMM yyyy', {
                    locale: arDZ,
                  })
                : 'تاريخ غير محدد'}
            </p>
          </div>
          <p className="mb-2 sm:mb-3 text-foreground text-lg sm:text-xl md:text-2xl font-bold line-clamp-2">{activity.title}</p>
          <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 sm:line-clamp-3">{activity.shortDescription}</p>
        </div>
        <div className="mt-3 sm:mt-4">
          <Link href={`/activities/${activity.id}`}>
            <Button variant="link" className="p-0 h-auto text-xs sm:text-sm md:text-xl font-bold">
              <span>اقرأ المزيد</span>
              <ArrowLeft className="text-primary size-4 sm:size-5 md:size-6 mr-1" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default ActivityCard
