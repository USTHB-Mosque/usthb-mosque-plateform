'use client'

import React from 'react'
import BookCard from '../../BookCard'
import { Book } from '@/payload-types'
import { BookOpen } from 'lucide-react'

interface SimilarBooksProps {
  books: Book[]
}

const SimilarBooks: React.FC<SimilarBooksProps> = ({ books }) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BookOpen className="size-10 mb-3 opacity-40" />
        <p className="text-sm">لا توجد كتب مشابهة حالياً</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 pe-4">
      {books.map((book) => (
        <div key={book.id} className="w-[180px] lg:w-[200px] flex-shrink-0">
          <BookCard book={book} />
        </div>
      ))}
    </div>
  )
}

export default SimilarBooks