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
    <div className="flex justify-center p-6">
      <div className="flex gap-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  )
}

export default SimilarBooks