interface ListingRendererProps {
  isEmpty: boolean
  isError: boolean
  isLoading: boolean
  children: React.ReactNode
  emptyFallback?: React.ReactNode
  errorFallback?: React.ReactNode
  loader?: React.ReactNode
}

const ListingRenderer: React.FC<ListingRendererProps> = ({
  children,
  isEmpty,
  isError,
  isLoading,
  errorFallback = null,
  emptyFallback = null,
  loader,
}) => {
  if (isLoading) {
    return loader
  }
  if (isError) {
    return errorFallback
  }

  if (isEmpty) {
    return emptyFallback
  }

  return children
}

export default ListingRenderer
