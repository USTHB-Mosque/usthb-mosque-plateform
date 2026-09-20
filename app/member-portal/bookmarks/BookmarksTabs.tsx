'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { BookOpen, FileText } from 'lucide-react'

type BookmarksTabsProps = {
  booksTab: React.ReactNode
  articlesTab: React.ReactNode
}

const BookmarksTabs: React.FC<BookmarksTabsProps> = ({ booksTab, articlesTab }) => {
  return (
    <Tabs defaultValue="books" dir="rtl" className="w-full flex-col gap-6">
      <div className="flex justify-center">
        <TabsList>
          <TabsTrigger value="books" className="gap-2">
            <BookOpen className="size-4" />
            الكتب
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="size-4" />
            المقالات
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="books">{booksTab}</TabsContent>
      <TabsContent value="articles">{articlesTab}</TabsContent>
    </Tabs>
  )
}

export default BookmarksTabs
