import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import UserPage from '@/shared/layouts/user/UserPage'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import BookBasicInformations from '@/features/library/components/book-details/BookBasicInformations'
import BookDetailedInformation from '@/features/library/components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '@/features/library/components/book-details/BookPreview'
import BookAvailability from '@/features/library/components/book-details/BookAvailability'
import { getBookFavoriteState } from '@/features/library/server/favorites'
import { getUserBookLoanState } from '@/features/library/server/borrow-book'

const MemberBookDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'books',
    where: {
      id: { equals: id },
    },
  })
  const book = result.docs[0]
  if (!book) return notFound()

  const similarBooksResult = await payload.find({
    collection: 'books',
    where: {
      and: [{ type: { in: book.type } }, { id: { not_equals: book.id } }],
    },
    limit: 4,
    sort: '-publishDate',
  })

  const [{ favorited }, { hasActiveLoan }] = await Promise.all([
    getBookFavoriteState(book.id),
    getUserBookLoanState(book.id),
  ])

  return (
    <UserPage title="تفاصيل الكتاب">
      <div>
        <ReturnToIndex title="فهرس الكتب" value={book.title} href="/user/library" />

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-4 xl:col-span-3">
            <BookPreview
              image={book.image}
              averageRating={book.averageRating}
              ratingCount={book.ratingCount}
              isAvailable={book.availableBooks && book.availableBooks > 0 ? true : false}
              bookId={book.id}
              initialFavorited={favorited}
              bookTitle={book.title}
              hasActiveLoan={hasActiveLoan}
            />
            <BookAvailability
              totalBooks={book.totalBooks}
              availableBooks={book.availableBooks}
              location={book.location}
            />
          </div>

          <div className="flex flex-col gap-5 lg:col-span-8 xl:col-span-9">
            <BookBasicInformations
              title={book.title}
              author={book.author}
              shortDescription={book.shortDescription}
              types={book.type}
              code={book.code}
            />
            <BookDetailedInformation book={book} similarBooks={similarBooksResult.docs} />
          </div>
        </div>
      </div>
    </UserPage>
  )
}

export default MemberBookDetailsPage
