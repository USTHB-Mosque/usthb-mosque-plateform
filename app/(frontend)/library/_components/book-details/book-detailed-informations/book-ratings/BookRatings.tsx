import { Card, CardContent } from '@/components/ui/card'
import CreateRating from './CreateRating'
import { getPayload } from 'payload'
import config from '@/payload.config'
import ReviewList from './ReviewList'

const BookRatings = async ({ bookId }: { bookId: number }) => {
  const payload = await getPayload({ config })

  const reviews = await payload.find({
    collection: 'reviews',
    where: {
      book: {
        equals: bookId,
      },
    },
    limit: 40,
    sort: '-createdAt',
    depth: 1,
  })

  return (
    <Card className="p-4 space-y-4 border-none rounded-none">
      <CardContent className="space-y-4">
        <CreateRating bookId={bookId} />
        <ReviewList key={bookId} initialPage={reviews} bookId={bookId} />
      </CardContent>
    </Card>
  )
}

export default BookRatings
