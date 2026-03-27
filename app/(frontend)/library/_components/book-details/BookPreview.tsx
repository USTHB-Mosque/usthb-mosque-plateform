import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import Ratings from '@/components/common/Ratings'
import { Button } from '@/components/ui/button'
import { BookmarkPlus, Share } from 'lucide-react'

interface BookPreviewProps {}

const BookPreview: React.FC<BookPreviewProps> = () => {
  return (
    <Card className="p-4">
      <div>
        <div className="relative">
          <Badge
            className="absolute top-4 left-4 px-4 py-1 rounded-lg 
                      bg-[#00FF9180] backdrop-blur-md 
                      border border-background/20 shadow-lg
                      font-bold text-foreground
                      before:content-[''] before:absolute before:inset-0 before:rounded-lg"
          >
            متوفر
          </Badge>
          <Image
            src="/static/images/quran.png"
            alt="Book"
            width={0}
            height={0}
            className="w-full h-98 object-cover rounded-b-xl"
            style={{
              width: '100%',
            }}
          />
        </div>
        <div className="flex items-center justify-center py-6">
          <Ratings averageRating={4.8} ratingCount={127} />
        </div>
        <div className="flex flex-col gap-4">
          <Button className="w-full text-xl text-secondary" size="lg">
            سجل الآن
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 ">
              <span className="font-bold text-secondary">حفظ</span>
              <BookmarkPlus />
            </Button>
            <Button variant="outline">
              <Share />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default BookPreview
