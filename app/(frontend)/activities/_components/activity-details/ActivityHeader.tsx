import React from 'react'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import Image from 'next/image'

type Props = {}

const ActivityHeader = (props: Props) => {
  return (
    <div className="flex flex-col h-75 p-8 relative">
      <Image
        src="/static/images/ramadan.png"
        alt="Activity"
        className="rounded-xl object-cover absolute top-0 left-0 h-full w-full z-0"
        width={0}
        height={0}
        sizes="100vw"
        priority
      />
      <div className="flex-1" />
      <div className="flex-1 flex flex-col gap-4 z-10">
        <Badge className="px-6 py-2 text-xl bg-primary/40 border border-background">
          أنشطة رمضان
        </Badge>
        <p className="text-background text-3xl font-bold">سلسلة أحكام الصيام</p>
        <div className="flex gap-2.5">
          <User className="text-primary size-4" />
          <p className="text-background">تحت إشراف أحد الطلبة</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityHeader
