export interface SearchStorageAdapter {
  read(): Record<string, string>
  write(values: Record<string, string>): void
  subscribe?(callback: () => void): () => void
}
