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

type BookCardProps = {
  book: Book
  className?: string
  imageClassName?: string
}

const BookCard: React.FC<BookCardProps> = ({ book, className, imageClassName }) => {
  const media = book.image as Media
  const router = useRouter()
  return (
    <Card className={cn(className, 'flex flex-col justify-between h-full')}>
      <CardContent className="p-0 flex flex-col h-full">
        <div className="relative w-full aspect-[4/3] sm:aspect-[4/3]">
          {book.availableBooks && book.availableBooks > 0 ? (
            <Badge
              className="absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-4 py-1 sm:py-2 rounded-lg 
             bg-[#00FF9180] backdrop-blur-md 
             border border-background/20 shadow-lg
             text-xs sm:text-sm font-bold"
            >
              متوفر
            </Badge>
          ) : null}
          <Image
            src={media.url || ''}
            alt={media.alt || 'Book'}
            fill
            className={cn('object-cover rounded-t-xl', imageClassName)}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div
          className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 flex-1"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {book.tags?.map((tag) => (
              <Badge key={tag.id} className="bg-primary/15 text-primary text-xs sm:text-sm">
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs sm:text-sm font-medium line-clamp-1">{book.title}</p>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 sm:p-3">
        <Button
          className="text-foreground w-full text-xs sm:text-sm"
          onClick={() => {
            router.push(`/library/book/${book.id}`)
          }}
        >
          سجل الآن
        </Button>
      </CardFooter>
    </Card>
  )
}

export default BookCard
