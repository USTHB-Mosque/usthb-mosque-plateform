import React from 'react'
import Layout from '@/components/layouts'
import BookBasicInformations from '../../_components/book-details/BookBasicInformations'
import BookDetailedInformation from '../../_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'
import { ChevronLeft } from 'lucide-react'
import config from '@/payload.config'
import { getPayload } from 'payload'

const BookDetailPage: React.FC = async () => {
  const id = 1

  const payload = await getPayload({ config })

  const book = await payload.findByID({
    collection: 'books',
    id,
  })

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس الكتب</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{book.title}</span>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col gap-6 flex-1">
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

          <div className="flex flex-col gap-6 flex-2">
            <BookBasicInformations
              title={book.title}
              author={book.author}
              shortDescription={book.shortDescription}
              tags={book.tags}
            />
            <BookDetailedInformation longDescription={book.longDescription} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailPage
