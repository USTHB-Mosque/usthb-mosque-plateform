'use client'

import React from 'react'
import BookCard from '../../BookCard'
import { Book } from '@/payload-types'

interface SimilarBooksProps {
  books: Book[]
}

const SimilarBooks: React.FC<SimilarBooksProps> = ({ books }) => {
  if (books.length === 0) return null

  return (
    <div className="flex gap-4 pr-4">
      {books.map((book) => (
        <div key={book.id} className="w-[180px] lg:w-[200px] flex-shrink-0">
          <BookCard book={book} />
        </div>
      ))}
    </div>
  )
}

export default SimilarBooks