import { useQuery } from '@tanstack/react-query'
import { articlesRequests } from './requests'
import { articlesKeys } from './keys'
import { ArticleSearchParams } from '@/interfaces/articles.interfaces'

export const useGetArticlesQuery = (params?: ArticleSearchParams) => {
  return useQuery({
    queryKey: articlesKeys.all,
    queryFn: () => articlesRequests.getAll(params),
  })
}

export const useGetArticleByIdQuery = (id: string) => {
  return useQuery({
    queryKey: articlesKeys.detail(id),
    queryFn: () => articlesRequests.getById(id),
  })
}
