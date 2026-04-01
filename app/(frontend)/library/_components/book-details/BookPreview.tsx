'use client'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import Ratings from '@/components/common/Ratings'
import { Button } from '@/components/ui/button'
import { BookmarkPlus, Share } from 'lucide-react'
import { Book, Media } from '@/payload-types'
import { toast } from 'sonner'
import BookFavoriteButton from './BookFavoriteButton'

interface BookPreviewProps {
  image: Book['image']
  averageRating: Book['averageRating']
  ratingCount: Book['ratingCount']
  isAvailable: boolean
  bookId: Book['id']
  initialFavorited: boolean
}

const BookPreview: React.FC<BookPreviewProps> = ({
  image,
  averageRating,
  ratingCount,
  isAvailable,
  bookId,
  initialFavorited,
}) => {
  const media = image as Media

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('تم نسخ الرابط')
  }

  return (
    <Card className="p-4">
      <div>
        <div className="relative">
          {isAvailable ? (
            <Badge
              className="absolute top-4 left-4 px-4 py-1 rounded-lg 
                      bg-[#00FF9180] backdrop-blur-md 
                      border border-background/20 shadow-lg
                      font-bold text-foreground
                      before:content-[''] before:absolute before:inset-0 before:rounded-lg"
            >
              متوفر
            </Badge>
          ) : null}
          <Image
            src={media?.url || ''}
            alt={media?.alt || 'Book'}
            width={400}
            height={500}
            className="w-full h-full object-cover rounded-xl"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="flex items-center justify-center py-6">
          <Ratings averageRating={averageRating || 0} ratingCount={ratingCount || 0} />
        </div>
        <div className="flex flex-col gap-4">
          <Button className="w-full text-xl text-secondary" size="lg">
            سجل الآن
          </Button>
          <div className="flex gap-4">
            <BookFavoriteButton bookId={bookId} initialFavorited={initialFavorited} />
            <Button variant="outline" onClick={onCopyLink}>
              <Share />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookPreview
