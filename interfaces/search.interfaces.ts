export interface SearchStorageAdapter {
  read: () => Record<string, string>
  write: (value: Record<string, string>) => void
  subscribe: (callback: () => void) => () => void
}

export interface BaseSearchParams {
  limit?: number
  page?: number
  search?: string
}
