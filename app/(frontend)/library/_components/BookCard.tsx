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
    <Card className={cn(className, 'flex flex-col justify-between')}>
      <CardContent className="p-0">
        <div className="relative">
          {book.availableBooks && book.availableBooks > 0 ? (
            <Badge
              className="absolute top-4 right-4 px-4 py-2 rounded-lg 
             bg-[#00FF9180] backdrop-blur-md 
             border border-background/20 shadow-lg
             font-bold
             before:content-[''] before:absolute before:inset-0 before:rounded-lg 
             before:bg-linear-to-br before:from-background/20 before:to-transparent"
            >
              متوفر
            </Badge>
          ) : null}
          <Image
            src={media.url || ''}
            alt={media.alt || 'Book'}
            width={0}
            height={0}
            className={cn('w-full object-cover h-50 rounded-b-xl', imageClassName)}
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex flex-wrap gap-2.5">
            {book.tags?.map((tag) => (
              <Badge key={tag.id} className="bg-primary/15 text-primary text-base">
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm">{book.title}</p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="text-foreground w-full"
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
