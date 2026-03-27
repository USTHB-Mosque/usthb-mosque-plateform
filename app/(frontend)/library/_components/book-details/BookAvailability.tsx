import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import Ratings from '@/components/common/Ratings'
import { Button } from '@/components/ui/button'
import { BookmarkPlus, BookSearch, Share, MapPin, Timer } from 'lucide-react'
import Separator from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface BookAvailabilityProps {}

const BookAvailability: React.FC<BookAvailabilityProps> = () => {
  const [day, setDay] = useState(1)
  return (
    <Card className="p-4 space-y-4">
      <CardHeader className="text-base">معلومات التوفر</CardHeader>
      <div className="space-y-4">
        <div className="flex gap-2">
          <BookSearch className="size-4 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">النسخ المتوفرة</p>
            <p className="font-bold">2 من 3</p>
          </div>
        </div>
        <div className="flex gap-2">
          <MapPin className="size-4 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">الموقع في المكتبة</p>
            <p className="font-bold">رف 3، قسم العلوم الشرعية</p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Timer className="size-4 text-primary" />
            <p className="text-muted-foreground">النسخ المتوفرة</p>
          </div>
          <div className="flex gap-4">
            <Slider
              dir="rtl"
              min={1}
              max={30}
              value={[day]}
              onValueChange={(value) => setDay(value[0])}
              className={cn(
                'w-full cursor-pointer',
                '**:data-[orientation=horizontal]:h-3',
                '[&_.bg-primary]:bg-primary',
                '**:[[role=slider]]:size-4 **:[[role=slider]]:bg-primary **:[[role=slider]]:border-primary',
              )}
            />
            <span className="whitespace-nowrap">{day} يوم</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookAvailability
