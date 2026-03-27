import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimilarBooks from './SimilarBooks'
import BookRatings from './BookRatings'
import FullDescription from './FullDescription'
import { Book } from '@/payload-types'

interface BookDetailedInformationsProps {
  longDescription: Book['longDescription']
}

const BookDetailedInformations: React.FC<BookDetailedInformationsProps> = ({ longDescription }) => {
  return (
    <Card>
      <Tabs defaultValue="similar-books">
        <TabsList>
          <TabsTrigger value="similar-books">كتب مشابهة</TabsTrigger>
          <TabsTrigger value="ratings">التقييمات</TabsTrigger>
          <TabsTrigger value="full-description">الوصف الكامل</TabsTrigger>
        </TabsList>
        <TabsContent value="similar-books">{/* <SimilarBooks /> */}</TabsContent>
        <TabsContent value="ratings">
          <BookRatings />
        </TabsContent>
        <TabsContent value="full-description">
          <FullDescription longDescription={longDescription} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

export default BookDetailedInformations
