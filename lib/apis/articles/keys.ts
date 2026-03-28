import { ArticleSearchParams } from '@/interfaces/articles.interfaces'

export const articlesKeys = {
  all: ['articles'] as const,
  lists: ['articles', 'list'] as const,
  list: (params?: ArticleSearchParams) => ['articles', 'list', params] as const,

  details: () => ['articles', 'detail'] as const,
  detail: (id: string) => ['articles', 'detail', id] as const,
}
