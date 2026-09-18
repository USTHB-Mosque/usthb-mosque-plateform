'use client'

import React, { useState } from 'react'
import SimilarBooks from './SimilarBooks'
import BookRatings from './book-ratings/BookRatings'
import FullDescription from './FullDescription'
import { Book } from '@/payload-types'

interface BookDetailedInformationsProps {
  book: Book
  similarBooks: Book[]
}

type TabValue = 'similar-books' | 'ratings' | 'full-description'

const tabs = [
  { value: 'full-description' as const, label: 'الوصف الكامل' },
  { value: 'similar-books' as const, label: 'كتب مشابهة' },
  { value: 'ratings' as const, label: 'التقييمات' },
]

const BookDetailedInformations: React.FC<BookDetailedInformationsProps> = ({ book, similarBooks }) => {
  const [activeTab, setActiveTab] = useState<TabValue>('full-description')

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card text-sm text-card-foreground">
      <div className="w-full justify-start border-b border-grey-200 flex">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.value
            const isFirst = index === 0
            const isLast = index === tabs.length - 1
            
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  flex-1 px-4 py-4 text-black transition-all relative
                  hover:text-primary-200
                  ${isActive ? 'text-primary-300' : ''}
                  ${isFirst ? 'rounded-ss-lg' : ''}
                  ${isLast ? 'rounded-se-lg' : ''}
                `}
                style={{
                  backgroundColor: 'transparent',
                }}
              >
                {tab.label}
                {isActive && (
                  <span 
                    className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary-300" 
                    style={{ backgroundColor: 'var(--primary-300)' }}
                  />
                )}
              </button>
            )
          })}
      </div>
      
      <div className="overflow-x-auto px-4 pb-4 pt-4">
        {activeTab === 'similar-books' && <SimilarBooks books={similarBooks} />}
        {activeTab === 'ratings' && <BookRatings bookId={book.id} />}
        {activeTab === 'full-description' && (
          <FullDescription
            longDescription={book.longDescription}
            editionNumber={book.editionNumber}
            isbn={book.isbn}
            language={book.language}
            pageCount={book.pageCount}
            publishDate={book.publishDate}
            publisher={book.publisher}
          />
        )}
      </div>
    </div>
  )
}

export default BookDetailedInformations