import React from 'react'
import BookCard from '../../BookCard'
import { Book } from '@/payload-types'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface SimilarBooksProps {
  type: Book['type']
  currentBookId: Book['id']
}

const SimilarBooks = async ({ type, currentBookId }: SimilarBooksProps) => {
  const payload = await getPayload({ config })

  const books = await payload.find({
    collection: 'books',
    where: {
      and: [
        {
          type: { equals: type },
        },
        {
          id: { not_equals: currentBookId },
        },
      ],
    },
    limit: 4,
    sort: '-publishDate',
  })

  return (
    <div className="flex gap-6 p-6">
      {books.docs.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}

export default SimilarBooks
