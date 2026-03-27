import { useQuery } from '@tanstack/react-query'
import { articlesRequests } from './requests'
import { articlesKeys } from './keys'
import { BaseSearchParams } from '@/interfaces/apis.interfaces'

export const useArticlesQuery = (params?: BaseSearchParams) => {
  return useQuery({
    queryKey: articlesKeys.all,
    queryFn: () => articlesRequests.getAll(params),
  })
}

export const useArticleByIdQuery = (id: string) => {
  return useQuery({
    queryKey: articlesKeys.detail(id),
    queryFn: () => articlesRequests.getById(id),
  })
}
