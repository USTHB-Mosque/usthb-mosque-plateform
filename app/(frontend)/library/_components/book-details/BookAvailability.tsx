'use client'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { BookSearch, MapPin, Timer } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Book } from '@/payload-types'

interface BookAvailabilityProps {
  totalBooks: Book['totalBooks']
  availableBooks: Book['availableBooks']
  location: Book['location']
}

const BookAvailability: React.FC<BookAvailabilityProps> = ({
  totalBooks,
  availableBooks,
  location,
}) => {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <CardHeader className="text-lg font-semibold p-0">معلومات التوفر</CardHeader>
        
        <div className="flex items-start gap-3">
          <BookSearch className="text-primary size-5 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">النسخ المتوفرة</span>
            <span className="font-bold">{availableBooks} من {totalBooks}</span>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <MapPin className="text-primary size-5 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">الموقع في المكتبة</span>
            <span className="font-bold">{location}</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Timer className="text-primary size-5" />
            <span className="text-sm text-muted-foreground">مدة الاستعارة</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold min-w-[50px] text-end">14 يوم</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookAvailability