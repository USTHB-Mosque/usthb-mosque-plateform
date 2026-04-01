import Layout from '@/components/layouts'
import BookBasicInformations from '../../_components/book-details/BookBasicInformations'
import BookDetailedInformation from '../../_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import ReturnToIndex from '@/components/common/ReturnToIndex'
import { getBookFavoriteState } from '@/actions/profile'

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

  const similarBooksResult = await payload.find({
    collection: 'books',
    where: {
      and: [
        { type: { equals: book.type } },
        { id: { not_equals: book.id } },
      ],
    },
    limit: 4,
    sort: '-publishDate',
  })

  const { favorited } = await getBookFavoriteState(book.id)

  return (
    <Layout>
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <ReturnToIndex title="فهرس الكتب" value={book.title} href="/library" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mt-4 lg:mt-6">
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:space-y-6">
            <BookPreview
              image={book.image}
              averageRating={book.averageRating}
              ratingCount={book.ratingCount}
              isAvailable={book.availableBooks && book.availableBooks > 0 ? true : false}
              bookId={book.id}
              initialFavorited={favorited}
            />
            <BookAvailability
              totalBooks={book.totalBooks}
              availableBooks={book.availableBooks}
              location={book.location}
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 space-y-4 lg:space-y-6">
            <BookBasicInformations
              title={book.title}
              author={book.author}
              shortDescription={book.shortDescription}
              tags={book.tags}
            />
            <BookDetailedInformation book={book} similarBooks={similarBooksResult.docs} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailsPage