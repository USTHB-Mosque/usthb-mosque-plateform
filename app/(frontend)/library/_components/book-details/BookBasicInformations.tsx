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
}

const BookBasicInformations: React.FC<BookBasicInformationsProps> = ({
  title,
  author,
  shortDescription,
  tags,
}) => {
  return (
    <Card className="p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight">
          {title}
        </h1>
        
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge 
                key={tag.id} 
                className="bg-primary/15 text-primary text-xs lg:text-sm px-3 py-1"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm lg:text-base">
          <User className="text-primary size-4 lg:size-5" />
          <span className="font-bold">{author}</span>
        </div>
        
        {shortDescription && (
          <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
            {shortDescription}
          </p>
        )}
      </div>
    </Card>
  )
}

export default BookBasicInformations