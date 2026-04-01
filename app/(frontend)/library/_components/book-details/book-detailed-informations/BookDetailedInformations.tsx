'use client'

import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimilarBooks from './SimilarBooks'
import BookRatings from './book-ratings/BookRatings'
import FullDescription from './FullDescription'
import { Book } from '@/payload-types'

interface BookDetailedInformationsProps {
  book: Book
}

const BookDetailedInformations: React.FC<BookDetailedInformationsProps> = ({ book }) => {
  return (
    <Card>
      <Tabs defaultValue="similar-books">
        <TabsList>
          <TabsTrigger value="similar-books">كتب مشابهة</TabsTrigger>
          <TabsTrigger value="ratings">التقييمات</TabsTrigger>
          <TabsTrigger value="full-description">الوصف الكامل</TabsTrigger>
        </TabsList>
        <TabsContent value="similar-books">
          <SimilarBooks type={book.type} currentBookId={book.id} />
        </TabsContent>
        <TabsContent value="ratings">
          <BookRatings bookId={book.id} />
        </TabsContent>
        <TabsContent value="full-description">
          <FullDescription
            longDescription={book.longDescription}
            editionNumber={book.editionNumber}
            isbn={book.isbn}
            language={book.language}
            pageCount={book.pageCount}
            publishDate={book.publishDate}
            publisher={book.publisher}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

export default BookDetailedInformations
