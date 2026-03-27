'use client'
import { QueryClient, QueryClientProvider as BaseQueryClientProvider } from '@tanstack/react-query'

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
  return <BaseQueryClientProvider client={client}>{children}</BaseQueryClientProvider>
}

export default QueryClientProvider
