'use client'
import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { BookSearch, MapPin, Timer } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Book } from '@/payload-types'

interface BookAvailabilityProps {
  totalBooks: Book['totalBooks']
  availableBooks: Book['availableBooks']
  location: Book['location']
}

const RangeSlider = ({
  min = 1,
  max = 30,
  value,
  onValueChange,
  className,
}: {
  min?: number
  max?: number
  value: number
  onValueChange: (value: number) => void
  className?: string
}) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        'w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer',
        '[&::-webkit-slider-thumb]:appearance-none',
        '[&::-webkit-slider-thumb]:w-4',
        '[&::-webkit-slider-thumb]:h-4',
        '[&::-webkit-slider-thumb]:rounded-full',
        '[&::-webkit-slider-thumb]:bg-primary',
        '[&::-webkit-slider-thumb]:border',
        '[&::-webkit-slider-thumb]:border-primary',
        '[&::-webkit-slider-thumb]:cursor-pointer',
        '[&::-moz-range-thumb]:w-4',
        '[&::-moz-range-thumb]:h-4',
        '[&::-moz-range-thumb]:rounded-full',
        '[&::-moz-range-thumb]:bg-primary',
        '[&::-moz-range-thumb]:border',
        '[&::-moz-range-thumb]:border-primary',
        '[&::-moz-range-thumb]:cursor-pointer',
        className
      )}
    />
  )
}

const BookAvailability: React.FC<BookAvailabilityProps> = ({
  totalBooks,
  availableBooks,
  location,
}) => {
  const [day, setDay] = useState(1)
  return (
    <Card className="p-4 space-y-4">
      <CardHeader className="text-base">معلومات التوفر</CardHeader>
      <div className="space-y-4">
        <div className="flex gap-2">
          <BookSearch className="size-4 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">النسخ المتوفرة</p>
            <p className="font-bold">
              {availableBooks} من {totalBooks}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <MapPin className="size-4 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">الموقع في المكتبة</p>
            <p className="font-bold">{location}</p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Timer className="size-4 text-primary" />
            <p className="text-muted-foreground">مدة الاستعارة</p>
          </div>
          <div className="flex gap-4">
            <RangeSlider
              min={1}
              max={30}
              value={day}
              onValueChange={setDay}
              className="w-full cursor-pointer"
            />
            <span className="whitespace-nowrap">{day} يوم</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookAvailability
