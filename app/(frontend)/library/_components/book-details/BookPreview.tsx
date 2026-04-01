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
import { getImageUrl } from '@/utils/image-utils'

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
  const imageUrl = getImageUrl(media?.url)

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('تم نسخ الرابط')
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-[3/4] max-w-[280px] mx-auto">
          {isAvailable ? (
            <Badge
              className="absolute top-3 start-3 px-3 py-1 rounded-lg 
                      bg-[#00FF9180] backdrop-blur-md 
                      border border-background/20 shadow-lg
                      font-bold text-foreground text-xs
                      before:content-[''] before:absolute before:inset-0 before:rounded-lg"
            >
              متوفر
            </Badge>
          ) : null}
          <Image
            src={imageUrl}
            alt={media?.alt || 'Book'}
            fill
            className="object-contain rounded-xl"
            sizes="(max-width: 1024px) 100vw, 300px"
          />
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center">
            <Ratings averageRating={averageRating || 0} ratingCount={ratingCount || 0} />
          </div>
          
          <Button className="w-full text-lg text-secondary h-12">
            سجل الآن
          </Button>
          
          <div className="flex gap-3">
            <BookFavoriteButton bookId={bookId} initialFavorited={initialFavorited} className="flex-1 h-12" />
            <Button variant="outline" size="icon" onClick={onCopyLink} className="h-12 w-12">
              <Share className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookPreview