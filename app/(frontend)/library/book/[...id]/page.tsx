import Layout from '@/components/layouts'
import BookBasicInformations from '../../_components/book-details/BookBasicInformations'
import BookDetailedInformation from '../../_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'
import { ChevronLeft } from 'lucide-react'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس الكتب</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{book.title}</span>
        </div>
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
            />
            <BookDetailedInformation book={book} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailsPage
