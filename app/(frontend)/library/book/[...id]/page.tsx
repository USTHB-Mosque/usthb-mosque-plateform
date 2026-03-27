'use client'

import React from 'react'
import Layout from '@/components/layouts'
import BookBasicInformations from '../../_components/book-details/BookBasicInformations'
import BookDetailedInformation from '../../_components/book-details/book-detailed-informations/BookDetailedInformations'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'
import { ChevronLeft } from 'lucide-react'

const BookDetailPage: React.FC = () => {
  const name = 'الفوائد'
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس الكتب</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{name}</span>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col gap-6 flex-1">
            <BookPreview />
            <BookAvailability />
          </div>

          <div className="flex flex-col gap-6 flex-2">
            <BookBasicInformations />
            <BookDetailedInformation />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailPage
