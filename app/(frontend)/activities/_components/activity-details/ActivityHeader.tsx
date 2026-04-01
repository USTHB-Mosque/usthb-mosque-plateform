import React from 'react'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import Image from 'next/image'
import { Activity, Media } from '@/payload-types'
import { activitiesTypesConfig } from '@/utils/constants/activities'

interface ActivityHeaderProps {
  title: Activity['title']
  supervisor: Activity['supervisor']
  image: Activity['image']
  type: Activity['type']
}

const ActivityHeader = ({ title, supervisor, image, type }: ActivityHeaderProps) => {
  const media = image as Media
  return (
    <div className="flex flex-col h-75 p-8 relative">
      <Image
        src={media.url || ''}
        alt={media.alt || 'Activity'}
        className="rounded-xl object-cover absolute top-0 left-0 h-full w-full z-0"
        width={1200}
        height={300}
        sizes="(max-width: 768px) 100vw, 80vw"
      />
      <div className="flex-1" />
      <div className="flex-1 flex flex-col gap-4 z-10">
        <Badge className="px-6 py-2 text-xl bg-primary/40 border border-background">
          {activitiesTypesConfig[type]}
        </Badge>
        <p className="text-background text-3xl font-bold">{title}</p>
        <div className="flex gap-2.5">
          <User className="text-primary size-4" />
          <p className="text-background">تحت إشراف {supervisor}</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityHeader
