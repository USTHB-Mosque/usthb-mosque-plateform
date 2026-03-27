'use client'

import React, { useMemo, useState } from 'react'
import Layout from '@/components/layouts'
import BookDetailsBenefits from '../../_components/book-details/BookDetailsBenefits'
import BookDetailedInformation from '../../_components/book-details/BookDetailedInformation'
import BookPreview from '../../_components/book-details/BookPreview'
import BookAvailability from '../../_components/book-details/BookAvailability'

const BookDetailPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex gap-8">
        <div className="flex flex-col gap-6 flex-1">
          <BookPreview />
          <BookAvailability />
        </div>

        <div className="flex flex-col gap-6 flex-2">
          <BookDetailsBenefits />
          <BookDetailedInformation />
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailPage
