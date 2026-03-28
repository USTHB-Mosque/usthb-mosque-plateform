import Layout from '@/components/layouts'
import BookBasicInformations from '../../_components/book-details/BookBasicInformations'
import BookDetailedInformation from '../../_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'
import { ChevronLeft } from 'lucide-react'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import ReturnToIndex from '@/components/common/ReturnToIndex'
import { getBookFavoriteState } from '@/actions/profile'
import BookFavoriteButton from '../../_components/book-details/BookFavoriteButton'

const BookDetailsPage = async ({
  params,
}: {
  params: Promise<{
    id: string[]
  }>
}) => {
  const { id } = await params

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'books',
    where: {
      id: { equals: id[0] },
    },
  })
  const book = result.docs[0]
  if (!book) return notFound()

  const { favorited } = await getBookFavoriteState(book.id)

  return (
    <Layout>
      <div className="space-y-6">
        <ReturnToIndex title="فهرس الكتب" value={book.title} href="/library" />

        <div className="flex gap-8">
          <div className="flex flex-col gap-6 flex-3">
            <BookPreview
              image={book.image}
              averageRating={book.averageRating}
              ratingCount={book.ratingCount}
              isAvailable={book.availableBooks && book.availableBooks > 0 ? true : false}
            />
            <BookAvailability
              totalBooks={book.totalBooks}
              availableBooks={book.availableBooks}
              location={book.location}
            />
          </div>

          <div className="flex flex-col gap-6 flex-7">
            <BookBasicInformations
              title={book.title}
              author={book.author}
              shortDescription={book.shortDescription}
              tags={book.tags}
              favoriteAction={<BookFavoriteButton bookId={book.id} initialFavorited={favorited} />}
            />
            <BookDetailedInformation book={book} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailsPage
