import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimilarBooks from './SimilarBooks'
import BookRatings from './BookRatings'
import FullDescription from './FullDescription'

interface BookDetailedInformationsProps {}

const BookDetailedInformations: React.FC<BookDetailedInformationsProps> = () => {
  return (
    <Card>
      <Tabs defaultValue="similar-books">
        <TabsList>
          <TabsTrigger value="similar-books">كتب مشابهة</TabsTrigger>
          <TabsTrigger value="ratings">التقييمات</TabsTrigger>
          <TabsTrigger value="full-description">الوصف الكامل</TabsTrigger>
        </TabsList>
        <TabsContent value="similar-books">
          <SimilarBooks />
        </TabsContent>
        <TabsContent value="ratings">
          <BookRatings />
        </TabsContent>
        <TabsContent value="full-description">
          <FullDescription />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

export default BookDetailedInformations
