import React from 'react'
import { Badge } from '@/shared/ui/badge'
import { Card } from '@/shared/ui/card'
import { User } from 'lucide-react'
import { Book } from '@/payload-types'
import { bookTypesConfigArray } from '@/utils/constants/books'

interface BookBasicInformationsProps {
  title: Book['title']
  author: Book['author']
  types: Book['type']
  code?: Book['code']
  shortDescription?: Book['shortDescription']
}

const BookBasicInformations: React.FC<BookBasicInformationsProps> = ({
  title,
  author,
  types,
  code,
  shortDescription,
}) => {
  return (
    <Card className="p-4 lg:p-6 ring-0 border border-border">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-base font-bold leading-tight text-foreground sm:text-xl lg:text-2xl xl:text-3xl">
            {title}
          </h1>
          {code ? (
            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
              الرمز:{' '}
              <span dir="ltr" className="text-foreground">
                {code}
              </span>
            </span>
          ) : null}
        </div>

        {types && types.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {types.map((type) => {
              const label = bookTypesConfigArray.find((c) => c.value === type)?.label ?? type
              return (
                <Badge
                  key={type}
                  className="bg-primary/15 text-primary text-xs lg:text-sm px-3 py-1"
                >
                  {label}
                </Badge>
              )
            })}
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
