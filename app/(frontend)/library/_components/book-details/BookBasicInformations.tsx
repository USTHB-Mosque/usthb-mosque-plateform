import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { User } from 'lucide-react'
import { Book } from '@/payload-types'

interface BookBasicInformationsProps {
  title: Book['title']
  author: Book['author']
  shortDescription?: Book['shortDescription']
  tags: Book['tags']
  favoriteAction?: React.ReactNode
}

const BookBasicInformations: React.FC<BookBasicInformationsProps> = ({
  title,
  author,
  shortDescription,
  tags,
  favoriteAction,
}) => {
  return (
    <Card className="p-6">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-0 space-y-0">
        <div className="flex flex-1 flex-col gap-4 min-w-0">
          <p className="text-foreground text-4xl">{title}</p>
          {tags ? (
            <div className="flex flex-wrap gap-4">
              {tags.map((tag) => (
                <Badge key={tag.id} className="bg-primary/15 text-primary text-base">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {favoriteAction ? <div className="shrink-0 pt-1">{favoriteAction}</div> : null}
      </CardHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <User className="text-primary size-4" />
          <p className="font-bold">{author}</p>
        </div>
        <p>{shortDescription}</p>
      </div>
    </Card>
  )
}

export default BookBasicInformations
