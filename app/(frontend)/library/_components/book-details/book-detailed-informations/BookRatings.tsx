'use client'

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Ratings from '@/components/common/Ratings'
import { Star } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Review {
  user: string
  date: string
  rating: number
  text: string
}

const reviews: Review[] = [
  {
    user: 'أحمد بن علي',
    date: '12 مارس 2026',
    rating: 5,
    text: 'كتاب قيم جدًا، شرح واضح وأساليب عملية للتدبر. أنصح به لكل طالب علم.',
  },
  {
    user: 'فاطمة محمود',
    date: '5 فبراير 2026',
    rating: 4.5,
    text: 'محتوى ممتع وملهم، يحتوي على أمثلة تفسيرية مفيدة. أضيفته إلى مكتبتي.',
  },
  {
    user: 'يوسف الشريف',
    date: '28 يناير 2026',
    rating: 4,
    text: 'عرض جيد ومرتب. هناك بعض الأقسام يمكن توضيحها أكثر، لكن القيمة العلمية ممتازة.',
  },
]

const BookRatings = () => {
  const [ratingList, setRatingList] = React.useState<Review[]>(reviews)
  const [comment, setComment] = React.useState('')
  const [name, setName] = React.useState('')
  const [rating, setRating] = React.useState(5)

  const averageRating =
    ratingList.reduce((total, item) => total + item.rating, 0) / (ratingList.length || 1)
  const ratingCount = ratingList.length

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim() || !comment.trim()) return

    const newReview: Review = {
      user: name.trim(),
      date: new Date().toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      rating,
      text: comment.trim(),
    }

    setRatingList((prev) => [newReview, ...prev])
    setName('')
    setComment('')
    setRating(5)
  }

  return (
    <Card className="p-4 space-y-4 border-none rounded-none">
      <CardHeader className="text-base">التقييمات والمراجعات</CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">متوسط التقييم</p>
              <h3 className="text-2xl font-bold">{averageRating.toFixed(1)}</h3>
            </div>
            <Ratings averageRating={averageRating} ratingCount={ratingCount} />
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>مجموعة {ratingCount} تقييم في المكتبة</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-border p-4 bg-background"
        >
          <h4 className="text-sm font-semibold">أضف تقييمًا ومراجعة</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
            />
            <Select
              dir="rtl"
              value={rating.toString()}
              onValueChange={(value) => setRating(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر التقييم" />
              </SelectTrigger>

              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => i + 1).map((starValue) => (
                  <SelectItem key={starValue} value={starValue.toString()}>
                    {starValue} {starValue === 1 ? 'نجمة' : 'نجوم'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-24 resize-none overflow-y-auto"
            placeholder="اكتب مراجعتك هنا..."
          />

          <button
            type="submit"
            className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            إرسال التقييم
          </button>
        </form>

        <div className="space-y-3">
          {ratingList.map((review) => (
            <div
              key={`${review.user}-${review.date}`}
              className="rounded-lg border border-border p-3 bg-background"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{review.user}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
                <div className="flex items-center gap-0.5 text-yellow-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < Math.floor(review.rating) ? 'fill-current' : 'text-yellow-200'}
                    />
                  ))}
                  {review.rating % 1 !== 0 && <span className="text-xs font-bold">+0.5</span>}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default BookRatings
