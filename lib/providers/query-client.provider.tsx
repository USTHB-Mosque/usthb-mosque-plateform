'use client'

import { QueryClient, QueryClientProvider as BaseQueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

interface QueryClientProviderProps {
  children: React.ReactNode
}

const QueryClientProvider = ({ children }: QueryClientProviderProps) => {
  return (
    <BaseQueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </BaseQueryClientProvider>
  )
}

export default QueryClientProvider
