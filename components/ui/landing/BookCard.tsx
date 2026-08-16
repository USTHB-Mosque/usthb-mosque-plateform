'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Book, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'

type LandingBookCardProps = {
  book?: Book
  className?: string
  imageClassName?: string
}

const LandingBookCard: React.FC<LandingBookCardProps> = ({ book, className, imageClassName }) => {
  const router = useRouter()

  const media = book?.image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')
  const title = book?.title ?? 'مختصر تفسير ابن كثير'
  const author = book?.author ?? 'محمد بن جرير الطبري'
  const tags = book?.tags?.map((tag) => tag.name) ?? ['تفسير', 'قرآن']
  const isAvailable = !book || (book.availableBooks ? book.availableBooks > 0 : true)

  return (
    <Card className={cn('flex flex-col justify-between', className)}>
      <CardContent className="p-0">
        <div className="relative h-48 lg:h-36">
          {isAvailable && (
            <Badge
              className="absolute top-4 right-4 z-10 px-4 py-2 rounded-lg 
             bg-[#00FF9180] backdrop-blur-md 
             border border-background/20 shadow-lg
             font-bold
             before:content-[''] before:absolute before:inset-0 before:rounded-lg 
             before:bg-linear-to-br before:from-background/20 before:to-transparent"
            >
              متوفر
            </Badge>
          )}
          <Image
            src={imageUrl}
            alt={media?.alt || title}
            fill
            className={cn('object-cover rounded-t-xl', imageClassName)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-2.5 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} className="bg-primary/15 text-primary text-base">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm line-clamp-1">{title}</p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground line-clamp-1">{author}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="text-foreground w-full font-bold"
          onClick={() => {
            router.push(`/library/book/${book?.id ?? 1}`)
          }}
        >
          سجل الآن
        </Button>
      </CardFooter>
    </Card>
  )
}

export default LandingBookCard