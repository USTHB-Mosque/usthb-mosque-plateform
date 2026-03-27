import React from 'react'
import BookCard from '../../BookCard'

type Props = {}

const SimilarBooks = (props: Props) => {
  return (
    <div className="flex gap-6 p-6">
      <BookCard className="flex-1" imageClassName="h-50" />
      <BookCard className="flex-1" imageClassName="h-50" />
      <BookCard className="flex-1" imageClassName="h-50" />
    </div>
  )
}

export default SimilarBooks
