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
  { value: 'similar-books' as const, label: 'كتب مشابهة' },
  { value: 'ratings' as const, label: 'التقييمات' },
  { value: 'full-description' as const, label: 'الوصف الكامل' },
]

const BookDetailedInformations: React.FC<BookDetailedInformationsProps> = ({ book, similarBooks }) => {
  const [activeTab, setActiveTab] = useState<TabValue>('similar-books')

  return (
    <div className="flex flex-col rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
      <div className="flex flex-col">
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
                  ${isFirst ? 'rounded-tl-lg' : ''}
                  ${isLast ? 'rounded-tr-lg' : ''}
                `}
                style={{
                  backgroundColor: 'transparent',
                }}
              >
                {tab.label}
                {isActive && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-300" 
                    style={{ backgroundColor: 'var(--primary-300)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="mt-4">
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