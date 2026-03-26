export interface SearchStorageAdapter {
  read: () => Record<string, string>
  write: (value: Record<string, string>) => void
  subscribe: (callback: () => void) => () => void
}
