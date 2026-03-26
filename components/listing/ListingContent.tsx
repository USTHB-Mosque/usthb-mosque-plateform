import React from 'react'

const ListingContent: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <div className="flex flex-col space-y-12">{children}</div>
}

export default ListingContent
