'use client'
import React from 'react'
import { Card, CardHeader } from '@/shared/ui/card'
import { BookSearch, MapPin, Timer } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
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
    <Card className="p-4 ring-0 border border-border">
      <div className="flex flex-col gap-4">
        <CardHeader className="text-lg font-semibold p-0">معلومات التوفر</CardHeader>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookSearch className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">النسخ المتوفرة</span>
          </div>
          <span className="text-base font-semibold text-card-foreground">
            {totalBooks ?? 0} / {availableBooks ?? 0}
          </span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">الموقع</span>
          </div>
          <span className="text-base font-semibold text-card-foreground">
            {location || 'غير محدد'}
          </span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">مدة الاستعارة</span>
          </div>
          <span className="text-base font-semibold text-card-foreground">7 أيام ← 21 يوم</span>
        </div>
      </div>
    </Card>
  )
}

export default BookAvailability
