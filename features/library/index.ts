// Public surface of the library feature (books, loans, reviews, favorites).
// Other features must import through here, never reach into components/, server/ or api/ directly.

export { default as BookCard } from './components/BookCard'
export { default as BookCardSkeleton } from './components/BookCardSkeleton'
export { default as BooksTable } from './components/BooksTable'
export { default as BooksTableSkeleton } from './components/BooksTableSkeleton'
export { default as ViewSwitch } from './components/ViewSwitch'
export { default as LoanStatusBadge } from './components/LoanStatusBadge'
export { default as LoansTable } from './components/LoansTable'
export { default as BookAvailability } from './components/book-details/BookAvailability'
export { default as BookBasicInformations } from './components/book-details/BookBasicInformations'
export { default as BookPreview } from './components/book-details/BookPreview'
export { default as BookDetailedInformations } from './components/book-details/book-detailed-informations/BookDetailedInformations'

export * from './api/books.queries'
export * from './api/reviews.queries'
export * from './server/borrow-book'
export * from './server/review-book'
export * from './server/favorites'
export * from './types'
export * as libraryFixtures from './fixtures'
