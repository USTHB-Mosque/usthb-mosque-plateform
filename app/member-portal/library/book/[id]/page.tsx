import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import UserPage from '@/app/member-portal/UserPage'
import ReturnToIndex from '@/components/common/ReturnToIndex'
import BookBasicInformations from '@/app/(frontend)/library/_components/book-details/BookBasicInformations'
import BookDetailedInformation from '@/app/(frontend)/library/_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '@/app/(frontend)/library/_components/book-details/BookPreview'
import BookAvailability from '@/app/(frontend)/library/_components/book-details/BookAvailability'
import { getBookFavoriteState } from '@/actions/profile/favorites'

const MemberBookDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
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
      and: [{ type: { equals: book.type } }, { id: { not_equals: book.id } }],
    },
    limit: 4,
    sort: '-publishDate',
  })

  const { favorited } = await getBookFavoriteState(book.id)

  return (
    <UserPage title="تفاصيل الكتاب">
      <div>
        <ReturnToIndex title="فهرس الكتب" value={book.title} href="/user/library" />

        <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-4 lg:space-y-6 xl:col-span-3">
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

          <div className="space-y-4 lg:col-span-8 lg:space-y-6 xl:col-span-9">
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
    </UserPage>
  )
}

export default MemberBookDetailsPage