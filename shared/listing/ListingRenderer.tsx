interface ListingRendererProps {
  isEmpty: boolean
  isError: boolean
  isLoading: boolean
  children: React.ReactNode
  emptyFallback?: React.ReactNode
  errorFallback?: React.ReactNode
  loader?: React.ReactNode
  staticFallback?: React.ReactNode
}

const isDevelopment = process.env.NODE_ENV === 'development'

const ListingRenderer: React.FC<ListingRendererProps> = ({
  children,
  isEmpty,
  isError,
  isLoading,
  errorFallback = null,
  emptyFallback = null,
  loader,
  staticFallback,
}) => {
  if (isLoading) {
    return loader
  }
  if (isError) {
    if (isDevelopment && staticFallback) {
      return staticFallback
    }
    return errorFallback
  }

  if (isEmpty) {
    if (isDevelopment && staticFallback) {
      return staticFallback
    }
    return emptyFallback
  }

  return children
}

export default ListingRenderer
