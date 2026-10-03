import React from 'react'
import { Badge } from '@/shared/ui/badge'
import { User } from 'lucide-react'
import Image from 'next/image'
import { Activity, Media } from '@/payload-types'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import { getImageUrl } from '@/shared/lib/image-utils'

interface ActivityHeaderProps {
  title: Activity['title']
  supervisor: Activity['supervisor']
  image: Activity['image']
  type: Activity['type']
}

const ActivityHeader = ({ title, supervisor, image, type }: ActivityHeaderProps) => {
  const media = image as Media
  const imageUrl = getImageUrl(media?.url)
  // #164: tighter side padding and a smaller title and tag on phones
  return (
    <div className="flex flex-col h-75 py-8 px-4 sm:px-8 relative">
      <Image
        src={imageUrl}
        alt={media?.alt || 'Activity'}
        className="rounded-xl object-cover absolute top-0 start-0 h-full w-full z-0"
        width={1200}
        height={300}
        sizes="(max-width: 768px) 100vw, 80vw"
      />
      <div className="flex-1" />
      <div className="flex-1 flex flex-col gap-4 z-10">
        <Badge className="px-4 py-1 text-base sm:px-6 sm:py-2 sm:text-xl bg-primary/40 border border-background">
          {activitiesTypesConfig[type]}
        </Badge>
        <p className="text-fill-white text-2xl font-bold sm:text-3xl">{title}</p>
        <div className="flex gap-2.5">
          <User className="text-primary size-4" />
          <p className="text-fill-white">تحت إشراف {supervisor}</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityHeader
