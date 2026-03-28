export const reviewsKeys = {
  all: ['reviews'] as const,
  lists: ['reviews', 'list'] as const,
  list: (bookId: number, page?: number) => ['reviews', 'list', { bookId, page }] as const,

  details: () => ['reviews', 'detail'] as const,
  detail: (id: string) => ['reviews', 'detail', id] as const,
}
